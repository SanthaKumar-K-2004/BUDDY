import { useState } from 'preact/hooks';
import { Card, Toggle, Button } from '@buddy/ui-components';

export function App() {
  const [hideShorts, setHideShorts] = useState(true);
  const [hideFeed, setHideFeed] = useState(false);
  const [disableAutoplay, setDisableAutoplay] = useState(true);

  return (
    <div style={{ width: '300px', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--buddy-text-main)' }}>🎯 Buddy Focus</h2>
      </div>
      <Card title="Focus Policies">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Toggle checked={hideShorts} onChange={setHideShorts} label="Hide Shorts & Reels" />
          <Toggle checked={hideFeed} onChange={setHideFeed} label="Hide Home Feeds" />
          <Toggle checked={disableAutoplay} onChange={setDisableAutoplay} label="Disable Autoplay" />
        </div>
      </Card>
      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <Button variant="secondary" onClick={() => window.close()}>Done</Button>
      </div>
    </div>
  );
}
