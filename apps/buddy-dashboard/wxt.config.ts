import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Buddy Dashboard: Virtual Companion & Habits',
    description: 'Productivity companion pet, watch-time intelligence, and wellbeing analytics.',
    version: '0.1.0',
    permissions: browser === 'firefox'
      ? ['storage', 'alarms']
      : ['storage', 'alarms', 'sidePanel'],
    action: {
      default_title: 'Buddy Dashboard',
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
      default_title: 'Buddy Dashboard',
    } : undefined,
    browser_specific_settings: browser === 'firefox' ? {
      gecko: {
        id: 'dashboard@buddyextension.local',
        strict_min_version: '109.0',
      },
    } : undefined,
  }),
});
