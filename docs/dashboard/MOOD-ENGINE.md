# Buddy Mood Engine Specification

## 1. Executive Summary

The **Buddy Mood Engine** (`@buddy/mood-engine`) provides deterministic emotional harmony calculation for the Buddy virtual pet companion.
It maps observable browser events and habit milestones into a numerical score (0.0 to 100.0) without randomness, arbitrary fluctuations, or manipulative mechanics.

---

## 2. Event Types & Mathematical Weights

| Event Type | Source Subsystem | Delta (Points) | Product Rationale |
| :--- | :--- | :--- | :--- |
| `FOCUS_COMPLETED` | `buddy-focus` | **+5.0** | Reward for completing an intentional 25m+ focus block |
| `GOAL_COMPLETED` | `buddy-dashboard` | **+10.0** | Major milestone: Daily focus goal achieved |
| `HEALTHY_BREAK` | `buddy-focus` / `watch-time` | **+3.0** | Taking a 10m+ break after sustained active usage |
| `DOOMSCROLL_EVENT` | `buddy-focus` | **-8.0** | Rapid velocity scroll intervention triggered |
| `LIMIT_OVERTIME` | `focus-engine` | **-10.0** | Browsing beyond daily platform or category limits |
| `STREAK_BROKEN` | `buddy-dashboard` | **-15.0** | Missing daily goal with zero streak freezes available |
| `HEARTBEAT` | Background Alarm | **0.0** | Periodic state synchronization |

---

## 3. Anti-Gaming Protections

To prevent users from gaming the pet's mood via repeated rapid triggers, the engine enforces three mathematical layers:

1. **Daily Positive Recovery Cap (`MAX_DAILY_RECOVERY = 20.0`):**
   A user can accumulate at most **+20.0 points** per calendar day. Subsequent positive stimuli on the same day yield a delta of 0.0.
   Negative penalties are never capped, ensuring accountability.
2. **Deduplication Window (`DEDUP_WINDOW_MS = 60,000`):**
   Identical stimuli descriptions from the same source within 60 seconds are dropped.
3. **Deterministic Monotonic IDs:**
   Every event stimulus receives an ID in the format `stim-${timestamp}-${counter}`. Zero `Math.random()`.

---

## 4. Score Bounds & Quiet Hours Decay

- **Score Range:** Clamped strictly within `[0.0, 100.0]`.
- **Baseline Default:** `50.0` (Neutral).
- **Daytime Hourly Decay:** `-1.0` point per hour between 8:00 AM and 10:00 PM.
- **Nighttime Quiet Hours (`22:00` to `07:00`):**
  Decay is **100% frozen**. The pet transitions into the `sleeping` visual state.

---

## 5. Visual State Transition Matrix

| Visual State | Qualification Criteria | Pet Avatar Appearance |
| :--- | :--- | :--- |
| `sleeping` | Active during quiet hours (`22:00` - `07:00`) | Closed crescent eyes, Zzz bubbles, lavender halo |
| `focused` | Recent focus session completed within 30 min | Indigo headband, steady determined eyes |
| `distracted` | Doomscroll intervention triggered within 15 min | Pink wandering swirly eyes, wobbly expression |
| `recovering` | Healthy break logged after prolonged usage | Soothing cyan sparkle, gentle rested eyes |
| `ecstatic` | Mood score > 80.0 | Sparkly eyes, wide open joyful smile |
| `happy` | Mood score 61.0 – 80.0 | Curved eyes `^ ^`, cheerful smile |
| `neutral` | Mood score 41.0 – 60.0 | Calm, steady smile |
| `worried` | Mood score 21.0 – 40.0 | Concerned eyebrows, subtle wave mouth |
| `sad` | Mood score 0.0 – 20.0 | Gentle drooping eyes, soft expression |

---

## 6. Non-Shaming Mindfulness Dialogue

In compliance with product guidelines, Buddy **never shames the user** regardless of how low the mood score drops.
- Forbidden: *"You failed"*, *"You are wasting your life"*, *"You are addicted"*.
- Provided:
  - *Recovering:* "Taking a refreshing break is a strength. Buddy is recovering nicely with you."
  - *Tired:* "You've been online for a while. Buddy suggests standing up, taking a break, and resting your eyes."
  - *Low Score:* "Buddy is here by your side, ready to reset together whenever you want."
