import { useState } from 'preact/hooks';
import { Card, Modal } from '@buddy/ui-components';

export interface SettingsScreenProps {
  onClearToday: () => Promise<void>;
  onClearAllAnalytics: () => Promise<void>;
  onResetPetAndStreaks: () => Promise<void>;
  onResetAllLocalData: () => Promise<void>;
  onExportData: () => Promise<void>;
}

export function SettingsScreen({
  onClearToday,
  onClearAllAnalytics,
  onResetPetAndStreaks,
  onResetAllLocalData,
  onExportData,
}: SettingsScreenProps) {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleAction = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        await action();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showFeedback(`${title} completed successfully.`);
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--buddy-text-main, #0f172a)' }}>
          Settings & Local Data Management
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
          Manage your local database, reset specific metrics, or export summaries
        </p>
      </div>

      {feedbackMsg && (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--buddy-radius-sm, 6px)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#059669',
            fontSize: '12px',
            fontWeight: 600,
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          ✓ {feedbackMsg}
        </div>
      )}

      {/* Export Section */}
      <Card title="Data Export">
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
          Download your local habit summaries, streak records, and platform statistics as a clean JSON file.
        </p>
        <button
          type="button"
          onClick={onExportData}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--buddy-primary, #6366f1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--buddy-radius-sm, 6px)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ⬇️ Export Local Analytics (JSON)
        </button>
      </Card>

      {/* Selective Data Resets */}
      <Card title="Reset & Maintenance">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--buddy-text-main, #0f172a)' }}>
                Clear Today's Data
              </div>
              <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
                Resets active time, media time, and site counters for today only.
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleAction(
                  "Clear Today's Data",
                  "Are you sure you want to clear all active time and site statistics recorded for today?",
                  onClearToday,
                )
              }
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--buddy-bg-card, #ffffff)',
                border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--buddy-text-main, #0f172a)',
              }}
            >
              Clear Today
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--buddy-text-main, #0f172a)' }}>
                Reset Streaks & Pet Mood
              </div>
              <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
                Resets Buddy Pet to baseline (75.0) and clears habit streaks.
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleAction(
                  'Reset Streaks & Pet Mood',
                  'Are you sure you want to reset your habit streaks and return Buddy Pet to baseline?',
                  onResetPetAndStreaks,
                )
              }
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--buddy-bg-card, #ffffff)',
                border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--buddy-text-main, #0f172a)',
              }}
            >
              Reset Pet
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--buddy-text-main, #0f172a)' }}>
                Clear Historical Analytics
              </div>
              <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
                Removes all historical daily and weekly activity summaries.
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleAction(
                  'Clear Historical Analytics',
                  'Are you sure you want to delete all historical analytics records from local storage?',
                  onClearAllAnalytics,
                )
              }
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--buddy-bg-card, #ffffff)',
                border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--buddy-accent-orange, #d97706)',
              }}
            >
              Clear History
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--buddy-border-subtle, #e2e8f0)', margin: '4px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--buddy-accent-red, #dc2626)' }}>
                Full Local Data Reset
              </div>
              <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
                Erases all local Buddy storage, including filter stats and custom rules.
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleAction(
                  'Full Local Data Reset',
                  'This will permanently erase all local Buddy storage on this browser profile. Are you sure?',
                  onResetAllLocalData,
                )
              }
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--buddy-accent-red, #ef4444)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset All
            </button>
          </div>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        confirmText="Confirm Action"
        confirmVariant="danger"
      >
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--buddy-text-main, #334155)', lineHeight: 1.5 }}>
          {confirmModal.message}
        </p>
      </Modal>
    </div>
  );
}
