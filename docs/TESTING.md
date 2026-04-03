# Testing

For the shortest day-to-day command list, start with [Daily Testing Cheat Sheet](/Users/karlos/Developer/VScode/SOSync/docs/DAILY_TESTING.md).

## Static Validation

Run these first:

```bash
npm run typecheck
npx jest --runInBand --watchman=false
npm --prefix functions run build
```

These checks confirm that the app TypeScript, current Jest suite, and Functions TypeScript all compile cleanly.
`npm test` may still try to use Watchman on some machines; prefer `npx jest --runInBand --watchman=false` for deterministic local runs.

## Android Smoke Test

Current target platform for realistic validation:

Android prerequisites:

- Android SDK installed locally.
- Either `ANDROID_HOME` / `ANDROID_SDK_ROOT` is set, or `android/local.properties` points at your SDK path.
- Use a development build, not Expo Go, because the app depends on native Firebase and map modules.
- The Firebase project must already have a default Cloud Firestore database created.
- The Firebase project must already have its default Firebase Storage bucket created if you want avatar upload to work.
- Cloud Functions email verification requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to be configured in Firebase Functions before live testing.
- Authenticate local admin scripts with either `gcloud auth application-default login` or
  `GOOGLE_APPLICATION_CREDENTIALS=<service-account-json>`.

Live Firebase path:

```bash
npm run doctor:android-live
npm run seed:live-data
npm run android
```

Android emulator bootstrap path for development builds:

```bash
npm run qa:android-emulator
```

This command:
- finds a connected Android emulator
- selects a free Metro port
- starts the Expo dev server for the current repo
- applies `adb reverse` for that port
- launches the SOSync development build through the Expo dev client
- writes screenshot, UI dump, Metro log, and logcat artifacts to `/tmp/sosync-android-emulator-qa/<timestamp>/`

If `npm run seed:live-data` prints `Could not load the default credentials`, that is a local admin-auth problem, not an app bug.
Fix it with one of these:

```bash
gcloud auth application-default login
```

or:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

First-time physical Android path:

```bash
adb devices
npm run doctor:android-live
npm run start:clear
npm run android
```

Expected first-install behavior:

- the phone appears in `adb devices` as `device`
- `npm run android` installs `com.sosync.mobile` onto the phone
- the first launch may open the Expo development-client onboarding overlay once
- after dismissing that overlay, Android should show a neutral white native launch background and then hand off into the in-app SOSync splash with the mark and `SoSync` wordmark already visible together
- after the first install, you can usually reopen the installed dev client via the Metro QR/server link while the phone and laptop are on the same Wi-Fi
- Expo Go is not supported for this app

Default expectation:

- `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false`
- app traffic goes to the live Firebase project and deployed Cloud Functions
- `EXPO_PUBLIC_APP_ENV=development`
- if native Firebase config is missing in live mode, the app now surfaces an explicit configuration error instead of silently switching to demo data

What to verify:

