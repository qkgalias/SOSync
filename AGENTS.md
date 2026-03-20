# SOSync Agent Guide

Read order for future work:
1. `AGENTS.md`
2. `docs/PROJECT_STATUS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/KNOWN_ISSUES.md`
5. `docs/TESTING.md`
6. `README.md`

## What SOSync Is

SOSync is a privacy-focused disaster awareness and evacuation app built with Expo Router, React Native, Firebase, and Cloud Functions. The current codebase is a working foundation, not a production-finished app.

## Current Truths

- Android is the primary validation platform.
- iOS is supported in code, but remote push is deferred because APNs is not configured.
- The generated `ios/` folder was intentionally removed and should be treated as disposable output.
- The biggest runtime blocker is emulator wiring in `src/services/firebase.ts`, which currently forces Auth, Firestore, and Functions to localhost in `__DEV__`.
- Do not assume iOS push works.
- Do not assume the planned “messages” feature exists end-to-end. Notification payload helpers include a message shape, but no chat/message module is implemented.

## Working Rules

- Prefer Android validation paths and device/emulator smoke tests on Android first.
- Read the docs before changing runtime behavior, push flows, or Firebase wiring.
- Keep `docs/PROJECT_STATUS.md`, `docs/KNOWN_ISSUES.md`, and `docs/DECISIONS.md` up to date when project state changes.
- Treat generated native folders as outputs, not source of truth.
- Avoid writing docs that present aspirational behavior as if it already exists.

## Code Landmarks

- App shell and route structure: `app/`
- Main feature modules: `src/modules/`
- Runtime/session state: `src/providers/SessionProvider.tsx`
- Firebase service layer: `src/services/`
- Firestore rules and indexes: `firestore.rules`, `firestore.indexes.json`
- Cloud Functions backend: `functions/src/`

## Known Sensitive Areas

- `src/services/firebase.ts`: live-vs-emulator behavior is not production-safe yet.
- `functions/src/notifications.ts`: Android-first push delivery only.
- `firestore.rules`: group member permissions should be revisited before production.
- `functions/src/alerts.ts`: alert geography is still coarse and Philippines-first rather than group-specific.

## Documentation Standard

When behavior changes, update:
- `docs/PROJECT_STATUS.md` for current reality
- `docs/KNOWN_ISSUES.md` for blockers/debt
- `docs/TESTING.md` for changed validation steps
- `docs/DECISIONS.md` for new platform/product decisions
