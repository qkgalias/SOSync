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
- full-screen Home map rendering with avatar markers, compact tap-to-show member name pills anchored beside the tapped marker, dynamic light/dark pastel scene styling, and the draggable bottom sheet
- Android emulator GPS defaults to Google HQ (`1600 Amphitheatre Parkway`) unless you set a mock device location, so reset emulator location before judging whether Home is centering on the expected real-world area
- on cold launch, Home should mount the map immediately, prefer the best already-known user location when available, and then recenter quietly when a fresher live fix arrives instead of blocking the first render
- if Expo Dev Launcher opens instead of the SOSync app, prefer the emulator-safe `http://10.0.2.2:8081` server entry instead of stale `RECENTLY OPENED` LAN IPs before judging location or map behavior
- expanded Home sheet scrolls through long contact lists and still reaches the safety-hub footer on smaller Android screens
- Home sheet header shows a compact, non-tappable current-weather preview beside `Share Live` / `Pause Live`, and the row stays stable through loading, permission-denied, unavailable, and ready states on smaller Android screens
- Home `Share live` toggle updates the UI and map visibility state immediately
- Home action icons stay semantically distinct: contact focus is not reused for share-live or safety-hub routing
- Home top pill, floating `Flood risk` / `Weather` buttons, `Pause Live`, circle chips, and the bottom sheet should use soft shadow/elevation instead of visible outline-heavy borders
- the Home top address pill should keep its full-height feel, be narrower in width than before, and fade away only when the sheet reaches the top snap point
- the Home top address pill should fade out and back in quickly near the top snap point, without a slow lingering shadow trail
- trusted-circle chips should use a subtle centered pill shadow rather than the heavier button shadow with a visible downward offset
- trusted-circle chips should sit in a cleaner dedicated lane with enough top/bottom breathing room and a clearer gap before the divider below
- the Home bottom sheet should end cleanly at the safety-hub section without a loose helper note or extra white tail under the final divider
- Home `Report/SOS` CTA opens the SOS flow from the sheet
- Home keeps the shared bottom tab bar visible during normal sheet use, and returning from other tabs should not visibly remount or flash the map
- returning to Home from other tabs should not trigger the native map loading overlay or a noticeable wrapper repaint
- quick Home <-> Hotlines/Profile/Alerts tab swaps should not feel like the native map scene is recreated; the scene should stay warm and preserve camera/sheet state
- on Android, quick tab returns should still show the cached Home map frame immediately instead of flashing a blank/beige tile surface before the live map texture catches up, but cold start should not feel delayed by snapshot work
- Home marker avatars stay visible when switching tabs, backgrounding/foregrounding the app, and returning to Home without forcing an app restart
- if a map avatar photo fails or stalls, the marker falls back to initials instead of showing a blank white bubble
- fully expanding the Home bottom sheet fades the top address pill and the right-side quick-member avatar stack out together, and lowering the sheet fades both back in together without a lingering shadow
- Home floating `Flood risk` and `Weather` CTAs sit side by side just above the collapsed sheet with only a very small gap, hide before they visually overlap the rising main sheet, and open dedicated near-fullscreen sheets instead of routing away
- the floating `Weather` CTA remains the only entry point into the full Weather sheet; the new Home header weather preview is informational only
- weather sheet relies on swipe-down/backdrop dismissal, shows a current-weather hero plus a simple 7-day forecast list, and contains no flood-risk content
- weather sheet keeps a clean weather-unavailable state when Open-Meteo data is missing from the shared overview response
- flood sheet shows a clear permission-required state when location is denied, a no-coverage state when Google has no nearby modeled gauges, and no embedded weather content
- flood and weather should only show the `Turn on location` state when Android permission is actually denied; when permission is granted but a fresh fix is still warming up, they should show a loading state and reuse the last successful app-known location when available
- repeated flood refresh taps should eventually return a clear rate-limit message instead of silently failing; the backend now throttles `getFloodRiskOverview` per user inside a 5-minute window
- on Android emulator cold starts, flood and weather should still recover using the device's last known location when a brand-new fix is not immediately available
- flood sheet relies on swipe-down/backdrop dismissal instead of a top-right close button
- flood sheet hero should show the locked severity ladder (`SAFE`, `CAUTION`, `WARNING`, `DANGER`, `EXTREME DANGER`, or `LIMITED DATA`) with flat inline trend/update metadata and forecast-window copy when available
- the primary monitoring-point card should clearly say it is the nearest modeled reference for the user, not an exact street-level flood reading
- nearby monitoring points should show distinct labels, distance, severity, trend, and updated time, and tapping one should open a centered popup modal instead of a nested bottom sheet
- the `How to read this alert` section should stay short, plain-language, and easy to scan, without raw threshold numbers or raw unit strings in the main sheet
- the in-sheet flood mini map should render the user location, nearby gauges, and polygons only when Google returns usable geometry; otherwise it should hide cleanly without empty placeholders
- when validating Philippines coverage, Talisay City, Cebu is the primary QA target for smoke testing, but the shipped feature should still reflect the device user's real current location
- onboarding/auth dark-red sheets reach the bottom edge without a white strip in the bottom safe area
- onboarding screens now match the same dark-red family as Profile/Settings, with no leftover coral/pink surfaces on welcome, sign-in, sign-up, verification, create/join circle, invite, or permissions
- shared token consumers outside onboarding still look intentional after the universal token swap, especially the bottom tab active tint, notifications accents, and secondary buttons
- safety-hub Maps handoff
- tapping `Nearest Safety Hub` now selects and focuses the nearest hub without drawing an in-app route line
- tapping an evacuation-center marker no longer shows the raw native Google callout; it shows a custom bubble with the center name, address, and a navigation icon
- tapping the custom center-bubble navigation icon opens Google Maps directions to that tapped center
- tapping a member marker, including the current user marker, should show the same compact member-name pill, and no member name should be visible by default on first Home load
- panning or zooming the map should dismiss the member-name pill immediately instead of letting it follow the screen
- the member-name pill should be a clean oblong with no pointer arrow
- tapping a Home contact name with a saved phone number should show the same `Cancel / Call` confirmation pattern used by Hotlines
- the Home contact trailing focus icon should stay tappable without the extra inner white circular background
- `Open in Maps` from the nearest-hub card launches Google Maps directions for the currently active hub: the selected center when one is tapped, otherwise the nearest center
- no in-app route polyline or route-preview error/loading copy should appear on Home anymore
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
- joined-circles route lists every circle the user belongs to, including the active-circle indicator and a `+` entry that offers both `Create circle` and `Join via code`
- the signed-in join-by-code modal should behave the same from Profile and Joined Circles: 6-digit validation, inline error state, successful join, and reset-on-dismiss
- circle-detail route shows the invite code, share/copy actions, owner-first membership ordering, tap-on-row member action modal, and leave-circle behavior
- Home quick-member avatars on the right hide when the bottom sheet is fully expanded and reappear when the sheet comes back down
- signed-in profile/account/settings surfaces use separate Figma-aligned gray rows/cards, `#5C1515` accents, and reduced nested white-card usage
- edit-profile hub with cards for `Change contact details`, `Change password`, and `Delete account`
- contact-details route edits username and phone only while leaving email read-only
- password route validates current password, new password, and confirmation with specific feedback
- appearance route shows `Dark`, `Light`, and `System` theme choices plus read-only `Language` and `Font` rows
- Appearance should switch the whole app immediately between `Light`, `Dark`, and `System` without requiring an app restart, including the root background, status bar, onboarding/auth sheets, Home map chrome, Hotlines, SOS, Notifications, and signed-in settings/profile surfaces
- while signed in, `Dark` should stay dark even if the Android device theme is light, `Light` should stay light even if the Android device theme is dark, and `System` should follow the device theme again
- on cold launch, the previously saved theme choice should already be reflected on the first rendered screen instead of flashing the wrong theme first
- permissions route uses toggles for location access and notifications in the same style as the emergency-default rows
- privacy & safety no longer shows visibility filters
- privacy & safety now uses the refreshed overview layout with `Sharing controls`, `Privacy & security`, and `Legal` sections
- `Your data is secured` opens the dedicated `Data Security Overview` screen with four static security cards
- `Manage circle access` opens the dedicated `Managed Circle Access` screen with four static access-control cards
- `Privacy Policies and Terms` opens the standalone legal flow on the `Privacy Policy` tab, and the top segmented pill switches between `Privacy Policy` and `Terms of Use`
- help and about follows separate Figma-style support/legal rows instead of grouped utility panels
- `Help & About` keeps `Contact Support`, `Report a Problem`, and `About the App` as the signed-in support/about surface and no longer duplicates `Privacy Policy` / `Terms & Conditions`
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
- updated Firestore rules for `groupPreferences`, `blockedUsers`, and `notificationReads`
- updated Firestore rules that block direct client access to `email_verifications/{uid}`
- new Firebase Storage rules for owner-scoped avatar uploads plus public branding asset reads
- updated Cloud Functions behavior for permanent circle creation, join, role management, ownership transfer, leave-circle safety, and block-aware SOS push fanout
- new Cloud Functions behavior for Resend-backed email OTP send/verify
- authenticated HTTP Cloud Functions behavior for route proxying and disaster-alert sync, including bearer-token checks and route-level rate limits

If the app starts logging repeated Firestore `permission-denied` warnings for `members`, `locations`, `alerts`, or `sos_events`, check these first:
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
