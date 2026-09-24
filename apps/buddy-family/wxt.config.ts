import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Buddy Family: On-Device Content Safety',
    description: 'Local on-device adult content filtering, safe search enforcement, and parental controls.',
    version: '0.1.0',
    permissions: browser === 'firefox'
      ? ['storage', 'alarms']
      : ['storage', 'alarms', 'offscreen'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Buddy Family',
      default_popup: 'entrypoints/popup/index.html',
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
    browser_specific_settings: browser === 'firefox' ? {
      gecko: {
        id: 'family@buddyextension.local',
        strict_min_version: '109.0',
      },
    } : undefined,
  }),
});
