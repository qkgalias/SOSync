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
- Live Firebase is the default development and smoke-test path.
- The initial production rollout uses the same live Firebase project as development.
- Emulator usage is supported, but it is explicit and opt-in.
- iOS is supported in code, but remote push is deferred because APNs is not configured.
- The generated `ios/` folder was intentionally removed and should be treated as disposable output.
- In live or emulator mode, missing native Firebase config should now surface an explicit configuration error instead of silently falling back to demo data.
- Do not assume iOS push works.
- Do not assume the planned “messages” feature exists end-to-end. Notification payload helpers include a message shape, but no chat/message module is implemented.

## Working Rules

- Prefer Android validation paths and device/emulator smoke tests on Android first.
- Prefer the same live Firebase backend for development and initial production planning unless there is a deliberate environment split.
- Read the docs before changing runtime behavior, push flows, or Firebase wiring.
- Keep `docs/PROJECT_STATUS.md`, `docs/KNOWN_ISSUES.md`, and `docs/DECISIONS.md` up to date when project state changes.
- Treat demo mode as explicit only. Do not reintroduce silent fallback from live or emulator mode into seeded/mock behavior.
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

- `src/config/backendRuntime.ts`: this is the source of truth for live, emulator, and demo behavior. Keep Firebase SDK and HTTP backend mode aligned.
- `src/services/firebase.ts`: emulator connections must remain opt-in and must not silently override live development.
- `functions/src/notifications.ts`: Android-first push delivery only.
- `firestore.rules`: group member permissions should be revisited before production.
- `functions/src/alerts.ts`: alert geography is still coarse and Philippines-first rather than group-specific.

## Documentation Standard

When behavior changes, update:
- `docs/PROJECT_STATUS.md` for current reality
- `docs/KNOWN_ISSUES.md` for blockers/debt
- `docs/TESTING.md` for changed validation steps
- `docs/DECISIONS.md` for new platform/product decisions
