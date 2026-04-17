# Decisions

## 2026-03 Android-First Notifications

- Decision:
  - Build and validate the full notification pipeline on Android first.
- Why:
  - APNs is not currently available.
  - Android can validate disaster alerts and SOS remote delivery now.

## 2026-03 iOS Deferred Pending Apple Developer/APNs

- Decision:
  - Keep iOS support in code, but defer native push completion and real remote delivery.
- Why:
  - Apple Developer enrollment and APNs setup are not available yet.

## 2026-03 Foreground-Only Location Sharing In V1

- Decision:
  - Keep location sharing foreground-only in the first foundation release.
- Why:
  - It matches the privacy-first positioning and reduces background-permission complexity.

## 2026-03 Philippines-First Defaults

- Decision:
  - Use Philippines-first defaults for region, hotlines, and initial disaster assumptions.
- Why:
  - Current product framing and data seeding are PH-first.

## 2026-03 Generated Native Folders Are Disposable

- Decision:
  - Treat generated native folders as outputs rather than source-of-truth code.
- Why:
  - The app is configured through Expo and project config files, and native folders can be regenerated after platform decisions are settled.

## 2026-03 Live Firebase Is The Default Android Smoke-Test Path

- Decision:
  - Use live Firebase by default in development builds, and make emulator usage explicit and opt-in.
- Why:
  - The old automatic emulator wiring created broken Android localhost behavior and split backend traffic between live HTTP calls and emulator SDK calls.

## 2026-03 Backend Mode Must Stay Consistent Across SDK And HTTP Traffic

- Decision:
  - Apply the same live-vs-emulator mode to Firebase SDK access and Cloud Functions HTTP calls.
- Why:
  - Mixed backend modes make smoke tests misleading and can hide whether auth, Firestore, routes, alerts, and SOS are actually working together.

## 2026-03 Demo Fallback Is Explicit Only

- Decision:
  - Allow seed/mock fallback behavior only in explicit demo mode.
  - Live and emulator modes must surface configuration errors when native Firebase setup is missing.
- Why:
  - Silent fallback hides real setup problems and makes live smoke tests untrustworthy.

## 2026-03 Single Firebase Project For Initial Production Rollout

- Decision:
  - Use the current live Firebase project for both development and the initial production rollout.
  - Do not introduce a second Firebase project until environment split needs are concrete.
- Why:
  - It keeps Expo Router, Firebase Auth, Firestore, Functions, and FCM on one verified backend path.
  - It avoids extra environment complexity before the Android production path is validated.

## 2026-03 Circle Membership Is Optional During Onboarding

- Decision:
  - Do not force circle creation before users can reach the main app.
  - Let users create a circle, join with an invite, or defer circle membership until later.
- Why:
  - Core awareness, map, hotline, and permission flows still provide value without a trusted circle.
  - Forcing circle creation blocks testing and creates a bad first-run experience when Firestore setup is incomplete.

## 2026-03 Figma Prototype Replaces The Legacy Blue Theme

- Decision:
  - Treat the Figma mobile prototype as the visual source of truth for onboarding, tabs, profile surfaces, and SOS.
- Why:
  - The earlier blue/teal theme diverged materially from the product direction and created an inconsistent experience.

## 2026-03 Final Navigation Uses Five Real Destinations

- Decision:
  - Keep `Home`, `Hotlines`, centered `SOS`, `Notifications`, and `Profile` as real tabs.
- Why:
  - The prototype chrome still fits the product while preserving fast access to hotlines as a first-class destination.

## 2026-03 Hotlines Stay Manual And SOS Does Not Auto-Dial

- Decision:
  - Keep the Hotlines tab as a dedicated manual call surface with a confirm-before-dial interaction.
  - Do not auto-open any hotline when SOS is sent.
- Why:
  - It keeps SOS focused on alerting the trusted circle without forcing an unwanted phone handoff.
  - It matches the simpler Figma-style hotline list and removes the need for a preferred-hotline setting.

## 2026-03 SOS Notifications Open In-App Details And Exclude The Caller

- Decision:
  - Open SOS notifications in an in-app detail popup instead of routing away immediately.
  - Exclude self-triggered SOS events from the caller's notification feed while keeping disaster alerts group-wide.
