# Decisions

## 2026-03 Android-First Notifications

- Decision:
  - Build and validate the full notification pipeline on Android first.
- Why:
  - APNs is not currently available.
  - Android can validate disaster alerts and SOS remote delivery now.

## 2026-03 iOS Deferred Pending Apple Developer/APNs

- Decision:
  - Keep iOS support in code, but defer native push completion and real remote delivery.
- Why:
  - Apple Developer enrollment and APNs setup are not available yet.

## 2026-03 Foreground-Only Location Sharing In V1

- Decision:
  - Keep location sharing foreground-only in the first foundation release.
- Why:
  - It matches the privacy-first positioning and reduces background-permission complexity.

## 2026-03 Philippines-First Defaults

- Decision:
  - Use Philippines-first defaults for region, hotlines, and initial disaster assumptions.
- Why:
  - Current product framing and data seeding are PH-first.

## 2026-03 Generated Native Folders Are Disposable

- Decision:
  - Treat generated native folders as outputs rather than source-of-truth code.
- Why:
  - The app is configured through Expo and project config files, and native folders can be regenerated after platform decisions are settled.
