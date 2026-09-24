import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Buddy Focus: Distraction-Free Media',
    description: 'Cross-site digital wellbeing, Shorts & Reels removal, and watch-time intelligence.',
    version: '0.1.0',
    permissions: [
      'storage',
      'alarms',
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Buddy Focus',
      default_popup: 'entrypoints/popup/index.html',
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
    browser_specific_settings: browser === 'firefox' ? {
      gecko: {
        id: 'focus@buddyextension.local',
        strict_min_version: '109.0',
      },
    } : undefined,
  }),
});