- Why:
  - SOS items need caller, status, and location context that does not fit the disaster-alert detail route.
  - The caller already knows they triggered the SOS, so showing it again as a circle alert is noisy and misleading.

## 2026-03 Trusted Contacts Are Not A Separate Surfaced Feature

- Decision:
  - Treat the circle itself as the trusted-contact model in surfaced product UI.
  - Do not expose separate trusted-contact or primary-emergency-contact management screens in the active experience.
- Why:
  - It keeps the safety model consistent with circle-scoped privacy and avoids introducing a second contact graph in v1.
  - Separate trusted-contact UI proved redundant once permanent circles and member management existed.

## 2026-03 Circles Use One Permanent 6-Digit Invite Code

- Decision:
  - Each circle owns one permanent 6-digit invite code stored on the group document.
  - Joining the circle does not consume or rotate that code.
- Why:
  - The Figma prototype uses a simple code-entry experience.
  - A permanent code is easier to share, easier to resume during onboarding, and better aligned with multi-circle membership.

## 2026-03 Circle Ownership Is Separate From Member Role

- Decision:
  - Model circle ownership with `ownerId` on the group document.
  - Keep member roles limited to `admin | member`.
  - Circle creators become both owner and admin; joiners enter as members.
- Why:
  - Ownership transfer and admin delegation are separate product behaviors.
  - This keeps leave, promote, demote, and remove flows easier to reason about than a single overloaded role flag.

## 2026-03 Post-Profile Onboarding Starts With A Combined Create/Join Hub

- Decision:
  - Route users from Profile Setup into a combined circle hub.
  - The create path is `circle -> circle-name -> invite -> permissions`.
  - The join path is `circle -> permissions`.
  - `Skip for now` stays available on the circle hub and invite screen.
- Why:
  - The Figma prototype puts create and join on one screen.
  - It reduces onboarding friction and keeps circle membership optional while still making the trusted-circle path obvious.

## 2026-03 Profile Setup Does Not Ask For A Role

- Decision:
  - Remove the profile `role` field from onboarding and the saved `UserProfile` contract.
- Why:
  - Circle permissions come from ownership and membership inside each circle, not from a global profile label.
  - The role field added friction without driving a meaningful product behavior.

## 2026-03 Account Verification Uses Email OTP, Not SMS MFA

- Decision:
  - Remove phone sign-in and SMS MFA from the current product flow.
  - Keep first name, last name, email, phone number, password, and confirm password on sign-up.
  - Create the Firebase email/password account immediately, then verify the account with a 6-digit OTP sent to email through Resend.
  - Keep the phone number for profile/contact use only.
- Why:
  - Email verification is the required trust step for this product, while SMS adds cost without being necessary to ship the onboarding flow.
  - This keeps verification aligned with the email/password account that actually signs into the app.
  - It removes Firebase SMS/MFA project prerequisites from the critical path for account creation.

## 2026-03 Full-Page SOS Uses Slide-To-Cancel And No Embedded Hotline UI

- Decision:
  - Keep SOS as a full-page emergency surface without the map strip at the top.
  - Remove embedded hotline quick-call UI from SOS.
  - Use a left-to-right slide-to-cancel interaction while the SOS countdown is armed.
- Why:
  - Hotlines already have a dedicated manual-call tab, so embedding a second call surface inside SOS is redundant.
  - A full-page layout reads more clearly on different Android screen ratios.
  - Slide-to-cancel reduces accidental cancellation compared with a simple tap target.

## 2026-03 Signed-In Profile Uses Dedicated Account, Permissions, Privacy, Help, And Appearance Surfaces