- neutral Android launch splash handoff, in-app combined-logo splash, and auto-playing 3-slide welcome carousel using repo-owned PNG assets
- email sign-up with redesigned first/last name UI, required phone capture, verification-email dispatch, and first-load full-page layout without vertical scrolling
- email OTP verification, resend cooldown behavior, and verified-email resume routing
- email sign-in for both verified and still-unverified accounts, with the footer account-switch link visible on first render
- profile setup, including avatar upload
- combined create/join circle hub immediately after profile setup
- create path: circle hub -> circle name -> permanent invite code -> permissions
- join path: circle hub -> enter permanent 6-digit code -> permissions
- invite-step and circle-name-step resume behavior after closing and reopening the app before permissions are complete
- permissions and privacy defaults flow
- full-screen Home map rendering with avatar markers, a custom current-user name tag, dynamic light/dark pastel scene styling, and the draggable bottom sheet
- Android emulator GPS defaults to Google HQ (`1600 Amphitheatre Parkway`) unless you set a mock device location, so reset emulator location before judging whether Home is centering on the expected real-world area
- expanded Home sheet scrolls through long contact lists and still reaches the safety-hub footer on smaller Android screens
- Home `Share live` toggle updates the UI and map visibility state immediately
- Home action icons stay semantically distinct: contact focus is not reused for share-live or safety-hub routing
- Home `Report/SOS` CTA opens the SOS flow from the sheet
- Home keeps the shared bottom tab bar visible while the draggable bottom sheet stays above it, and returning from other tabs should not visibly remount or flash the map
- returning to Home from other tabs should not trigger the native map loading overlay or a noticeable wrapper repaint
- quick Home <-> Hotlines/Profile/Alerts tab swaps should not feel like the native map scene is recreated; the scene should stay warm and preserve camera/sheet state
- on Android, quick tab returns should show the cached Home map frame immediately instead of flashing a blank/beige tile surface before the live map texture catches up
- Home marker avatars stay visible when switching tabs, backgrounding/foregrounding the app, and returning to Home without forcing an app restart
- if a map avatar photo fails or stalls, the marker falls back to initials instead of showing a blank white bubble
- fully expanding the Home bottom sheet fades the right-side quick-member avatar stack out smoothly, and lowering the sheet fades it back in
- onboarding/auth coral sheets reach the bottom edge without a white strip in the bottom safe area
- evacuation route preview
- hotline row rendering, including `911`, `Philippine Red Cross`, `NDRRMC`, `PNP`, `BFP`, `Talisay City DRRMO Rescue`, and `Barangay Tabunok Hall`
- hotline tap -> confirm -> system dialer handoff
- SOS countdown, send, and trusted-circle alerting without automatic hotline dialing
- full-page SOS layout stays stable across different Android screen ratios and does not clip the ring cluster or bottom copy
- SOS cancel now uses the left-to-right slide control during countdown, and partial drags snap back safely
- notification `Unread`-first default, `All` history tab, read movement from `Unread` to `All`, 30-day visible-feed retention, unread-count badge on the Alerts nav item capped at `9+`, SOS detail popup on tap, self-SOS suppression for the caller, and swipe-down refresh updating relative timestamps
- redesigned profile hub with active-circle member previews or a compact no-circle card with modal join/create actions
- profile avatar pencil opens the image picker and updates the saved profile photo without routing away from the Profile page
- main Profile page keeps separate gray-card `General` and `Appearance` rows instead of one shared grouped panel
- `General` route opens from Profile as a `Settings`-style screen and lists `Permissions`, `Account`, `Privacy & Safety`, and `Help & About` in separate rounded rows with subtitles
- account route shows only profile information plus a `View Joined Circles` entry
- joined-circles route lists every circle the user belongs to, including the active-circle indicator and create-circle entry point
- circle-detail route shows the invite code, share/copy actions, owner-first membership ordering, tap-on-row member action modal, and leave-circle behavior
- Home quick-member avatars on the right hide when the bottom sheet is fully expanded and reappear when the sheet comes back down
- signed-in profile/account/settings surfaces use separate Figma-aligned gray rows/cards, `#5C1515` accents, and reduced nested white-card usage
- edit-profile hub with cards for `Change contact details`, `Change password`, and `Delete account`
- contact-details route edits username and phone only while leaving email read-only
- password route validates current password, new password, and confirmation with specific feedback
- appearance route shows `Dark`, `Light`, and `System` theme choices plus read-only `Language` and `Font` rows
- permissions route uses toggles for location access and notifications in the same style as the emergency-default rows
- privacy & safety no longer shows visibility filters
- help and about follows separate Figma-style support/legal rows instead of grouped utility panels
- `Help & About` keeps `Contact Support`, `Report a Problem`, and `Terms & Conditions` visually distinct instead of sharing the same help or warning icon meaning
- informational and settings modals dismiss from the top `X` control without a redundant bottom `Close` button
- privacy & safety, help and about, permissions, and appearance routes
- leave-group and delete-account flows
- Android push receipt and tap routing

Where to inspect created users in Firebase:

- Firebase Console -> Authentication -> Users
  - confirms the sign-in account exists for email/password auth
- Firebase Console -> Firestore Database -> Data -> `email_verifications`
  - confirms the hashed OTP state exists server-side while a verification is pending
