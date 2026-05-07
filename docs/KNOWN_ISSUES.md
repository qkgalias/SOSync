# Known Issues

## Runtime And Platform Blockers

- Full Android device-level smoke validation against live Firebase is now mostly completed for the current core app flow.
  - Keep focused Android regression passes for backend-dependent flows, Home map reliability, flood/weather accuracy, support/report submission, and theme consistency.
- Android emulator runs still depend on Metro bootstrap and `adb reverse` being healthy for the chosen port.
  - Use `npm run qa:android-emulator` when the development build lands in Expo Dev Launcher instead of the SOSync UI; the command captures screenshot, UI, and logcat artifacts under `/tmp/sosync-android-emulator-qa/`.
- Emulator mode is now secondary and explicit, but physical-device emulator testing may still require
  `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` to be set to your Mac LAN IP.
- The emulator path has no built-in seed command yet.
  - Empty emulator data will make alerts, circles, hotlines, and evacuation-center testing look incomplete.
- The `listenToGroups` membership query can still emit a temporary Firestore `failed-precondition` warning on live Firebase.
  - Firestore rules were fixed and the `members.userId` collection-group index was deployed, but Firebase index availability may lag behind deploy time.
- Older live circles may still be missing `ownerId` or permanent `inviteCode` fields until the migration script is run.
  - Run `npm run backfill:circle-codes` after deploying the new backend surface so legacy circles resume on the permanent-code model.
- The generated `ios/` folder was intentionally removed.
  - iOS native testing is deferred.
- A previous iOS prebuild hit a `react-native-google-maps` / CocoaPods integration problem.
  - This is historical context for why iOS was deferred rather than a resolved issue.
- The Home map and draggable bottom sheet experience is native-build only.
  - Web still shows a placeholder fallback instead of the draggable native map scene.
- Android Home map/navigation will stay blank or fail to start guidance if the Android Google API key is not authorized for package `com.sosync.mobile` and the current debug SHA1 from `android/app/debug.keystore`.
  - `npm run doctor:android-live` now prints the fingerprint that must be added to the key restriction in Google Cloud Console.
  - The Google Cloud project/key must enable both Maps SDK for Android and Navigation SDK, with billing active.
- Home map stability now depends on the Google Navigation SDK map surface rather than `react-native-maps`.
  - Android smoke still needs to verify tab return, custom map styling, circular marker persistence, guidance start/stop, and mode switching on real devices because the Navigation SDK is a beta dependency.
  - SOSync applies a local compatibility patch after install so the SDK can consume raw map-style JSON and local file-path marker icons; rerun `npm install` or `node ./scripts/patchNavigationSdk.mjs` if Home falls back to default styling or red pins after dependency changes.
- The SOS location-sharing backstop depends on deploying the updated Firestore rules.
  - Until those rules are live, the app-side guard blocks normal clients, but stale installed builds are not server-denied yet.
- Avatar upload depends on Firebase Storage being provisioned for the live project.
  - If the default bucket does not exist yet, profile photo upload will fail until Firebase Console -> Storage -> Get started is completed.
- Email OTP verification depends on Cloud Functions and Resend being configured correctly in the live Firebase project.
  - Missing `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, or an undeployed public brand asset will block the live verification email flow.

## Push Notifications

- Remote push is Android-first only.
- iOS remote push is not operational because APNs is not configured.
- The code supports iOS notification permissions and in-app handling, but not real remote delivery.

## Alerts And Geography

- `functions/src/alerts.ts` currently writes alerts using shared Manila-area coordinates and PH-first assumptions.
- Alert generation is not yet tailored to each group’s actual geography.

## Feature Gaps

- Full in-app messaging remains deferred; unsupported `message` notification payloads are now ignored for release instead of appearing as a partial feature.
- Disaster sync is active, and alert generation now uses group/member location context when available instead of a shared Manila-only coordinate.
- The Home `Flood risk` sheet is personal and on-demand in v1.
  - It does not create Firestore `alerts`, does not notify the circle, depends on nearby Google modeled gauge coverage for richer flood output, and still needs live validation of the simplified alert-first sheet, nearby-point popup modal, and Google polygon availability across real Philippines locations.
- In-app safety-hub navigation depends on Google Navigation SDK enablement for the Android app key.
  - The backend Routes API proxy remains available as debt/fallback infrastructure, but Home active navigation now uses the Navigation SDK for routing, rerouting, ETA, and turn instructions.
  - Android live smoke still needs to verify nearby-center filtering, walking/two-wheel/four-wheel guidance, rerouting, stop/back behavior, and that no external Google Maps app opens.
- Circle management is now function-backed, but it still needs live smoke validation for owner transfer, admin role changes, removals, and multi-circle switching.
- Legal/privacy/terms content is still local summary copy in-app.
  - The signed-in legal screens now link to the intended hosted policy URLs, but the hosted pages still need to be published and reviewed before release.
- Signed-in support and problem-report flows now submit to a backend review queue first and fall back to structured email-draft handoff when submission is unavailable.
  - The refreshed report screen can upload locally selected media to owner-scoped Storage paths, but admin review tooling is still minimal.
- Appearance now surfaces `Dark`, `Light`, and `System` selections in the signed-in settings flow.
  - Broader screen-by-screen dark rendering beyond the current saved preference still needs deeper validation before it should be treated as a finished app-wide theme rollout.

## Security And Rules

- Firestore rules were tightened for group membership, blocked users, read receipts, and group preferences, but they still need live deployment validation against the new onboarding and leave-group flows.
- Storage rules are now required for avatar upload and the public email-brand asset path, and must be deployed alongside the rest of the backend config.
- Storage rules now also protect support report media under owner-scoped paths; deploy them with backend support/report functions.
- Block filtering is enforced for user-generated SOS push fanout and personal UI visibility, but disaster alerts remain intentionally group-wide.
- In-app messaging is deferred for release; unsupported `message` notification payloads are ignored instead of surfacing a partial messaging feature.