- Decision:
  - Make `General` a dedicated screen opened from Profile instead of an always-expanded group on the dashboard.
  - Keep `Permissions`, `Account`, `Privacy & Safety`, and `Help and About` inside that `General` screen.
  - Keep `Appearance` as a separate profile row outside `General`.
  - Open join-by-code from a modal on the main Profile page instead of always showing the 6-digit input inline.
  - Use an `Edit Profile` hub that branches into focused `Change contact details` and `Change password` routes, while keeping delete-account access on the hub.
  - Keep the main `Account` screen focused on profile information and one `View Joined Circles` entry.
  - Move invite-code sharing, membership management, and leave-circle behavior into dedicated `Joined Circles` and per-circle detail screens.
  - Let the `Joined Circles` plus action branch into `Create circle` or `Join via code` instead of hard-routing only to create-circle, and reuse the same signed-in join-by-code modal from Profile.
  - Keep active-circle switching on the Home bottom sheet instead of surfacing it again inside circle detail.
  - Follow the Figma mobile prototype as the visual source of truth for the signed-in profile/settings stack, while keeping current app-only features that the Figma has not caught up with yet.
  - Use separate rounded gray rows/cards instead of one grouped settings slab, and reduce nested white subcards only where they create bulky card-within-card layouts.
  - Use `#5C1515` as the standard signed-in profile/settings accent instead of mixing multiple pink-red variants.
  - Keep the profile avatar pencil dedicated to changing the saved photo directly instead of routing into the broader edit-profile flow.
  - Keep circle management under the Account flow, rename surfaced `group` terminology to `circle`, and render owner-first member management through a row-tap action modal instead of inline action-button clusters or visible menu buttons.
  - Style `General` and `Appearance` on the main Profile page as separate rounded gray rows, and style the dedicated `General` screen as a `Settings`-style list of separate rounded gray rows with subtitle text.
  - Add a manual `Dark` theme choice alongside `Light` and `System` in Appearance, plus read-only `Language` and `Font` rows to match the current mockup direction.
- Why:
  - It matches the current product direction in Figma more closely than the previous flatter settings stack.
  - It keeps the Profile dashboard lighter and easier to scan.
  - It gives circle/membership management room to live on `Account` without mixing every credential and destructive action into a single dense screen.
  - The edit hub is easier to scan than a forced step flow, and the member action modal scales better as owner/admin permissions grow.

## 2026-04 Home And SOS Remove Manual Shared Status

- Decision:
  - Remove manual shared status from Home, settings, onboarding, notifications, and Firestore client usage.
  - Keep `Report/SOS` as a direct one-step emergency action without a separate status update step.
- Why:
  - The previous flow encouraged a two-step emergency action: update status, then trigger the alert.
  - Emergency reporting is clearer and faster when the user only needs to tap `Report/SOS`.

## 2026-04 Flood Outlook Prioritizes Alert Clarity Over Diagnostics

- Decision:
  - Keep the Google flood payload and ranking logic, but simplify the Home flood sheet into an alert-first UI with flatter sections, a short plain-language risk guide, and a centered popup modal for nearby-point details.
  - Keep the compact flood mini map only as a secondary section when renderable geometry exists.
- Why:
  - The earlier redesign surfaced too much diagnostic detail for an average user and felt overly layered.
  - Flood outlook needs to answer severity, trend, update time, and nearest reference quickly before it shows extra context.

## 2026-03 Home Keeps The Shared Tab Bar Over The Map Scene

- Decision:
  - Keep the shared bottom tab bar visible on `Home` as the default navigation baseline while the map scene and draggable bottom sheet render above it.
  - Fade the top address pill out as the Home sheet reaches its top snap point instead of hiding the shared bottom tab bar.
  - Keep that top-pill fade fast and narrow so the Home chrome disappears quickly near the top without a slow lingering shadow, and keep the right-side quick-member stack on the same fade timing.
  - Use chip-specific centered shadows for trusted-circle pills instead of reusing the stronger generic button shadow.
  - Show member names only as compact anchored oblong pills on tap, and dismiss them as soon as the user starts moving the map.
  - Let Home contact names reuse the hotline-style `Cancel / Call` confirmation flow when a saved phone number exists, while keeping the trailing focus icon as a separate map-focus action.
  - Keep `SOS` accessible as the large Home sheet CTA in addition to the real `SOS` tab.
- Why:
  - Hiding the shared tab bar removed persistent navigation at the exact moment the map scene still needed stable escape hatches.
  - The shared tab bar is still the more reliable product baseline while the Home sheet continues to evolve.
  - The top pill is transient Home chrome, so fading it at the top snap point reclaims space without removing the user’s persistent navigation.
  - Compact anchored member pills feel more map-native than a wide centered label card, and dismissing them on map movement avoids the broken feeling that the label is chasing the screen instead of staying attached to a place.

## 2026-04 Nearest Safety Hub Uses Direct Google Maps Handoff

