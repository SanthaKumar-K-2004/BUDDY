/**
 * @buddy/i18n - locales/en.ts
 */

export const en = {
  app_name: 'Buddy',
  shield_title: 'Buddy Shield',
  focus_title: 'Buddy Focus',
  family_title: 'Buddy Family',
  dashboard_title: 'Buddy Dashboard',
  ads_blocked: 'Ads Blocked',
  trackers_blocked: 'Trackers Blocked',
  focus_time: 'Focus Time',
  media_watch_time: 'Media Watch Time',
  mood_status: 'Mood',
  pet_greeting: 'Hello, friend!',
  pet_worried: 'You have been scrolling for a while...',
  pet_sleeping: 'Buddy is sleeping. Shhh!',
  gentle_warning: 'Gentle Reminder: Daily watch limit almost reached.',
  strong_warning: 'Warning: 5 minutes remaining in this session.',
  limit_reached: 'Daily watch limit reached for this site.',
  save: 'Save',
  cancel: 'Cancel',
  enable: 'Enable',
  disable: 'Disable',
} as const;

export type TranslationKey = keyof typeof en;
