# Buddy Pet Engine & Visual Companion Specification

## 1. Overview

The **Buddy Pet Engine** powers the visual companion rendered inside the Buddy Dashboard side panel, popup, and dedicated Pet tab.
The pet provides intuitive, glanceable feedback on habit balance, focus discipline, and rest.

---

## 2. Rendering Technology: Declarative Accessible SVG

Instead of heavy canvas render loops or external WebGL runtimes that drain battery and risk memory leaks, the Buddy Pet is rendered using **pure declarative SVG** in Preact (`packages/ui-components/src/PetCard.tsx`).

### Benefits:
- **Zero GPU/CPU Waste:** SVG DOM nodes are rendered once per state change.
- **Micro-Animations via CSS:** Gentle floating, pulse, and breath keyframe animations controlled entirely by CSS.
- **Accessibility & Screen Readers:** Uses standard ARIA landmarks (`role="region"`, `aria-label="Buddy's status: ..."`) and text descriptions.
- **Prefers-Reduced-Motion:** Automatically disables keyframe animations when OS accessibility settings request reduced motion.

---

## 3. Supported States

| State | Primary Color | Visual Elements |
| :--- | :--- | :--- |
| `focused` | `#6366f1` (Indigo) | Focus bandana, calm centered eyes, confident smile |
| `happy` | `#10b981` (Emerald) | Curved cheerful eyes, open smile, blush cheeks |
| `ecstatic` | `#10b981` (Emerald) | Starry sparkling eyes, wide open celebratory smile |
| `tired` | `#f59e0b` (Amber) | Drooping half-closed eyes, yawn oval mouth |
| `distracted`| `#ec4899` (Pink) | Wandering swirly eyes, wobbly mouth |
| `recovering`| `#06b6d4` (Cyan) | Gentle peaceful resting eyes, sparkling recovery star |
| `sleeping` | `#8b5cf6` (Purple) | Peaceful closed straight eyes, floating Zzz indicators |
| `neutral` | `#3b82f6` (Blue) | Friendly centered eyes, pleasant smile |

---

## 4. Deterministic Invariant

Given the exact same local event history and time context, the Buddy Pet will **always render the identical state, color, and dialogue**.
Under no circumstances is `Math.random()` permitted to choose animations or expressions.

---

## 5. Offline & Failure Modes

1. **Storage Read Failure:** If local storage is temporarily locked or inaccessible, the pet falls back gracefully to `neutral` at baseline score `50.0`.
2. **Offline Operation:** The pet requires zero external network assets or remote fonts; all SVG vector assets are bundled directly into the extension artifact.
