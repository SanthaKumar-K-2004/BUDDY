import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'BUDDY: All-in-One Digital Wellness & Shield',
    description: 'Privacy-first all-in-one digital wellness: ad & tracker shield, focus timer, pet companion, parental controls & on-device intelligence.',
    version: '1.0.0',
    permissions: browser === 'firefox'
      ? ['storage', 'alarms', 'tabs', 'declarativeNetRequest']
      : ['storage', 'alarms', 'tabs', 'declarativeNetRequest', 'declarativeNetRequestWithHostAccess', 'sidePanel'],
    host_permissions: ['<all_urls>'],
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
    action: {
      default_title: 'BUDDY',
      default_popup: 'entrypoints/popup/index.html',
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
    side_panel: browser !== 'firefox' ? {
      default_path: 'entrypoints/sidepanel/index.html',
    } : undefined,
    sidebar_action: browser === 'firefox' ? {
      default_panel: 'entrypoints/sidepanel/index.html',
      default_title: 'BUDDY',
    } : undefined,
    browser_specific_settings: browser === 'firefox' ? {
      gecko: {
        id: 'buddy@buddyextension.local',
        strict_min_version: '109.0',
      },
    } : undefined,
  }),
});
