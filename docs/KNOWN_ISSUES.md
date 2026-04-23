# Known Issues

## Runtime And Platform Blockers

- Full Android device-level smoke validation against live Firebase is still pending for the redesigned prototype flow.
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
- Android Home map tiles will stay blank if the Google Maps Android API key is not authorized for package `com.sosync.mobile` and the current debug SHA1 from `android/app/debug.keystore`.
  - `npm run doctor:android-live` now prints the fingerprint that must be added to the key restriction in Google Cloud Console.
- Home cold-start and quick-tab-return smoothness still need broader physical-device validation after the narrowed Android snapshot workaround.
  - The app now avoids extra cold-start snapshot work, but weaker Android devices should still be smoke-tested before treating map performance as fully settled.
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

- Notification payload helpers understand a `message` type, but there is no complete messaging feature in the app.
- Disaster sync and route proxying exist, but full end-to-end Android validation is still pending.
- The Home `Flood risk` sheet is personal and on-demand in v1.
  - It does not create Firestore `alerts`, does not notify the circle, depends on nearby Google modeled gauge coverage for richer flood output, and still needs live validation of the simplified alert-first sheet, nearby-point popup modal, and Google polygon availability across real Philippines locations.
- The backend route proxy still exists, but Home no longer surfaces in-app route preview.
  - Safety hubs currently use direct Google Maps handoff only, so the dormant route proxy should not be treated as an active user-facing feature.
- Circle management is now function-backed, but it still needs live smoke validation for owner transfer, admin role changes, removals, and multi-circle switching.
- Legal/privacy/terms content is currently local in-app copy only.
  - There is no hosted policy or CMS-backed content yet; the signed-in legal screens now live under `Privacy & Safety` and onboarding still keeps its own local modal copy.
- Appearance now surfaces `Dark`, `Light`, and `System` selections in the signed-in settings flow.
  - Broader screen-by-screen dark rendering beyond the current saved preference still needs deeper validation before it should be treated as a finished app-wide theme rollout.

## Security And Rules

- Firestore rules were tightened for group membership, blocked users, read receipts, and group preferences, but they still need live deployment validation against the new onboarding and leave-group flows.
- Storage rules are now required for avatar upload and the public email-brand asset path, and must be deployed alongside the rest of the backend config.
- Block filtering is enforced for user-generated SOS push fanout and personal UI visibility, but disaster alerts remain intentionally group-wide.
