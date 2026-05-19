# Testing

For the shortest day-to-day command list, start with [Daily Testing Cheat Sheet](/Users/karlos/Developer/VScode/SOSync/docs/DAILY_TESTING.md).

## Static Validation

Run these first:

```bash
npm run doctor:backend-release
npm run typecheck
npx jest --runInBand --watchman=false
npm --prefix functions run build
```

These checks confirm that the backend release files are present, app TypeScript compiles, the current Jest suite passes, and Functions TypeScript builds cleanly.
`npm test` may still try to use Watchman on some machines; prefer `npx jest --runInBand --watchman=false` for deterministic local runs.

## Android Smoke Test

Current target platform for realistic validation:

Android prerequisites:

- Android SDK installed locally.
- Either `ANDROID_HOME` / `ANDROID_SDK_ROOT` is set, or `android/local.properties` points at your SDK path.
- Use a development build, not Expo Go, because the app depends on native Firebase and Google Navigation SDK modules.
- The Android Google API key must be authorized for package `com.sosync.mobile` plus the debug/release SHA1 and must have Maps SDK for Android and Navigation SDK enabled.
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
- new account setup should continue to verification without showing raw Firestore `permission-denied` text; if profile setup cannot finish on the first try, the app should show recovery copy and resume profile setup after sign-in/verification
- email OTP verification, resend cooldown behavior, and verified-email resume routing
- with network disabled in live mode, OTP, circle create/join, flood refresh, SOS, and profile save should all show clear non-technical retry/reconnect messaging; no visible error should mention Firebase, Firestore, Cloud Firestore, project setup, or raw backend codes like `INTERNAL`
- email sign-in for both verified and still-unverified accounts, with the footer account-switch link visible on first render
- profile setup, including avatar upload
- combined create/join circle hub immediately after profile setup
- create path: circle hub -> circle name -> permanent invite code -> permissions
- join path: circle hub -> enter permanent 6-digit code -> permissions
- invite-step and circle-name-step resume behavior after closing and reopening the app before permissions are complete
- permissions and privacy defaults flow
- full-screen Home map rendering through Google Navigation SDK, restored SOSync light/dark map styling, circular avatar/member markers, evacuation-center markers, and the draggable bottom sheet
- Android emulator GPS defaults to Google HQ (`1600 Amphitheatre Parkway`) unless you set a mock device location, so reset emulator location before judging whether Home is centering on the expected real-world area
- on cold launch, Home should mount the map immediately, prefer the best already-known user location when available, and then recenter quietly when a fresher live fix arrives instead of blocking the first render
- if Expo Dev Launcher opens instead of the SOSync app, prefer the emulator-safe `http://10.0.2.2:8081` server entry instead of stale `RECENTLY OPENED` LAN IPs before judging location or map behavior
- expanded Home sheet scrolls through long contact lists and still reaches the safety-hub footer on smaller Android screens
- Home sheet header shows a compact, non-tappable current-weather preview beside `Share Live` / `Pause Live`, and the row stays stable through loading, permission-denied, unavailable, and ready states on smaller Android screens
- Home `Share live` toggle updates the UI and map visibility state immediately
- when Home `Share live` is paused, the weather preview should show `Location is off`, the Flood risk and Weather sheets should show location-off messaging, and no cached temperature, locality, or flood outlook data should remain visible
- if another circle member's live location has not updated for more than 10 minutes, Home should keep their last known marker visible but label them `Offline · last seen Xm ago`; if that member pauses sharing, their location should remain hidden instead
- Home action icons stay semantically distinct: contact focus is not reused for share-live or safety-hub routing
- Home top pill, floating `Flood risk` / `Weather` buttons, `Pause Live`, circle chips, and the bottom sheet should use soft shadow/elevation instead of visible outline-heavy borders
- the Home top address pill should keep its full-height feel, be narrower in width than before, and fade away only when the sheet reaches the top snap point
- the Home top address pill should fade out and back in quickly near the top snap point, without a slow lingering shadow trail
- trusted-circle chips should use a subtle centered pill shadow rather than the heavier button shadow with a visible downward offset
- trusted-circle chips should sit in a cleaner dedicated lane with enough top/bottom breathing room and a clearer gap before the divider below
- the Home bottom sheet should end cleanly at the safety-hub section without a loose helper note or extra white tail under the final divider
- Home `Report/SOS` CTA opens the SOS flow from the sheet
- Home keeps the shared bottom tab bar visible during normal sheet use, and returning from other tabs should not visibly remount or flash the Navigation SDK map
- returning to Home from other tabs should not trigger a noticeable map wrapper repaint
- quick Home <-> Hotlines/Profile/Alerts tab swaps should not feel like the native map scene is recreated; the scene should stay warm and preserve camera/sheet state as much as the Navigation SDK allows
- on Android fresh launch, current-user and member locations should appear as circular avatar or initials markers, never default red Google pins
- on Android fresh launch, the Home map should use the muted SOSync map style instead of the default POI-heavy Google map styling
- on Android, switching away from Home and returning repeatedly should preserve visible markers and should not re-center or repaint the map when the cached last GPS location is unchanged
- fully expanding the Home bottom sheet fades the top address pill and the right-side quick-member avatar stack out together, and lowering the sheet fades both back in together without a lingering shadow
- Home floating `Flood risk` and `Weather` CTAs sit side by side just above the collapsed sheet with only a very small gap, hide before they visually overlap the rising main sheet, and open dedicated near-fullscreen sheets instead of routing away
- the floating `Weather` CTA remains the only entry point into the full Weather sheet; the new Home header weather preview is informational only
- weather sheet relies on swipe-down/backdrop dismissal, shows a current-weather hero plus a simple 7-day forecast list, and contains no flood-risk content
- weather sheet keeps a clean weather-unavailable state when Open-Meteo data is missing from the shared overview response
- flood sheet shows a clear permission-required state when location is denied, a no-coverage state when Google has no nearby modeled gauges, and no embedded weather content
- flood and weather should show the location-off state when in-app sharing is paused, show the permission-required state when Android permission is actually denied, and otherwise show loading while a fresh fix is warming up
- repeated flood refresh taps should eventually return a clear rate-limit message instead of silently failing; the backend now throttles `getFloodRiskOverview` per user inside a 5-minute window
- on Android emulator cold starts, flood and weather should still recover using the device's last known location when a brand-new fix is not immediately available
- flood sheet relies on swipe-down/backdrop dismissal instead of a top-right close button
- flood sheet hero should show the locked severity ladder (`SAFE`, `CAUTION`, `WARNING`, `DANGER`, `EXTREME DANGER`, or `LIMITED DATA`) with flat inline trend/update metadata and forecast-window copy when available
- the primary monitoring-point card should clearly say it is the nearest modeled reference for the user, not an exact street-level flood reading
- nearby monitoring points should show distinct labels, distance, severity, trend, and updated time, and tapping one should open a centered popup modal instead of a nested bottom sheet
- the `How to read this alert` section should stay short, plain-language, and easy to scan, without raw threshold numbers or raw unit strings in the main sheet
- the in-sheet flood mini map is currently disabled while Home uses Google Navigation SDK; the flood sheet should hide that section cleanly without empty placeholders
- when validating Philippines coverage, Talisay City, Cebu is the primary QA target for smoke testing, but the shipped feature should still reflect the device user's real current location
- onboarding/auth dark-red sheets reach the bottom edge without a white strip in the bottom safe area
- onboarding screens now match the same dark-red family as Profile/Settings, with no leftover coral/pink surfaces on welcome, sign-in, sign-up, verification, create/join circle, invite, or permissions
- email OTP verification renders the Resend email with the flat white layout, SOSync `#650B11` dark-red theme, readable OTP code, expiration message, and security notice
- sign-in `Forgot Password?` validates the email field inline, sends a branded password reset email with generic success copy, and does not sign the user in or change routes
- password reset email is delivered through the matching flat SOSync Resend template with one `Reset password` button, no visible raw reset URL, the `#650B11` theme, and the updated ignore-if-unrequested security notice
- shared token consumers outside onboarding still look intentional after the universal token swap, especially the bottom tab active tint, notifications accents, and secondary buttons
- in-app safety-hub navigation
- set Android/emulator GPS near Talisay City, Cebu and confirm only nearby Visayas/Cebu centers are visible while Manila/Luzon centers are hidden
- near Talisay, confirm the visible seeded centers can include `Talisay Sports Academy Center` and `Tabunok Barangay Hall`
- set Android/emulator GPS near Manila and confirm Manila centers appear while Visayas/Cebu centers are hidden
- near Manila, confirm the visible seeded centers can include `Don Bosco School` and `Dapitan Sports Complex`
- Home should display only safety hubs within 2 km of the user in both the map markers and the `Nearby Safety Hubs` list; when none qualify, the list should show `No nearby safety hubs available`
- tapping `Nearest Safety Hub` selects and focuses the nearest visible hub without opening an external app
- tapping an evacuation-center marker selects that center on the Home map and shows its soft rounded nametag without changing the marker icon style
- tapping the evacuation-center label text should not open navigation; only the direction arrow inside the nametag, or the Home safety-hub entry point, should open the in-app route preview bottom sheet
- the Home safety-hub card should show only a single `Navigate` CTA and no always-visible `Walk`, `Two-wheel`, or `Four-wheel` chips
- in the route preview sheet, switching `Walk`, `Two-wheel`, and `Four-wheel` should update the previewed route without starting guidance yet
- pressing `Start` from the route preview sheet should begin in-app guidance after the Google/SOSync navigation terms flow if prompted
- once guidance starts, the old custom top overlay should be gone and trip controls/status should live in the bottom-sheet-style navigation panel instead
- starting in-app evacuation guidance 5 times within 5 minutes should continue to work for the same signed-in user, even when attempts are spread across different nearby centers or travel modes
- the 6th guidance start attempt within that 5-minute window should stay inside the navigation overlay and show a clear wait-time message instead of starting guidance
- while rate-limited, the retry action should remain blocked until the countdown expires, and after expiry the same nearby center should be able to start guidance again
- if the selected evacuation center is no longer nearby for the user's current coordinate, the navigation overlay should refuse to start guidance with a nearby-center error instead of spending a navigation-start attempt
- move the emulator GPS off-route and confirm the SDK updates/reroutes guidance
- tapping `Stop`/back returns to Home and ends guidance cleanly
- no external Google Maps app should open during navigation
- tapping a member marker, including the current user marker, should keep Home focused on that marker without opening evacuation guidance
- panning or zooming the map should dismiss the member-name pill immediately instead of letting it follow the screen
- the member-name pill should be a clean oblong with no pointer arrow
- tapping a Home contact name with a saved phone number should show the same `Cancel / Call` confirmation pattern used by Hotlines
- the Home contact trailing focus icon should stay tappable without the extra inner white circular background
- `Navigate` from the nearest-hub card starts guidance for the currently active hub: the selected center when one is tapped, otherwise the nearest center
- navigation errors should stay inside the full-screen SOSync navigation surface with retry copy instead of opening Maps
- hotline row rendering, including `911`, `Philippine Red Cross`, `NDRRMC`, `PNP`, `BFP`, `Talisay City DRRMO Rescue`, and `Barangay Tabunok Hall`
- with network disabled, the Hotlines tab should still show the bundled Philippines/Talisay emergency contacts and allow the normal call-confirmation flow instead of showing an empty list
- hotline tap -> confirm -> system dialer handoff
- SOS countdown, send, and trusted-circle alerting without automatic hotline dialing
- SOS should refuse to start countdown or send when live location sharing is off or Auto-share location on SOS is off, showing clear location-sharing copy instead of creating a stale-coordinate SOS event
- full-page SOS layout stays stable across different Android screen ratios and does not clip the ring cluster or bottom copy
- SOS cancel now uses the left-to-right slide control during countdown, and partial drags snap back safely
- notification `Unread`-first default, `All` history tab, read movement from `Unread` to `All`, 30-day visible-feed retention, join-time filtering that hides alerts/SOS events created before the current user joined the circle, unread-count badge on the Alerts nav item capped at `9+`, SOS detail popup on tap, SOS push and in-app Alerts suppression for the caller, and swipe-down refresh updating relative timestamps
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
- `Help & About` overview routes into dedicated screens for `Emergency Usage Guide`, `FAQs`, `Contact SOSync Support`, `Report a Problem`, and `About the App` instead of opening modal content
- `Emergency Usage Guide` uses the three-card instructional layout from the refreshed Figma
- `FAQs` uses an accordion layout with the first question expanded by default
- `Contact SOSync Support` validates message input and opens a populated `mailto:` draft to `support@sosync.app`
- `Report a Problem` validates category selection, shows the extra required field for `Other`, previews locally selected media, and opens a populated `mailto:` draft with category/device/version details
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
npm run doctor:backend-release
npm run firebase:deploy:backend
```

This is important because the current app build depends on:
- updated Firestore rules for `groupPreferences`, `blockedUsers`, and `notificationReads`
- updated Firestore rules that block direct client access to `email_verifications/{uid}`
- new Firebase Storage rules for owner-scoped avatar uploads plus public branding asset reads
- new Firebase Storage rules for owner-scoped support report media under `supportReports/{userId}/{reportId}/...`
- deployed support/report Cloud Functions for backend-backed help and problem-report submission
- updated Cloud Functions behavior for permanent circle creation, join, role management, ownership transfer, leave-circle safety, and block-aware SOS push fanout
- new Cloud Functions behavior for Resend-backed email OTP send/verify
- authenticated HTTP Cloud Functions behavior for dormant route proxying and disaster-alert sync, including bearer-token checks and route-level rate limits

After deploying backend updates and running the circle backfill, audit legacy circle data:

```bash
npm run backfill:circle-codes
npm run audit:circle-data
```

The audit should report no circles missing `ownerId`, permanent `inviteCode`, owner membership, or valid member roles before release.

If the app starts logging repeated Firestore `permission-denied` warnings for `members`, `locations`, `alerts`, or `sos_events`, check these first:
- the signed-in user is still a member of the currently selected group
- the live Firestore rules and indexes were actually deployed with `npm run firebase:deploy:backend`
- the local profile `defaultGroupId` is not pointing at a group the user already left

Android Maps key note:

- `npm run doctor:android-live` now prints the SHA1 fingerprint from `android/app/debug.keystore`.
- The Google Maps Android API key must allow package `com.sosync.mobile` with that SHA1 and enable Maps SDK for Android plus Navigation SDK, or the Home map/navigation surface will fail even when the app itself is working.

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
