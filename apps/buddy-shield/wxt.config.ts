import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Buddy Shield: Ad & Tracker Blocker',
    description: 'Privacy-first global ad, tracker, and scriptlet blocker.',
    version: '0.1.0',
    permissions: [
      'storage',
      'declarativeNetRequest',
      'alarms',
    ],
    declarative_net_request: {
      rule_resources: [
        {
          id: 'ruleset_ads',
          enabled: true,
          path: 'rulesets/ruleset_ads.json',
        },
        {
          id: 'ruleset_trackers',
          enabled: true,
          path: 'rulesets/ruleset_trackers.json',
        },
      ],
    },
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Buddy Shield',
      default_popup: 'entrypoints/popup/index.html',
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
    browser_specific_settings: browser === 'firefox' ? {
      gecko: {
        id: 'shield@buddyextension.local',
        strict_min_version: '109.0',
      },
    } : undefined,
  }),
});
