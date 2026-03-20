# Project Status

## Built

- Expo Router app shell with onboarding, tabs, alert detail, help, and settings routes.
- Session, auth, profile, and group orchestration through `SessionProvider`.
- Firestore service layer for users, groups, invites, locations, alerts, SOS events, hotlines, and push tokens.
- Cloud Functions for route proxying, alert sync, invite resolution, and push fanout.
- Firestore rules baseline for self-only profile and push-token writes plus group-scoped reads.
- Android-first notification flow with push token registration, foreground handling, and tap routing.
- Map, evacuation snapshot, SOS dispatch, and hotline views.

## Validated

- TypeScript typecheck passes.
- Jest test suite passes for current app utilities and notification payload parsing.
- Cloud Functions TypeScript build passes.
- Firebase project, native Firebase config files, and Maps/API secret wiring were set up during this buildout.

## Blocked

- Real Android smoke testing is not trustworthy yet because `src/services/firebase.ts` forces localhost emulators in `__DEV__`.
- iOS remote push is unavailable because APNs is not configured.
- The generated `ios/` folder was intentionally removed after the iOS Google Maps / CocoaPods issue, so iOS native validation is deferred.
- Message notifications are planned in payload shape only; there is no full messaging feature yet.

## Next 3 Priorities

1. Make emulator usage configurable instead of automatic in dev builds.
2. Run a real Android smoke test covering auth, groups, maps, SOS, alerts, and push.
3. Tighten production-hardening gaps, especially Firestore group-member permissions and backend auth assumptions.

## Recent Platform Decisions

- Android is the active platform for end-to-end notification validation.
- iOS stays in the codebase, but APNs and native iOS regeneration are deferred.
- Generated native folders are disposable outputs and are not treated as source of truth.
