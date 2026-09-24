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
        {
          id: 'ruleset_adult',
          enabled: true,
          path: 'rulesets/ruleset_adult.json',
        },
      ],
    },
    icons: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    action: {
      default_title: 'BUDDY: All-in-One Digital Wellness & Shield',
      default_popup: 'entrypoints/popup/index.html',
      default_icon: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png',
      },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
    web_accessible_resources: [
      {
        resources: ['icons/*'],
        matches: ['<all_urls>'],
      },
    ],
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
