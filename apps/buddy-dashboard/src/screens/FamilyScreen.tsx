/**
 * @buddy/buddy-dashboard - FamilyScreen.tsx
 * Full-featured, local-first Family & Parental Controls interface.
 * Implements Parent/Child roles, Web Crypto PIN authentication, Policy editing,
 * Access Requests with temporary approvals, and Family analytics integration.
 */

import { useState, useEffect } from 'preact/hooks';
import {
  Card,
  Button,
  Badge,
  Toggle,
  Modal,
  EmptyState,
  LoadingState,
  StatCard,
} from '@buddy/ui-components';
import { StorageClient, AnalyticsAggregator } from '@buddy/storage';
import {
  getInitialFamilyState,
  validateFamilyState,
  createProfile,
  deleteProfile,
  setActiveProfile,
  updatePolicy,
  createAccessRequest,
  reviewAccessRequest,
  cleanupExpiredRequests,
  verifyPin,
  setPin,
  changePin,
  isValidDomainInput,
  normalizeDomain,
  isBedtimeActive,
  isStudyTimeActive,
} from '@buddy/family-engine';
import type {
  FamilyState,
  PlatformCategory,
  DailySummary,
  LimitRule,
} from '@buddy/shared-types';

const storageClient = new StorageClient();
const aggregator = new AnalyticsAggregator();

export interface FamilyScreenProps {
  today?: DailySummary | null;
}

type FamilyTab = 'overview' | 'profiles' | 'policies' | 'requests' | 'security';