- Firebase Console -> Firestore Database -> Data -> `users`
  - confirms the app profile document exists at `users/{uid}`
- Firebase Console -> Firestore Database -> Data -> `groups`
  - confirms circle creation and `groups/{groupId}/members/{uid}`
  - confirms each group now stores a permanent `inviteCode` and `ownerId`

If you are testing against older live circles created before the permanent-code redesign, backfill them once:

```bash
npm run backfill:circle-codes
```

Deterministic alert check after you create a circle:

```bash
npm run seed:live-alert -- --groupId=<your-group-id>
```

Use this when you want the Alerts tab and alert detail screen to show real data immediately rather than waiting for the scheduled backend alert sync.
These seed commands target the live Firebase project and intentionally reject `FIRESTORE_EMULATOR_HOST`.

Before a live smoke pass on the redesigned flow, deploy the backend updates:

```bash
npm run firebase:deploy:backend
```

This is important because the current app build depends on:
- updated Firestore rules for `groupPreferences`, `blockedUsers`, `notificationReads`, and `groups/{groupId}/statuses`
- updated Firestore rules that block direct client access to `email_verifications/{uid}`
- new Firebase Storage rules for owner-scoped avatar uploads plus public branding asset reads
- updated Cloud Functions behavior for permanent circle creation, join, role management, ownership transfer, leave-circle safety, and block-aware SOS push fanout
- new Cloud Functions behavior for Resend-backed email OTP send/verify
- authenticated HTTP Cloud Functions behavior for route proxying and disaster-alert sync, including bearer-token checks and route-level rate limits

If the app starts logging repeated Firestore `permission-denied` warnings for `members`, `statuses`, `locations`, `alerts`, or `sos_events`, check these first:
- the signed-in user is still a member of the currently selected group
- the live Firestore rules and indexes were actually deployed with `npm run firebase:deploy:backend`
- the local profile `defaultGroupId` is not pointing at a group the user already left

Android Maps key note:

- `npm run doctor:android-live` now prints the SHA1 fingerprint from `android/app/debug.keystore`.
- The Google Maps Android API key must allow package `com.sosync.mobile` with that SHA1, or the Home map will render a blank tile surface even when the app itself is working.

## Firebase Emulator Path (Secondary / Local-Isolated)

Local emulator suite:

```bash
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true npm run firebase:emulators
```

Run the app against emulators:

```bash
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true npm run android
```

Rules test when the Firestore emulator is available:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx jest tests/firestore.rules.test.ts --runInBand --watchman=false
```

Important:
- Android emulator uses `10.0.2.2` automatically
- iOS simulator uses `127.0.0.1` automatically
- physical devices should set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=<your-mac-lan-ip>`
- the emulator path does not seed Firestore data for you
- physical Android devices cannot use `127.0.0.1` to reach your Mac
- route proxying and Firebase SDK traffic now follow the same live-vs-emulator mode
- a brand-new physical Android phone must install the development build once before the Metro QR flow is useful
- demo/mock behavior is no longer an implicit fallback; use `EXPO_PUBLIC_APP_ENV=demo` only when you intentionally want demo mode
- the full Home bottom-sheet experience still expects a native Android or iOS development build; web remains a placeholder preview

## Production Path Validation

Before a production Android build:

```bash
npm run firebase:deploy:backend
npm run eas:build:android:production
```

What to confirm:
- the production build still points at `sosync-3276e`
- Cloud Functions, Firestore rules, and Firestore indexes are deployed and current
- EAS has secure access to `ANDROID_GOOGLE_SERVICES_FILE`
- EAS has the live Firebase env values expected by `app.config.ts`
- the release app does not require emulator or demo configuration

Production validation is still Android-first.
iOS production validation remains limited until native iOS work and APNs are resumed.

## iOS Validation Limits

What is not currently realistic on iOS:

- native smoke testing, because the generated `ios/` folder has been removed
- remote push testing, because APNs is not configured
- end-to-end iOS notification delivery

When iOS work resumes:
- choose the iOS map strategy first
- regenerate `ios/`
- then restore native validation
