// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CosmeticEngine } from '@buddy/shield-cosmetic';

describe('CosmeticEngine', () => {
  let engine: CosmeticEngine;
  let blockedEvents: Array<{ site: string; count: number }> = [];

  beforeEach(() => {
    blockedEvents = [];
    document.head.innerHTML = '';
    document.body.innerHTML = `
      <div id="content">Main Content</div>
      <div class="adsbygoogle" style="width: 300px; height: 250px;">Ad 1</div>
      <div class="ad-banner">Ad 2</div>
    `;
    engine = new CosmeticEngine((site, count) => {
      blockedEvents.push({ site, count });
    });
  });

  afterEach(() => {
    engine.destroy();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('injects cosmetic CSS style tag into document head', () => {
    engine.initialize('example.com');
    engine.applyRules({
      standardSelectors: ['.adsbygoogle', '.ad-banner'],
    });

    const styleEl = document.getElementById('buddy-shield-cosmetics');
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('.adsbygoogle');
    expect(styleEl?.textContent).toContain('display: none !important');
  });

  it('detects matched ad elements and reports block count', () => {
    engine.initialize('example.com');
    engine.applyRules({
      standardSelectors: ['.adsbygoogle', '.ad-banner'],
    });

    expect(engine.getHiddenCount()).toBe(2);
    expect(blockedEvents.length).toBe(1);
    expect(blockedEvents[0]?.site).toBe('example.com');
    expect(blockedEvents[0]?.count).toBe(2);
  });

  it('handles SPA navigation route changes seamlessly', () => {
    engine.initialize('youtube.com');
    engine.applyRules({ standardSelectors: ['.adsbygoogle'] });

    engine.handleSPANavigation('https://youtube.com/watch?v=12345');
    const styleEl = document.getElementById('buddy-shield-cosmetics');
    expect(styleEl).not.toBeNull();
  });

  it('cleans up and removes injected style tag on cleanup', () => {
    engine.initialize('example.com');
    engine.applyRules({ standardSelectors: ['.adsbygoogle'] });

    expect(document.getElementById('buddy-shield-cosmetics')).not.toBeNull();

    engine.cleanup();
    expect(document.getElementById('buddy-shield-cosmetics')).toBeNull();
  });
});
