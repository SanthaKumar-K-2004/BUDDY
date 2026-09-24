import { useState, useEffect } from 'preact/hooks';
import { Card, Button, Badge } from '@buddy/ui-components';
import { StorageClient } from '@buddy/storage';
import {
  getInitialFamilyState,
  validateFamilyState,
  isBedtimeActive,
  isStudyTimeActive,
  createAccessRequest,
  isValidDomainInput,
} from '@buddy/family-engine';
import type { FamilyState } from '@buddy/shared-types';

const storage = new StorageClient();

export function App() {
  const [familyState, setFamilyState] = useState<FamilyState>(getInitialFamilyState());
  const [requestUrl, setRequestUrl] = useState('');
  const [requestMsg, setRequestMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const raw = await storage.getFamilyState();
        setFamilyState(validateFamilyState(raw));
      } catch {
        // fallback
      }
    }
    load();
  }, []);

  const activeProfile = familyState.profiles.find((p) => p.id === familyState.activeProfileId);
  const isParent = activeProfile?.role === 'parent';
  const policy = familyState.activeProfileId ? familyState.policies[familyState.activeProfileId] : undefined;

  const bedtimeActive = isBedtimeActive(Date.now(), policy?.bedtime);
  const studyActive = isStudyTimeActive(Date.now(), policy?.studyTime);

  async function handleQuickRequest() {
    if (!isValidDomainInput(requestUrl) || !familyState.activeProfileId) return;
    const { state } = createAccessRequest(familyState, familyState.activeProfileId, requestUrl, 'Quick request');
    setFamilyState(state);
    await storage.setFamilyState(state);
    setRequestUrl('');
    setRequestMsg('Access request sent!');
    setTimeout(() => setRequestMsg(''), 3000);
  }

  return (
    <div style={{ width: '320px', padding: '16px', boxSizing: 'border-box', fontFamily: 'var(--buddy-font-family, sans-serif)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--buddy-text-main, #0f172a)' }}>
          👨‍👩‍👧 Buddy Family
        </h2>
        <Badge variant={isParent ? 'primary' : 'neutral'}>
          {isParent ? 'Parent' : activeProfile?.displayName || 'Child'}
        </Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Active Schedule Status */}
        <div
          style={{
            padding: '10px',
            borderRadius: '6px',
            backgroundColor: bedtimeActive ? '#e0e7ff' : studyActive ? '#dcfce7' : '#f8fafc',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{bedtimeActive ? '🌙' : studyActive ? '📚' : '🌱'}</span>
          <div>
            <strong>{bedtimeActive ? 'Bedtime Active' : studyActive ? 'Study Mode Active' : 'Normal Browsing'}</strong>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {bedtimeActive ? 'Restricted for rest.' : studyActive ? 'Feeds hidden for focus.' : 'Safe browsing enforced.'}
            </div>
          </div>
        </div>

        {/* Child Request Box if not parent */}
        {!isParent && (
          <Card title="Request Temporary Site Access">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="e.g. docs.google.com"
                  value={requestUrl}
                  onInput={(e) => setRequestUrl((e.target as HTMLInputElement).value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Button variant="primary" onClick={handleQuickRequest}>
                  Ask
                </Button>
              </div>
              {requestMsg && <span style={{ fontSize: '11px', color: '#16a34a' }}>✓ {requestMsg}</span>}
            </div>
          </Card>
        )}

        {/* Content Safety Summary */}
        <Card title="Safety Rules">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SafeSearch</span>
              <Badge variant="success">Enforced</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Explicit Filter</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Blocked Categories</span>
              <span>{policy?.blockedCategories?.length || 0}</span>
            </div>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <Button variant="secondary" onClick={() => window.close()}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
