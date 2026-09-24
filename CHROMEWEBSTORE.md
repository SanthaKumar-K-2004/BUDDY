# Chrome Web Store & Store Listing Document

- **Extension Name:** BUDDY: All-in-One Digital Wellness & Shield
- **Version:** 1.0.0
- **Author:** Santhakumar K ([LinkedIn](https://www.linkedin.com/in/santhakumar-k/) | [GitHub](https://github.com/SanthaKumar-K-2004/BUDDY))
- **License:** Apache-2.0

---

## 1. Store Metadata

### Title
`BUDDY: All-in-One Digital Wellness & Shield`

### Summary (132 characters max)
`Privacy-first digital wellness suite: ad & tracker shield, focus timer, pet companion, parental controls & on-device habits.`

### Detailed Description
```markdown
BUDDY is a 100% private, on-device digital wellness companion designed to help you regain focus, protect your time, and enjoy a cleaner web experience.

🌟 KEY FEATURES:
• 🛡️ Ad & Tracker Shield: Blocks invasive banner ads, popups, and telemetry trackers using native on-device DeclarativeNetRequest rules.
• ⏳ Focus Engine & Take-a-Breath: Gentle, customizable interventions on distracting websites to help prevent infinite doomscrolling.
• 🐾 Virtual Companion Pet: A playful on-device companion whose mood and energy reflect your daily mindful browsing habits.
• 📊 Daily Habits & Today Analytics: Real-time insights into your time spent across learning, work, media, and social platforms.
• 👨‍👩‍👧 Family & Parental Protection: Secure PBKDF2-SHA-256 PIN authentication with customizable category limits to protect children online.
• 🧠 100% Local Intelligence: All habit analysis and recommendations run locally on your device in real-time.

🔒 ZERO DATA COLLECTION:
• No accounts, no sign-ups, no passwords.
• Zero telemetry, zero analytics tracking, and zero remote servers.
• All statistics and settings stay stored 100% locally in your browser's private sandbox.
• 100% Open Source under the Apache-2.0 License.

Developed by Santhakumar K (https://github.com/SanthaKumar-K-2004/BUDDY).
```

---

## 2. Permissions Justification

| Permission | Justification |
| :--- | :--- |
| `storage` | Storing user wellness preferences, pet state, custom focus time limits, and local browsing statistics on-device. Zero data is transmitted off the device. |
| `alarms` | Scheduling local hourly pet companion mood updates and daily rollover analytics calculations. |
| `tabs` | Reading the current active tab domain to categorize user activity (e.g., learning vs. social media) and display accurate daily focus time in the popup. |
| `declarativeNetRequest` | Blocking advertising networks and tracking scripts locally using on-device rulesets to improve page speed and protect privacy without reading content. |
| `declarativeNetRequestWithHostAccess` | Permitting users to selectively pause or whitelist specific websites from ad-blocking rules directly from the popup toggle. |
| `sidePanel` | Providing an optional persistent wellness dashboard and habit companion alongside web pages in Chrome. |
| Host Permission (`<all_urls>`) | Required to enable the on-device ad/tracker blocking engine and display the user-requested Take-a-Breath focus intervention banner across user-visited web pages. |

---

## 3. Privacy Policy & Data Disclosure Form

- **Single Purpose:** Digital wellness, distraction intervention, on-device ad and tracker shielding, and healthy browsing companion.
- **Data Collection:** None. Zero personally identifiable information, browsing history, or analytics is transmitted to any server.
- **Privacy Policy Link:** `https://github.com/SanthaKumar-K-2004/BUDDY/blob/main/docs/PRIVACY-ARCHITECTURE.md`

---

## 4. Release Artifacts

- **Chrome / Brave / Edge:** `release/BUDDY-v1.0.0-Chrome.zip` (74.75 kB)
- **Firefox AMO:** `release/BUDDY-v1.0.0-Firefox.zip` (74.79 kB)
- **Build from Source:** `pnpm run build` & `pnpm run build:zip`