- Decision:
  - Keep nearest-hub routing lightweight in v1 by selecting a hub inside SOSync and handing off directly to Google Maps for navigation.
  - Replace raw native evacuation-center callouts with a custom tapped-center bubble that shows the center name, address, and a navigation action.
  - Keep the existing authenticated backend route proxy dormant for now instead of deleting it, so the app can reuse it later without another backend rebuild.
- Why:
  - Direct Maps handoff is clearer and lighter than mixing a partial in-app preview with an external navigation action.
  - The raw Google marker callout does not match the rest of the Home map UI or the custom user bubble language.
  - Keeping the backend route proxy dormant lowers risk now while preserving an easy path back to in-app routing if the product needs it later.

## 2026-04 Home Prioritizes Visual Stability Over Eager Redraws

- Decision:
  - Keep the mounted Home map visually stable on tab return instead of forcing a native-map remount or blanket marker redraw.
  - Mount tab scenes eagerly and only hand the Home map new marker/alert arrays when the underlying content actually changes.
  - On Android, keep the cached Home map snapshot workaround narrow: capture it after Home has already rendered and only reuse it on tab return to hide the native tile-texture gap.
  - Retry missing avatar photos quietly in the background, and fade the quick-member stack out only as the bottom sheet reaches the top snap point.
- Why:
  - The native Android map feels heavier when it is rebuilt or broadly re-tracked on tab switches.
  - Passing fresh-but-equivalent arrays back into the map wrapper makes Android feel like it is repainting even when the scene did not meaningfully change.
  - The emulator still showed a sub-100ms blank tile surface on fast tab returns even after mount-stability work, so a cached-frame mask is the pragmatic UX fix, but running that same workaround during cold start added too much perceived weight on weaker devices.
  - Background retries preserve avatar recovery without making Home look like it is refreshing every time the user comes back.

## 2026-04 Personal Flood Risk Lives On Home As A Modal Forecast Sheet

- Decision:
  - Add a floating `Flood risk` CTA on the Home map as a lower-left overlay, separate from the main Home sheet header.
  - Open the feature as a near-fullscreen modal bottom sheet layered over Home instead of a new tab or route.
  - Keep the first version user-location-based and on-demand rather than writing to Firestore `alerts` or notifying the circle.
  - Apply a tighter per-user backend rate limit to `getFloodRiskOverview` than the generic route defaults.
- Why:
  - The prototype direction reads as a map tool, not as another action inside the existing Home sheet.
  - A dedicated modal sheet gives the flood and weather forecast enough room to feel like a real feature without disturbing the current Home map/navigation stack.
  - Personal flood checks and circle-wide disaster alerts are different product concepts, so keeping them separate avoids muddying the existing alert feed and push model.
  - The flood overview fans out to external forecast providers, so refresh abuse should be bounded more aggressively than lightweight metadata endpoints.

## 2026-04 Home Flood Risk Uses A Gauge-Explained Severity Ladder

- Decision:
  - Keep the flood experience inside the existing Home modal sheet, but rebuild it around one primary nearby gauge, alternative nearby gauges, explicit trend messaging, plain-language threshold explanation, and an optional mini map preview when Google provides polygons.
  - Use the user-facing ladder `SAFE`, `CAUTION`, `WARNING`, `DANGER`, `EXTREME DANGER`, and `LIMITED DATA`.
  - Choose the primary gauge by nearest distance first, then quality verification, then model availability, then higher severity only when gauges are similarly near, then newest update time.
- Why:
  - The earlier sheet exposed useful data, but it did not explain clearly why a specific monitoring point was chosen or how the status should be interpreted.
  - A stable severity ladder and trend copy are easier for non-technical users to scan quickly during rain events than raw gauge language or a flat `Safe` summary.
  - Google polygon coverage is valuable when present, but it should remain a best-effort enhancement inside the sheet rather than a requirement to understand the main flood result.

## 2026-04 Home Uses A Compact Weather Preview Instead Of Another Header Action

- Decision:
  - Fill the freed left side of the Home sheet header with a compact, non-tappable current-weather preview beside `Share Live` / `Pause Live`.
  - Keep the floating `Weather` CTA as the only entry point to the full Weather sheet.
  - Reuse the same weather-code labels, icons, and temperature formatting in both the Home preview and the dedicated Weather sheet.
