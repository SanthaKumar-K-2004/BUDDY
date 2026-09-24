# Buddy Dashboard Chart Architecture

## 1. Architectural Strategy: Pure Declarative SVG

In compliance with Sections 5, 42–46, 80, and 83 of the Phase 4 specification:
- Rather than importing heavy multi-megabyte canvas charting bundles (such as unoptimized Chart.js wrappers) that require manual canvas destruction, risk memory leaks, and fail screen-reader accessibility, Buddy Dashboard utilizes **high-performance declarative SVG components** (`packages/ui-components/src/TimeChart.tsx`).

### Advantages:
1. **Zero Memory Leaks:** Unmounting a screen removes standard DOM nodes without dangling canvas animation intervals or requestAnimationFrame handles.
2. **Instant Render Speed:** Zero JavaScript charting runtime initialization overhead.
3. **Responsive & Crisp:** Infinite vector scalability at any screen DPI or device pixel ratio.
4. **Complete Offline Operation:** Requires ₹0 CDN or remote font/library dependencies.

---

## 2. Supported Chart Types

1. **Vertical Bar Chart (`type="bar"`):**
   - Used for 7-day weekly media trends and daily categorized time distribution.
   - Includes subtle gridlines, dynamic value scaling, and rounded bar corners.
2. **Horizontal Bar Chart (`type="horizontal-bar"`):**
   - Used for platform comparisons (YouTube vs Spotify vs Instagram).
   - Optimizes horizontal reading of site labels.
3. **Donut / Ring Chart (`type="donut"`):**
   - Used for Focus vs General activity proportions and Shield blocked requests (Ads vs Trackers).
   - Employs SVG `stroke-dasharray` and `stroke-dashoffset` circle math.

---

## 3. Accessibility & Screen Reader Support

Every `TimeChart` automatically includes an offscreen semantic data table with the CSS class `.sr-only`:

```html
<table class="sr-only">
  <caption>Accessible summary of TimeChart data</caption>
  <thead>
    <tr><th scope="col">Category</th><th scope="col">Value</th></tr>
  </thead>
  <tbody>
    <tr><td>YouTube</td><td>45 min</td></tr>
    ...
  </tbody>
</table>
```

Visually impaired users using screen readers (such as NVDA or VoiceOver) receive complete table-based tabular data rather than being blocked by visual-only graphics.

---

## 4. Legitimate Empty States

When a chart receives an empty dataset or an all-zero aggregate (such as on a fresh installation), it renders a clean, honest message:
```text
No activity recorded today yet
```
It **never** invents simulated data points, sample lines, or fake baseline curves.
