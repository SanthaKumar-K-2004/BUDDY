# Buddy Streak Engine Specification

## 1. Overview

The **Buddy Streak Engine** (`packages/mood-engine/src/streak-engine.ts`) calculates, persists, and reconciles user habit streaks completely within the browser.
Streaks are earned through verified, observable events—never fabricated or incremented simply by opening the extension.

---

## 2. Streak Qualification Rules

A day counts as "Goal Met" if and only if:
1. **Focus Goal:** The user completed at least the target focus minutes (default: `25m`) during that calendar day.
2. **Media Boundary (Optional):** If configured, total media watch time did not exceed `maxMediaMinutes`.
3. **Audit Integrity:** The qualifying session duration must be recorded in `StorageSchema['dailyStats'][dateKey]`.

---

## 3. Midnight Rollover Logic

Day rollover occurs at local midnight or when evaluated via `chrome.alarms` (`buddy-daily-rollover`):

```text
At Day Rollover:
┌─────────────────────────────────┐
│ Did user meet yesterday's goal? │
└───────────────┬─────────────────┘
                │
       YES ─────┴───── NO
        │               │
        ▼               ▼
┌──────────────────┐  ┌────────────────────────────────────┐
│ streakDays += 1  │  │ Are streak freeze tokens available? │
│ best = max(...)  │  └─────────────────┬──────────────────┘
│ +1 freeze earned │                    │
│ every 7 days     │           YES ─────┴───── NO
└──────────────────┘            │               │
                                ▼               ▼
                      ┌──────────────────┐  ┌──────────────────┐
                      │ streakDays stays │  │ streakDays = 0   │
                      │ freezes -= 1     │  │ best stays saved │
                      │ history recorded │  │ history recorded │
                      └──────────────────┘  └──────────────────┘
```

---

## 4. Streak Freezes & Safeguards

- **Starting Freezes:** New users begin with `1` or `2` freeze tokens.
- **Earning Freezes:** Every 7-day milestone completed awards `+1` freeze token.
- **Freeze Cap:** Maximum of `3` freeze tokens can be held simultaneously to prevent hoarding.

---

## 5. Audit & History Reconciliation

If local data becomes partially out of sync (e.g. system clock jump or extension upgrade), `StreakEngine.reconcileFromHistory(history)` deterministically replays the historical date map from earliest to latest to reconstruct the true current and best streak.