- Why:
  - The top Home header row had enough space after removing shared-status controls, and a local weather glance is more useful there than another action.
  - Keeping the preview informational avoids creating two competing ways to open weather details from the same screen.
  - Shared weather presentation helpers reduce drift between the compact Home card and the full Weather sheet over time.

## 2026-03 Icon Reuse Should Stay Within The Same Semantic Family

- Decision:
  - Avoid reusing the exact same icon for clearly different actions in the signed-in shell.
  - Keep generic control icons like `close`, `check`, and chevrons reusable, but separate icons for map focus, live sharing, routing, support, and legal rows.
- Why:
  - Repeated icons with different meanings make the prototype-aligned UI feel ambiguous even when the underlying behavior is correct.
  - The Figma direction relies on clean, readable semantics more than decorative icon variety.

## 2026-04 Universal Dark-Red Theme Tokens

- Decision:
  - Use the profile/settings dark-red family as the shared app theme instead of keeping onboarding on the older coral/pink palette.
  - Keep onboarding layouts and flows intact while updating shared tokens, auth building blocks, and touched shared consumers to the same color system.
- Why:
  - The split onboarding-vs-signed-in palette made the product feel visually inconsistent.
  - A single dark-red accent family is easier to maintain across buttons, icons, chips, dividers, and supporting surfaces.

## 2026-04 Appearance Controls The Real App-Wide Theme

- Decision:
  - Treat `Light`, `Dark`, and `System` in Appearance as the real runtime theme controller for the app instead of a mostly decorative saved preference.
  - Resolve signed-in theme from `profile.preferences.theme`, fall back to system when the preference is `system`, and let signed-out/onboarding routes follow the device scheme by default.
  - Use one shared semantic token set for light and dark so root shell surfaces, status bar, onboarding/auth, Home map chrome, Hotlines, SOS, Notifications, and the signed-in settings stack all inherit the same runtime theme source.
- Why:
  - A saved appearance preference that only affects a few screens creates a broken-feeling product and makes the settings screen untrustworthy.
  - One semantic theme layer is easier to maintain than one-off dark patches and keeps the rounded emergency-first UI consistent across all major flows.

## 2026-03 Home Map Uses A Soft Pastel Palette And Stays Mounted Across Tabs

- Decision:
  - Re-theme the Home map with branded soft-pastel light and dark styles.
  - Replace the native Google title bubble with a custom current-user name tag.
  - Keep the Home tab mounted instead of detaching it while other tabs are active.
- Why:
  - The default Google marker bubble looks out of place beside the rest of the prototype styling.
  - A softer map palette matches the product direction better than the previous neutral map treatment.
  - Keeping Home mounted avoids the visible redraw/reset feeling when returning from other tabs.

## 2026-03 Home Sheet Prioritizes Scrollable Content Capacity

- Decision:
  - Let the Home summary controls scroll away and use a list-driven bottom sheet layout instead of a nested scroll view layout.
  - Raise the top snap point so long contact and circle-heavy groups remain reachable on smaller Android phones.
- Why:
  - The larger hero spacing and nested scroll layout hid lower contact rows once the sheet was expanded.
  - The Home screen needs to scale to users with many group members and many circles without trapping the list behind oversized header content.

## 2026-03 Avatar Uploads Use Owner-Scoped Firebase Storage Paths

- Decision:
  - Store profile photos under `avatars/{userId}/{timestamp}.jpg` and restrict writes to the owning authenticated user.
- Why:
  - It keeps avatar upload simple, matches the current profile data model, and avoids broad write access across the shared bucket.

## 2026-03 HTTP Routes Require Firebase Auth

- Decision:
  - Require Firebase bearer auth for HTTP Cloud Functions such as route proxying and manual disaster-alert sync.
- Why:
  - These endpoints expose backend capability outside Firestore rules and should not remain public once the app already has authenticated Firebase sessions available.

## 2026-03 HTTP Routes Use Fixed-Window Rate Limits

- Decision:
  - Apply Firestore-backed fixed-window rate limits to authenticated HTTP routes, with IP fallback for unauthenticated or invalid-auth requests.
- Why:
  - It provides practical abuse protection for high-value HTTP routes without introducing a second infrastructure dependency.