export function FamilyScreen({ today }: FamilyScreenProps = {}) {
  const [loading, setLoading] = useState(true);
  const [familyState, setFamilyState] = useState<FamilyState>(getInitialFamilyState());
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(today || null);

  // Active view tab in Parent mode
  const [activeTab, setActiveTab] = useState<FamilyTab>('overview');

  // Authentication & Mode
  const [isParentUnlocked, setIsParentUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Setup Wizard State
  const [wizardParentName, setWizardParentName] = useState('Parent');
  const [wizardPin, setWizardPin] = useState('');
  const [wizardChildName, setWizardChildName] = useState('Child');

  // Policy Editor State
  const [selectedPolicyProfileId, setSelectedPolicyProfileId] = useState<string>('');
  const [newBlockedDomain, setNewBlockedDomain] = useState('');
  const [newAllowedDomain, setNewAllowedDomain] = useState('');

  // Access Request Form State (Child mode)
  const [requestDomain, setRequestDomain] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestSuccessMsg, setRequestSuccessMsg] = useState('');

  // Profile Management Modal
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileRole, setNewProfileRole] = useState<'parent' | 'child'>('child');

  // Change PIN State
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Load state on mount
  useEffect(() => {
    loadFamilyData();
  }, []);

  async function loadFamilyData() {
    setLoading(true);
    try {
      const raw = await storageClient.getFamilyState();
      let state = validateFamilyState(raw);
      state = cleanupExpiredRequests(state);
      setFamilyState(state);

      if (state.profiles.length > 0 && !selectedPolicyProfileId) {
        const childProf = state.profiles.find((p) => p.role === 'child') || state.profiles[0];
        if (childProf) setSelectedPolicyProfileId(childProf.id);
      }

      // Load today's analytics for family reporting
      const todayStr = new Date().toISOString().split('T')[0] ?? '';
      const summary = today || (await aggregator.getDailySummary(todayStr));
      setTodaySummary(summary);
    } catch {
      setFamilyState(getInitialFamilyState());
    } finally {
      setLoading(false);
    }
  }

  async function saveState(nextState: FamilyState) {
    setFamilyState(nextState);
    await storageClient.setFamilyState(nextState);

    // Sync child policy limits with Phase 3 LimitsEngine to maintain single source of truth
    if (nextState.activeProfileId && nextState.policies[nextState.activeProfileId]) {
      const policy = nextState.policies[nextState.activeProfileId]!;
      const limitRules: LimitRule[] = [];

      for (const [target, maxMins] of Object.entries(policy.dailyLimits)) {
        limitRules.push({
          id: `family_limit_${target}`,
          type: target === 'social' || target === 'video' ? 'category' : 'platform',
          target,
          maxDailyMinutes: maxMins,
          enabled: true,
        });
      }

      try {
        await storageClient.set('limits', limitRules);
      } catch {
        // storage adapter fallback
      }
    }
  }

  // --- Setup Wizard ---
  async function handleCompleteSetup() {
    let state = getInitialFamilyState();

    // 1. Create Parent Profile
    const pRes = createProfile(state, 'parent', wizardParentName.trim() || 'Parent');
    state = pRes.state;

    // 2. Configure PIN if provided
    if (wizardPin.trim().length >= 4) {
      const auth = await setPin(wizardPin.trim(), state.auth);
      state = { ...state, auth };
    }

    // 3. Create Child Profile
    const cRes = createProfile(state, 'child', wizardChildName.trim() || 'Child');
    state = cRes.state;

    // Set child as active default profile
    state = setActiveProfile(state, cRes.profile.id);

    await saveState(state);
    setIsParentUnlocked(false);
  }

  // --- PIN Authentication ---
  async function handleUnlockParent() {
    setPinError('');
    if (!familyState.auth.hasPin) {
      setIsParentUnlocked(true);
      setShowPinModal(false);
      return;
    }

    const res = await verifyPin(pinInput, familyState.auth);
    if (res.success) {
      setIsParentUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      await saveState({ ...familyState, auth: res.updatedAuth });
    } else {
      setPinError(res.error || 'Incorrect PIN.');
      await saveState({ ...familyState, auth: res.updatedAuth });
    }
  }

  function handleLockParent() {
    setIsParentUnlocked(false);
    setActiveTab('overview');
  }

  // --- Profile Operations ---
  async function handleSwitchProfile(profileId: string) {
    const target = familyState.profiles.find((p) => p.id === profileId);
    if (!target) return;

    if (target.role === 'parent' && !isParentUnlocked && familyState.auth.hasPin) {
      // Prompt for PIN to enter parent mode
      setShowPinModal(true);
      return;
    }

    const nextState = setActiveProfile(familyState, profileId);
    await saveState(nextState);
  }

  async function handleAddProfile() {
    if (!newProfileName.trim()) return;
    const { state } = createProfile(familyState, newProfileRole, newProfileName.trim());
    await saveState(state);
    setNewProfileName('');
    setShowAddProfileModal(false);
  }

  async function handleDeleteProfile(profileId: string) {
    if (familyState.profiles.length <= 1) {
      alert('You must have at least one profile.');
      return;
    }
    const nextState = deleteProfile(familyState, profileId);
    await saveState(nextState);
  }

  // --- Policy Operations ---
  const activeProfile = familyState.profiles.find((p) => p.id === familyState.activeProfileId);
  const selectedPolicy = familyState.policies[selectedPolicyProfileId] || familyState.policies[familyState.activeProfileId || ''];

  async function handleAddBlockedSite() {
    if (!isValidDomainInput(newBlockedDomain) || !selectedPolicy) return;
    const domain = normalizeDomain(newBlockedDomain);
    if (selectedPolicy.blockedSites.includes(domain)) return;

    const updatedSites = [...selectedPolicy.blockedSites, domain];
    const nextState = updatePolicy(familyState, selectedPolicy.profileId, { blockedSites: updatedSites });
    await saveState(nextState);
    setNewBlockedDomain('');
  }

  async function handleRemoveBlockedSite(domain: string) {
    if (!selectedPolicy) return;
    const updatedSites = selectedPolicy.blockedSites.filter((d) => d !== domain);
    const nextState = updatePolicy(familyState, selectedPolicy.profileId, { blockedSites: updatedSites });
    await saveState(nextState);
  }

  async function handleAddAllowedSite() {
    if (!isValidDomainInput(newAllowedDomain) || !selectedPolicy) return;
    const domain = normalizeDomain(newAllowedDomain);
    if (selectedPolicy.allowedSites.includes(domain)) return;

    const updatedSites = [...selectedPolicy.allowedSites, domain];
    const nextState = updatePolicy(familyState, selectedPolicy.profileId, { allowedSites: updatedSites });
    await saveState(nextState);
    setNewAllowedDomain('');
  }

  async function handleRemoveAllowedSite(domain: string) {
    if (!selectedPolicy) return;
    const updatedSites = selectedPolicy.allowedSites.filter((d) => d !== domain);
    const nextState = updatePolicy(familyState, selectedPolicy.profileId, { allowedSites: updatedSites });
    await saveState(nextState);
  }

  async function handleToggleCategory(category: PlatformCategory) {
    if (!selectedPolicy) return;
    const exists = selectedPolicy.blockedCategories.includes(category);
    const nextCategories = exists
      ? selectedPolicy.blockedCategories.filter((c) => c !== category)
      : [...selectedPolicy.blockedCategories, category];

    const nextState = updatePolicy(familyState, selectedPolicy.profileId, { blockedCategories: nextCategories });
    await saveState(nextState);
  }

  async function handleUpdateBedtime(enabled: boolean, startMinute: number, endMinute: number) {
    if (!selectedPolicy) return;
    const nextState = updatePolicy(familyState, selectedPolicy.profileId, {
      bedtime: { enabled, startMinute, endMinute },
    });
    await saveState(nextState);
  }

  // --- Access Requests ---
  async function handleSubmitAccessRequest() {
    if (!isValidDomainInput(requestDomain) || !activeProfile) return;
    const { state } = createAccessRequest(
      familyState,
      activeProfile.id,
      requestDomain,
      requestReason.trim() || undefined
    );
    await saveState(state);
    setRequestDomain('');
    setRequestReason('');
    setRequestSuccessMsg('Access request submitted to parent!');
    setTimeout(() => setRequestSuccessMsg(''), 4000);
  }

  async function handleReviewRequest(requestId: string, decision: 'approved' | 'denied', durationMinutes: number = 30) {
    const nextState = reviewAccessRequest(familyState, requestId, decision, durationMinutes);
    await saveState(nextState);
  }

  // --- PIN Management ---
  async function handleChangePin() {
    setPinChangeMsg(null);
    if (newPin.trim().length < 4) {
      setPinChangeMsg({ text: 'New PIN must be at least 4 digits.', error: true });
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeMsg({ text: 'New PIN and confirmation do not match.', error: true });
      return;
    }

    if (familyState.auth.hasPin) {
      const res = await changePin(oldPin, newPin, familyState.auth);
      if (res.success && res.newAuth) {
        await saveState({ ...familyState, auth: res.newAuth });
        setPinChangeMsg({ text: 'PIN successfully changed!', error: false });
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setPinChangeMsg({ text: res.error || 'Failed to change PIN.', error: true });
      }
    } else {
      const nextAuth = await setPin(newPin, familyState.auth);
      await saveState({ ...familyState, auth: nextAuth });
      setPinChangeMsg({ text: 'PIN created successfully!', error: false });
      setNewPin('');
      setConfirmPin('');
    }
  }

  if (loading) {
    return <LoadingState message="Loading Family Settings..." />;
  }

  // 1. Fresh Install Setup Wizard
  if (familyState.profiles.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '440px', margin: '0 auto' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--buddy-text-main, #0f172a)' }}>
            👨‍👩‍👧‍👦 Welcome to Buddy Family
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--buddy-text-muted, #64748b)' }}>
            Local-first parental guidance, habit limits, and schedules. 100% private, zero-cost, and offline.
          </p>
        </div>

        <Card title="Step 1: Set Up Family Household">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--buddy-text-main)' }}>
                Parent Name
              </label>
              <input
                type="text"
                value={wizardParentName}
                onInput={(e) => setWizardParentName((e.target as HTMLInputElement).value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--buddy-radius-sm, 6px)',
                  border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--buddy-text-main)' }}>
                Child Profile Name
              </label>
              <input
                type="text"
                value={wizardChildName}
                onInput={(e) => setWizardChildName((e.target as HTMLInputElement).value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--buddy-radius-sm, 6px)',
                  border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--buddy-text-main)' }}>
                Parent PIN (Optional, 4+ digits)
              </label>
              <input
                type="password"
                maxLength={8}
                placeholder="e.g. 1234"
                value={wizardPin}
                onInput={(e) => setWizardPin((e.target as HTMLInputElement).value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--buddy-radius-sm, 6px)',
                  border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--buddy-text-muted)' }}>
                Stored locally with PBKDF2 encryption. Never leaves your browser.
              </span>
            </div>

            <Button variant="primary" onClick={handleCompleteSetup}>
              Create Family Setup
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isCurrentParent = activeProfile?.role === 'parent';
  const bedtimeNow = isBedtimeActive(Date.now(), selectedPolicy?.bedtime);
  const studyNow = isStudyTimeActive(Date.now(), selectedPolicy?.studyTime);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Profile Header & Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'var(--buddy-bg-card, #ffffff)',
          borderRadius: 'var(--buddy-radius-md, 8px)',
          border: '1px solid var(--buddy-border-subtle, #e2e8f0)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>
            {isCurrentParent ? '🛡️' : '🧒'}
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--buddy-text-main)' }}>
                {activeProfile?.displayName || 'Family'}
              </span>
              <Badge variant={isCurrentParent ? 'primary' : 'neutral'}>
                {isCurrentParent ? 'Parent Mode' : 'Child Mode'}
              </Badge>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--buddy-text-muted)' }}>
              {isCurrentParent ? 'Manage household policies & limits' : 'Gentle guidance & focus'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isCurrentParent ? (
            <Button variant="ghost" onClick={handleLockParent}>
              🔒 Lock
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                if (familyState.auth.hasPin) {
                  setShowPinModal(true);
                } else {
                  setIsParentUnlocked(true);
                  const parentProf = familyState.profiles.find((p) => p.role === 'parent');
                  if (parentProf) handleSwitchProfile(parentProf.id);
                }
              }}
            >
              🔑 Parent Login
            </Button>
          )}

          <select
            value={familyState.activeProfileId || ''}
            onChange={(e) => handleSwitchProfile((e.target as HTMLSelectElement).value)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--buddy-radius-sm, 6px)',
              border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
              fontSize: '12px',
              color: 'var(--buddy-text-main)',
              backgroundColor: 'var(--buddy-bg-surface, #f8fafc)',
            }}
          >
            {familyState.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} ({p.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode View: Child View vs Parent Management */}
      {!isCurrentParent && !isParentUnlocked ? (
        // ================= CHILD MODE VIEW =================
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Schedule Status Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--buddy-radius-md, 8px)',
              backgroundColor: bedtimeNow
                ? 'var(--buddy-primary-light, #e0e7ff)'
                : studyNow
                ? 'var(--buddy-success-light, #dcfce7)'
                : 'var(--buddy-bg-card, #ffffff)',
              border: '1px solid var(--buddy-border-subtle, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '24px' }}>
              {bedtimeNow ? '🌙' : studyNow ? '📚' : '🌱'}
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--buddy-text-main)' }}>
                {bedtimeNow
                  ? 'Bedtime Schedule Active'
                  : studyNow
                  ? 'Study Time Active'
                  : 'Free Browsing Window'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--buddy-text-muted)' }}>
                {bedtimeNow
                  ? 'Entertainment sites are resting for the night. Get some healthy sleep!'
                  : studyNow
                  ? 'Distracting feeds are tucked away so you can focus.'
                  : 'Remember to take healthy breaks every 25 minutes!'}
              </div>
            </div>
          </div>

          {/* Today's Usage Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            <StatCard
              title="Active Time"
              value={todaySummary ? `${Math.round(todaySummary.totalActiveMs / 60000)}m` : '0m'}
              subtext="Today"
            />
            <StatCard
              title="Media Time"
              value={todaySummary ? `${Math.round(todaySummary.mediaMs / 60000)}m` : '0m'}
              subtext="Video & Audio"
            />
            <StatCard
              title="Protected Sites"
              value={todaySummary?.adsBlocked || 0}
              subtext="Ads & Trackers"
            />
          </div>

          {/* Request Access to a Site */}
          <Card title="Need Access for School or Project?">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted)' }}>
                If a site you need is restricted, send a polite request to your parents for temporary approval.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. khanacademy.org"
                  value={requestDomain}
                  onInput={(e) => setRequestDomain((e.target as HTMLInputElement).value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 'var(--buddy-radius-sm, 6px)',
                    border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
                    fontSize: '12px',
                  }}
                />
                <Button variant="primary" onClick={handleSubmitAccessRequest}>
                  Request Access
                </Button>
              </div>
              <input
                type="text"
                placeholder="Reason (e.g. Science homework)"
                value={requestReason}
                onInput={(e) => setRequestReason((e.target as HTMLInputElement).value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 'var(--buddy-radius-sm, 6px)',
                  border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
              {requestSuccessMsg && (
                <span style={{ fontSize: '12px', color: 'var(--buddy-success, #22c55e)' }}>
                  ✓ {requestSuccessMsg}
                </span>
              )}
            </div>
          </Card>

          {/* Previous Requests Status */}
          {familyState.requests.length > 0 && (
            <Card title="Recent Access Requests">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {familyState.requests.slice(-4).reverse().map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      backgroundColor: 'var(--buddy-bg-surface, #f8fafc)',
                      borderRadius: 'var(--buddy-radius-sm, 6px)',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{req.domain}</span>
                      {req.reason && <span style={{ color: 'var(--buddy-text-muted)' }}> — {req.reason}</span>}
                    </div>
                    <Badge
                      variant={
                        req.status === 'approved'
                          ? 'success'
                          : req.status === 'denied'
                          ? 'danger'
                          : 'neutral'
                      }
                    >
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        // ================= PARENT MANAGEMENT MODE =================
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Sub-Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              borderBottom: '1px solid var(--buddy-border-subtle, #e2e8f0)',
              paddingBottom: '8px',
              overflowX: 'auto',
            }}
          >
            {(['overview', 'policies', 'requests', 'profiles', 'security'] as FamilyTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--buddy-radius-sm, 6px)',
                  border: 'none',
                  backgroundColor: activeTab === tab ? 'var(--buddy-primary, #6366f1)' : 'transparent',
                  color: activeTab === tab ? '#ffffff' : 'var(--buddy-text-muted, #64748b)',
                  fontSize: '12px',
                  fontWeight: activeTab === tab ? 600 : 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {tab === 'requests' && familyState.requests.filter((r) => r.status === 'pending').length > 0 && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      display: 'inline-block',
                    }}
                  />
                )}
                {tab}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW & REPORTS */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <StatCard
                  title="Household Time"
                  value={todaySummary ? `${Math.round(todaySummary.totalActiveMs / 60000)}m` : '0m'}
                  subtext="Today's total usage"
                />
                <StatCard
                  title="Media Consumption"
                  value={todaySummary ? `${Math.round(todaySummary.mediaMs / 60000)}m` : '0m'}
                  subtext="Video & Audio playback"
                />
                <StatCard
                  title="Blocked Ads"
                  value={todaySummary?.adsBlocked || 0}
                  subtext="Shield filtered"
                />
                <StatCard
                  title="Pending Requests"
                  value={familyState.requests.filter((r) => r.status === 'pending').length}
                  subtext="Awaiting review"
                />
              </div>

              <Card title="Household Overview & Compliance">
                <div style={{ fontSize: '13px', color: 'var(--buddy-text-muted)', lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    All metrics originate from authentic local browsing sessions. Zero browsing history, full URLs,
                    or private search queries are logged or transmitted.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <Badge variant={bedtimeNow ? 'primary' : 'neutral'}>
                      Bedtime: {selectedPolicy?.bedtime?.enabled ? 'Configured' : 'Disabled'}
                    </Badge>
                    <Badge variant={selectedPolicy?.studyTime?.enabled ? 'success' : 'neutral'}>
                      Study Time: {selectedPolicy?.studyTime?.enabled ? 'Active' : 'Off'}
                    </Badge>
                    <Badge variant="primary">
                      Blocked Sites: {selectedPolicy?.blockedSites.length || 0}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: POLICIES */}
          {activeTab === 'policies' && selectedPolicy && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Profile selector for policy editing */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--buddy-text-main)' }}>
                  Editing Policy For:
                </label>
                <select
                  value={selectedPolicyProfileId}
                  onChange={(e) => setSelectedPolicyProfileId((e.target as HTMLSelectElement).value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--buddy-radius-sm, 6px)',
                    border: '1px solid var(--buddy-border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  {familyState.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Blocked Sites */}
              <Card title="Restricted Websites (Blocklist)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. tiktok.com"
                      value={newBlockedDomain}
                      onInput={(e) => setNewBlockedDomain((e.target as HTMLInputElement).value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 'var(--buddy-radius-sm, 6px)',
                        border: '1px solid var(--buddy-border-subtle)',
                        fontSize: '12px',
                      }}
                    />
                    <Button variant="danger" onClick={handleAddBlockedSite}>
                      Block Site
                    </Button>
                  </div>

                  {selectedPolicy.blockedSites.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--buddy-text-muted)' }}>
                      No individual sites restricted.
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedPolicy.blockedSites.map((site) => (
                        <div
                          key={site}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            backgroundColor: 'var(--buddy-danger-light, #fee2e2)',
                            color: 'var(--buddy-danger, #ef4444)',
                            borderRadius: 'var(--buddy-radius-sm, 6px)',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          <span>{site}</span>
                          <button
                            onClick={() => handleRemoveBlockedSite(site)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--buddy-danger, #ef4444)',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: 'bold',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Allowed Sites */}
              <Card title="Always-Allowed Websites (Allowlist)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. khanacademy.org"
                      value={newAllowedDomain}
                      onInput={(e) => setNewAllowedDomain((e.target as HTMLInputElement).value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 'var(--buddy-radius-sm, 6px)',
                        border: '1px solid var(--buddy-border-subtle)',
                        fontSize: '12px',
                      }}
                    />
                    <Button variant="primary" onClick={handleAddAllowedSite}>
                      Allow Site
                    </Button>
                  </div>

                  {selectedPolicy.allowedSites.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--buddy-text-muted)' }}>
                      No specific allowlist overrides.
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedPolicy.allowedSites.map((site) => (
                        <div
                          key={site}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            backgroundColor: 'var(--buddy-success-light, #dcfce7)',
                            color: 'var(--buddy-success, #22c55e)',
                            borderRadius: 'var(--buddy-radius-sm, 6px)',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          <span>{site}</span>
                          <button
                            onClick={() => handleRemoveAllowedSite(site)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--buddy-success, #22c55e)',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: 'bold',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Category Filtering */}
              <Card title="Restricted Content Categories">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  {(['adult', 'gaming', 'social', 'shopping', 'entertainment'] as PlatformCategory[]).map((cat) => (
                    <div
                      key={cat}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        backgroundColor: 'var(--buddy-bg-surface, #f8fafc)',
                        borderRadius: 'var(--buddy-radius-sm, 6px)',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' }}>
                        {cat}
                      </span>
                      <Toggle
                        checked={selectedPolicy.blockedCategories.includes(cat)}
                        onChange={() => handleToggleCategory(cat)}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Bedtime & Study Mode */}
              <Card title="Bedtime & Night Restrictions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>Enforce Bedtime Window</span>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--buddy-text-muted)' }}>
                        Blocks non-educational browsing between 10:00 PM and 6:00 AM
                      </p>
                    </div>
                    <Toggle
                      checked={Boolean(selectedPolicy.bedtime?.enabled)}
                      onChange={(checked) =>
                        handleUpdateBedtime(
                          checked,
                          selectedPolicy.bedtime?.startMinute ?? 22 * 60,
                          selectedPolicy.bedtime?.endMinute ?? 6 * 60
                        )
                      }
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: ACCESS REQUESTS */}
          {activeTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--buddy-text-main)' }}>
                Pending Approval ({familyState.requests.filter((r) => r.status === 'pending').length})
              </h4>

              {familyState.requests.filter((r) => r.status === 'pending').length === 0 ? (
                <EmptyState
                  title="No Pending Access Requests"
                  message="When children request temporary access to restricted sites, they will appear here."
                />
              ) : (
                familyState.requests
                  .filter((r) => r.status === 'pending')
                  .map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--buddy-bg-card, #ffffff)',
                        borderRadius: 'var(--buddy-radius-md, 8px)',
                        border: '1px solid var(--buddy-border-subtle, #e2e8f0)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--buddy-text-main)' }}>
                          {req.domain}
                        </span>
                        <Badge variant="neutral">
                          {familyState.profiles.find((p) => p.id === req.profileId)?.displayName || 'Child'}
                        </Badge>
                      </div>

                      {req.reason && (
                        <div style={{ fontSize: '12px', color: 'var(--buddy-text-muted)', fontStyle: 'italic' }}>
                          "{req.reason}"
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <Button variant="primary" onClick={() => handleReviewRequest(req.id, 'approved', 15)}>
                          +15m
                        </Button>
                        <Button variant="primary" onClick={() => handleReviewRequest(req.id, 'approved', 30)}>
                          +30m
                        </Button>
                        <Button variant="primary" onClick={() => handleReviewRequest(req.id, 'approved', 60)}>
                          +1h
                        </Button>
                        <Button variant="danger" onClick={() => handleReviewRequest(req.id, 'denied')}>
                          Deny
                        </Button>
                      </div>
                    </div>
                  ))
              )}

              {/* Active Temporary Approvals */}
              {familyState.requests.some((r) => r.status === 'approved' && r.expiresAt && r.expiresAt > Date.now()) && (
                <Card title="Active Temporary Exceptions">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {familyState.requests
                      .filter((r) => r.status === 'approved' && r.expiresAt && r.expiresAt > Date.now())
                      .map((req) => {
                        const remMin = Math.max(1, Math.ceil((req.expiresAt! - Date.now()) / 60000));
                        return (
                          <div
                            key={req.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 8px',
                              backgroundColor: 'var(--buddy-bg-surface, #f8fafc)',
                              borderRadius: 'var(--buddy-radius-sm, 6px)',
                              fontSize: '12px',
                            }}
                          >
                            <span>{req.domain}</span>
                            <Badge variant="success">{remMin}m remaining</Badge>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 4: PROFILES */}
          {activeTab === 'profiles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--buddy-text-main)' }}>Household Profiles</h4>
                <Button variant="primary" onClick={() => setShowAddProfileModal(true)}>
                  + Add Member
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {familyState.profiles.map((prof) => (
                  <div
                    key={prof.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      backgroundColor: 'var(--buddy-bg-card, #ffffff)',
                      borderRadius: 'var(--buddy-radius-md, 8px)',
                      border: '1px solid var(--buddy-border-subtle, #e2e8f0)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{prof.role === 'parent' ? '🛡️' : '🧒'}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{prof.displayName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted)' }}>
                          Role: {prof.role} {familyState.activeProfileId === prof.id ? '• (Current Active)' : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button
                        variant="secondary"
                        onClick={() => handleSwitchProfile(prof.id)}
                        disabled={familyState.activeProfileId === prof.id}
                      >
                        Select
                      </Button>
                      <Button variant="danger" onClick={() => handleDeleteProfile(prof.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Card title="Parent PIN Security (Web Crypto PBKDF2)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '320px' }}>
                  {familyState.auth.hasPin && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Current PIN
                      </label>
                      <input
                        type="password"
                        maxLength={8}
                        value={oldPin}
                        onInput={(e) => setOldPin((e.target as HTMLInputElement).value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: 'var(--buddy-radius-sm, 6px)',
                          border: '1px solid var(--buddy-border-subtle)',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      {familyState.auth.hasPin ? 'New PIN' : 'Create PIN (4+ digits)'}
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={newPin}
                      onInput={(e) => setNewPin((e.target as HTMLInputElement).value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 'var(--buddy-radius-sm, 6px)',
                        border: '1px solid var(--buddy-border-subtle)',
                        fontSize: '12px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Confirm PIN
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={confirmPin}
                      onInput={(e) => setConfirmPin((e.target as HTMLInputElement).value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 'var(--buddy-radius-sm, 6px)',
                        border: '1px solid var(--buddy-border-subtle)',
                        fontSize: '12px',
                      }}
                    />
                  </div>

                  {pinChangeMsg && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: pinChangeMsg.error ? 'var(--buddy-danger)' : 'var(--buddy-success)',
                      }}
                    >
                      {pinChangeMsg.text}
                    </span>
                  )}

                  <Button variant="primary" onClick={handleChangePin}>
                    {familyState.auth.hasPin ? 'Update PIN' : 'Set PIN'}
                  </Button>
                </div>
              </Card>

              <Card title="Reset Family Configuration">
                <div style={{ fontSize: '12px', color: 'var(--buddy-text-muted)' }}>
                  <p style={{ margin: '0 0 10px 0' }}>
                    Resetting will clear all profiles, custom site policies, and the Parent PIN. Shield ad-blocking
                    and general watch-time statistics will remain intact.
                  </p>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (confirm('Are you sure you want to reset all Family settings?')) {
                        const reset = getInitialFamilyState();
                        await saveState(reset);
                        setIsParentUnlocked(false);
                      }
                    }}
                  >
                    Reset Family Settings
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* PIN Unlock Modal */}
      <Modal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setPinInput('');
          setPinError('');
        }}
        title="Enter Parent PIN"
        confirmText="Unlock"
        onConfirm={handleUnlockParent}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted)' }}>
            Enter your local parent PIN to manage household profiles and restrictions.
          </p>
          <input
            type="password"
            autoFocus
            maxLength={8}
            value={pinInput}
            onInput={(e) => setPinInput((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUnlockParent();
            }}
            placeholder="PIN"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--buddy-radius-sm, 6px)',
              border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
              fontSize: '16px',
              textAlign: 'center',
              letterSpacing: '4px',
              boxSizing: 'border-box',
            }}
          />
          {pinError && (
            <span style={{ fontSize: '12px', color: 'var(--buddy-danger, #ef4444)' }}>
              {pinError}
            </span>
          )}
        </div>
      </Modal>

      {/* Add Profile Modal */}
      <Modal
        isOpen={showAddProfileModal}
        onClose={() => setShowAddProfileModal(false)}
        title="Add Household Member"
        confirmText="Add Profile"
        onConfirm={handleAddProfile}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Member Name
            </label>
            <input
              type="text"
              placeholder="e.g. Maya"
              value={newProfileName}
              onInput={(e) => setNewProfileName((e.target as HTMLInputElement).value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 'var(--buddy-radius-sm, 6px)',
                border: '1px solid var(--buddy-border-subtle)',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Role
            </label>
            <select
              value={newProfileRole}
              onChange={(e) => setNewProfileRole((e.target as HTMLSelectElement).value as any)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 'var(--buddy-radius-sm, 6px)',
                border: '1px solid var(--buddy-border-subtle)',
                fontSize: '12px',
              }}
            >
              <option value="child">Child (Restricted & Guided)</option>
              <option value="parent">Parent (Unrestricted Admin)</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
