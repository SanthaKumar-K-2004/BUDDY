import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('[Buddy Family] Content safety scanner active on:', window.location.hostname);
  },
});
