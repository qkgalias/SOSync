# Architecture

## App Structure

- `app/` contains the Expo Router route files.
- `src/modules/` contains screen implementations grouped by feature area.
- `src/components/` contains reusable UI primitives.
- `src/providers/` hosts app-wide context, with `SessionProvider` coordinating auth, profile, groups, and selected circle state.
- `src/services/` wraps Firebase, location, notifications, and backend API access.
- `functions/src/` contains the Firebase backend surface.

## Layering

- Presentation layer:
  - Screen components in `src/modules/**/screens`
  - Route entrypoints in `app/`
- Service layer:
  - Firebase accessors in `src/services/firebase.ts`
  - Auth, Firestore, notifications, location, and API services in `src/services/`
- Data layer:
  - Shared contracts in `src/types/`
  - Firestore access patterns in `src/services/firestoreService.ts`
- Utility layer:
  - Constants, permission wrappers, validators, and helpers in `src/utils/`

## Firebase Data Model

- `users`
- `users/{userId}/pushTokens`
- `groups`
- `groups/{groupId}/members`
- `locations`
- `alerts`
- `sos_events`
- `evacuation_centers`
- `emergency_hotlines`

The data model is circle-scoped. Locations, alerts, and SOS events are tied to a trusted group, and read access is enforced through Firestore membership checks.

## Cloud Functions Responsibilities

- `functions/src/routes.ts`
  - Proxies Google Directions requests so route API keys stay off-device.
- `functions/src/alerts.ts`
  - Syncs weather-driven alerts and writes group-scoped alert documents.
- `functions/src/groups.ts`
  - Creates circles with permanent invite codes, joins circles by code, and enforces owner/admin/member mutations.
- `functions/src/notifications.ts`
  - Fans out push payloads for alerts and SOS events.
  - Currently sends remote push only to Android tokens and logs deferred iOS tokens.

## Notification And Event Flow

1. Alerts or SOS events are written into Firestore.
2. Cloud Functions react to those documents and prepare push payloads.
3. Android tokens receive remote push fanout through FCM.
4. The app normalizes payloads into routes and feed items through `src/services/notificationPayload.ts`.
5. Notification taps route users into alert detail or the notification center.
6. iOS keeps the notification UX path in code, but remote push is deferred until APNs exists.

## Platform Split

- Android:
  - Active target for remote push validation.
  - Intended platform for near-term smoke tests.
- iOS:
  - Code paths remain in place for permissions and notification handling.
  - Native folder is currently absent.
  - APNs and iOS remote push are deferred.
