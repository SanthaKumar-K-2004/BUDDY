# Buddy Shield: Cosmetic Filtering Architecture

## 1. Overview & Objective

While Declarative Net Request blocks ad and tracker network requests, blank advertising placeholders, banners, and empty DOM nodes may remain visible on web pages. The **Cosmetic Filtering Engine** (`@buddy/shield-cosmetic`) provides high-performance, seamless DOM element hiding.

---

## 2. Open-Source Foundation

Buddy Shield integrates `@ghostery/adblocker-content` (MPL-2.0):
- **DOM Feature Extraction**: Extracts classes, IDs, and hrefs from candidate elements (`extractFeaturesFromDOM`).
- **Extended CSS Selectors**: Evaluates complex selectors (such as `:has(...)`) without relying on GPL extended CSS engines.
- **Clean Script Execution**: Self-cleaning script injection utilities (`autoRemoveScript`).

---

## 3. High-Performance Stylesheet Injection

Rather than modifying inline styles on thousands of elements individually (which causes layout reflows), `CosmeticEngine` injects a single consolidated `<style>` element into the document head:

```html
<style id="buddy-shield-cosmetics">
.adsbygoogle,
[id^="google_ads_"],
.ad-banner,
.ad-container,
.advertisement,
iframe[src*="doubleclick.net"],
div[data-ad-unit] {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  max-height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
```

Benefits:
* Zero JavaScript execution time during page rendering.
* The browser's native CSS engine handles hiding before elements are painted.
* Fast, flicker-free presentation.

---

## 4. Single-Page Application (SPA) Navigation

Modern web applications (YouTube, Reddit, X, Spotify Web) dynamically update the URL via `history.pushState` and `popstate` without reloading the page.

To support SPAs without memory leaks:
1. `CosmeticEngine` hooks into `popstate` events.
2. When the URL changes, `handleSPANavigation(newUrl)` re-evaluates cosmetic rules for the new route.
3. The engine instance and DOM observer are reused, eliminating repetitive re-instantiation overhead.

---

## 5. Debounced MutationObserver

For sites with dynamically injected or infinite-scrolling ad slots:
1. `CosmeticEngine.observeMutations()` attaches a `MutationObserver` to `document.body`.
2. Mutations are debounced with a **150ms timer** to prevent CPU thrashing during heavy DOM activity.
3. Hidden element count changes are reported back to the background service worker via `REPORT_BLOCK_EVENT`.

---

## 6. Teardown and Cleanup

When a user pauses protection on a site:
* The injected `<style id="buddy-shield-cosmetics">` tag is removed immediately.
* The `MutationObserver` is disconnected.
* Any active debounce timers are cancelled.
