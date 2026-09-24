# Schedules & Bedtime Specification — Buddy Extension Suite

**Generated:** September 2026  
**Status:** VALIDATED  
**Package:** `@buddy/family-engine`  

---

## 1. Overview

Schedules enable automated, time-based digital boundaries for household members. The schedule engine supports day-of-week recurrence, daytime study windows, and overnight bedtime curfews.

---

## 2. Schedule Data Structures

```ts
interface ScheduleRule {
  readonly id: string;
  readonly name: string;
  readonly days: readonly number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  readonly startMinute: number; // 0 to 1439 (minutes since 00:00)
  readonly endMinute: number; // 0 to 1439 (may be < startMinute for overnight)
  readonly action: 'restrict' | 'allow' | 'focus' | 'bedtime';
  readonly isEnabled: boolean;
}

interface TimeWindow {
  readonly enabled: boolean;
  readonly startMinute: number;
  readonly endMinute: number;
  readonly days?: readonly number[];
}
```

---

## 3. Overnight Midnight Crossing Algorithm

Traditional scheduling algorithms fail when windows span midnight (e.g. `22:00` [1320 min] to `06:00` [360 min]), because `startMinute > endMinute`.

Buddy resolves this mathematically:
```ts
if (startMinute <= endMinute) {
  // Standard Same-Day Window (e.g. 09:00 -> 17:00)
  if (!activeDays.includes(currentDay)) return false;
  return currentMinute >= startMinute && currentMinute < endMinute;
} else {
  // Overnight Window (e.g. 22:00 -> 06:00)
  // Case A: Started today before midnight
  if (activeDays.includes(currentDay) && currentMinute >= startMinute) {
    return true;
  }
  // Case B: Started yesterday and continuing after midnight into today
  const previousDay = (currentDay + 6) % 7;
  if (activeDays.includes(previousDay) && currentMinute < endMinute) {
    return true;
  }
  return false;
}
```

### Verification Example
Suppose Bedtime is configured for **Monday night only (`days: [1]`)**, running from `22:00` (1320) to `06:00` (360):
- **Monday 23:00 (1380 min, day 1):** Matches Case A (`days.includes(1)` and `1380 >= 1320`) → **Active**.
- **Tuesday 03:00 (180 min, day 2):** Matches Case B (`previousDay = 1`, `days.includes(1)` and `180 < 360`) → **Active**.
- **Tuesday 07:00 (420 min, day 2):** `420 >= 360`, not in Case A → **Inactive**.
- **Sunday 23:00 (1380 min, day 0):** `days.includes(0)` is false → **Inactive**.

---

## 4. Bedtime Curfew

- **Default Window:** `22:00` (10:00 PM) to `06:00` (6:00 AM), 7 days a week.
- **Enforcement:** Non-allowlisted browsing is blocked with an encouraging bedtime prompt:  
  *"Bedtime schedule is active. Time to wind down and sleep."*
- **Emergency Exception:** Sites explicitly placed in the parent's `allowedSites` list remain reachable.

---

## 5. Study Mode

- **Enforcement:** Distracting entertainment, video streaming, and social media feeds are restricted during configured study hours (e.g., weekdays 4:00 PM – 6:00 PM).
- **Focus Engine Coupling:** Engages `FocusPolicy` to suppress endless recommendations and autoplay.
