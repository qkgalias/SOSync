# Project Status

## Built

- Expo Router app shell with a prototype-matched five-tab structure: `Home`, `Hotlines`, centered `SOS`, `Notifications`, and `Profile`.
- Figma-driven redesign that replaces the earlier blue/teal UI with the prototype’s white, coral-red, soft-pink, and light-gray visual system.
- Prototype-style onboarding flow: neutral Android native launch handoff, in-app combined-logo splash, auto-playing 3-slide welcome carousel, email sign-in, redesigned sign-up with first/last name plus required phone capture, email OTP verification, lighter profile setup, combined create/join circle hub, dedicated circle-naming step, permanent 6-digit invite-code sharing, and permissions.
- Session, auth, profile, and group orchestration through `SessionProvider`.
- Auth service support for Firebase email/password auth, Resend-backed email OTP verification, plus password update and account deletion helpers.
- Shared input normalization for email, phone, invite code, OTP code, circle names, and password-change validation across the current onboarding and account-management flows.
- Firestore service layer for users, groups, permanent circle codes, locations, alerts, SOS events, hotlines, push tokens, blocked users, notification read receipts, per-group preferences, and shared manual statuses.
- Live and fallback hotline seeds now include the expanded Philippines/Talisay set: `911`, `Philippine Red Cross`, `NDRRMC`, `PNP`, `BFP`, `Talisay City DRRMO Rescue`, and `Barangay Tabunok Hall`.
- Firebase Storage-backed avatar upload for real profile photos.
- Firebase Storage rules now cover owner-scoped avatar uploads under `avatars/{userId}/...`.
- Firebase Storage rules now also allow narrow public reads for `branding/**` so transactional emails can render the SOSync mark.
- Home screen redesign with a full-screen native map, avatar-bubble markers that now keep initials visible until remote photos are confirmed, a custom current-user name tag, a draggable list-driven bottom sheet tuned for longer circle and contact lists, the shared bottom tab bar, coordinated light/dark Home-scene variants, mounted tab persistence so Home returns without a map reset, quieter background avatar-photo retries, a smoother fade for the right-side quick-member stack as the sheet reaches its top snap point, eager tab mounting plus stable marker/alert prop signatures to keep the map surface warm, and an Android-only cached map snapshot fade that masks the brief tile-texture gap when returning to Home.
- Full-page SOS redesign with responsive concentric rings, orbiting member avatars, a tap-or-hold trigger, a left-to-right slide-to-cancel control during countdown, and trusted-circle alert fanout without any embedded hotline UI.
- Notification center redesign with `Unread` first by default, `All` as the full 30-day history, persisted read receipts backed by stable feed IDs, an unread-count badge on the Alerts nav item capped at `9+`, SOS detail popups on tap, self-SOS suppression, and pull-to-refresh timestamp refresh.
- Profile hub redesign with a richer trusted-circle overview, member previews, a compact no-circle join/create state, a modal join-by-code flow, direct avatar updates from the profile pencil control, separate Figma-aligned gray `General` and `Appearance` rows, and `#5C1515` role/action emphasis.
- Signed-in settings flow now includes dedicated `General`, `Permissions`, `Account`, `Joined Circles`, per-circle detail screens, `Privacy & Safety`, `Help and About`, `Appearance`, an `Edit Profile` hub, a focused contact-details screen, and a focused password screen.
- Signed-in profile/account/settings screens now use a Figma-aligned light surface system: separate rounded gray rows/cards, tighter spacing, reduced nested white-card usage, and a shared `#5C1515` accent across icons, buttons, outlines, and modal controls.
- Modal dismiss patterns are now simplified so informational and account-management modals rely on the top dismiss control instead of duplicating a second bottom `Close` action.
- Home and Help icon semantics were cleaned up so distinct actions no longer reuse the same icon for different meanings, especially around map focus, live sharing, routing, support, and legal rows.
- Account now uses a profile-summary entry screen with a single `View Joined Circles` row, while joined circles and per-circle detail screens handle invite codes, owner-first member ordering, role actions, and leave-circle behavior. Active-circle switching stays on the Home bottom sheet.
- Appearance now surfaces `Dark`, `Light`, and `System` theme choices plus read-only `Language` and `Font` rows in the new grouped layout.
- Trusted-circle membership is the active emergency-contact model in surfaced UI. Legacy per-group `primaryContactIds` remain tolerated in data but are no longer presented as a first-class product feature.
- Hotlines tab redesigned as a tap-to-call list with native confirmation before opening the system dialer and a centered header aligned with Notifications/Profile.
- Cloud Functions for route proxying, alert sync, permanent circle creation/join, owner/admin/member circle management, and push fanout.
- HTTP Cloud Functions now require Firebase bearer auth and apply fixed-window rate limits for evacuation-route proxying and manual disaster-alert sync requests.
- Explicit backend mode selection so development builds use live Firebase by default, emulators only when requested, and demo fallback only when explicitly configured.
- Runtime hardening so live and emulator modes surface a Firebase configuration error instead of silently returning demo users, seeded alerts, or fake routes.
- Local Android/live-Firebase smoke-test helper scripts for setup checks, base Firestore seed data, and manual alert creation.
- Android emulator QA bootstrap command now starts Metro on a free port, applies `adb reverse`, opens the Expo dev client through `exp://127.0.0.1:<port>`, and captures screenshot/UI/logcat artifacts when the app stays in Dev Launcher.
- Root deploy/build scripts for Firebase backend deploys and Android EAS release builds.
- Optional circle onboarding so users can create a circle, join one with a permanent 6-digit code, or defer circle membership and keep using the app foundation.
- Circle creators now resume at `circle`, `circle-name`, `invite`, or `permissions` based on persisted onboarding state, and the invite screen always reloads the circle's permanent code after a reopen.
- Firestore rules and indexes expanded for `groupPreferences`, `blockedUsers`, `notificationReads`, `groups/{groupId}/statuses`, and collection-group membership lookups.
- Protected `email_verifications/{uid}` documents now hold hashed OTP state server-side only.
- Android-first notification flow with push token registration, foreground handling, tap routing, and block-aware user-generated SOS push fanout.
- Web preview now falls back gracefully on the Home map scene instead of importing native map modules and crashing.
- Split repo-owned brand assets now drive Android launcher icons, in-app branding, splash art, and onboarding carousel from the supplied design sources.

