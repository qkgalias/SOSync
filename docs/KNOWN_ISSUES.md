# Known Issues

## Runtime And Platform Blockers

- `src/services/firebase.ts` forces Auth, Firestore, and Functions to localhost emulators in `__DEV__`.
  - This makes real Android device testing misleading or broken until the behavior is made configurable.
- The generated `ios/` folder was intentionally removed.
  - iOS native testing is deferred.
- A previous iOS prebuild hit a `react-native-google-maps` / CocoaPods integration problem.
  - This is historical context for why iOS was deferred rather than a resolved issue.

## Push Notifications

- Remote push is Android-first only.
- iOS remote push is not operational because APNs is not configured.
- The code supports iOS notification permissions and in-app handling, but not real remote delivery.

## Alerts And Geography

- `functions/src/alerts.ts` currently writes alerts using shared Manila-area coordinates and PH-first assumptions.
- Alert generation is not yet tailored to each group’s actual geography.

## Feature Gaps

- Notification payload helpers understand a `message` type, but there is no complete messaging feature in the app.
- Disaster sync and route proxying exist, but real end-to-end device validation is still pending.

## Security And Rules

- `firestore.rules` currently allows `groups/{groupId}/members/{userId}` create, update, and delete when `isSelf(userId)` is true.
- That is broader than the intended “only admins invite or remove members” production posture and should be revisited.