## Validated

- TypeScript typecheck passes.
- Jest test suite passes for current app utilities, service helpers, routing logic, and hotlines screen rendering.
- Backend runtime tests cover live, emulator, and explicit demo mode selection.
- Validator and HTTP-helper tests cover normalized email/phone/code handling plus bearer-token and fixed-window helper behavior.
- Cloud Functions TypeScript build passes.
- Android debug assemble passes locally.
- Firebase project, native Firebase config files, and Maps/API secret wiring were set up during this buildout.
- EAS build profiles now default to the same live Firebase project for preview and production Android builds.
- Static validation currently confirmed with:
  - `npm run typecheck`
  - `npx jest --runInBand --watchman=false`
  - `npm run functions:build`

## Blocked

- Full Android device-level smoke validation of the redesigned prototype flow is still pending.
- Resend email delivery still depends on live Functions config and a deployed public brand asset.
  - Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and optionally `RESEND_BRAND_LOGO_URL` before the live verification flow will work.
- Android Home map tiles depend on the Google Maps Android key allowing package `com.sosync.mobile` for the current debug signing fingerprint from `android/app/debug.keystore`.
  - The local setup checker now prints that SHA1 fingerprint to make console configuration explicit before smoke tests.
- The `listenToGroups` collection-group query still depends on Firestore `members.userId` indexing state.
  - The rules path was fixed and the single-field collection-group index was deployed, but the app may continue to show a temporary failed-precondition warning until Firebase finishes serving that index consistently.
- Older circles created before the permanent-code migration may still need `ownerId` and `inviteCode` backfilled.
  - Run `npm run backfill:circle-codes` once against live Firebase after deploying the new backend surface.
- iOS remote push is unavailable because APNs is not configured.
- The generated `ios/` folder was intentionally removed after the iOS Google Maps / CocoaPods issue, so iOS native validation is deferred.
- Message notifications are planned in payload shape only; there is no full messaging feature yet.
## Next 3 Priorities

1. Deploy the updated backend surface end to end: Firestore rules, Storage rules, Cloud Functions, Resend secrets, and the public branding asset used by verification emails.
2. Run a full Android device smoke test covering email sign-up, email OTP verification, avatar upload, create/join hub, circle naming, permanent invite sharing, signed-in permissions, full-screen Home map, draggable Home sheet, share-live toggles, full-page SOS countdown/slide-cancel, notifications, and profile/account/privacy/help/appearance flows against live Firebase.
3. Validate multi-circle management deeply, especially owner transfer, admin promotion/demotion, member removal, leave-circle edge cases, and active-circle switching.

## Recent Platform Decisions

- Android is the active platform for end-to-end notification validation.
- iOS stays in the codebase, but APNs and native iOS regeneration are deferred.
- Generated native folders are disposable outputs and are not treated as source of truth.
- Live Firebase is the default smoke-test path in development builds, while emulator usage is explicit and opt-in.
- Demo fallback is explicit only; live or emulator mode no longer silently degrades into mock behavior.
- The initial production rollout uses the same Firebase project as development and secures native Firebase files through EAS instead of git.
- The Figma mobile prototype is now the visual source of truth for the product shell and core screens.
- Trusted contacts and primary emergency contacts are derived from existing circle membership, not the phone address book.
- New account verification is email-only. Phone numbers are collected during sign-up for profile/contact use, not for auth or MFA.
