# Release Hardening Checklist

This checklist tracks the pre-release work that remains after the current Android live-device core flow was mostly validated.

## Backend Readiness

- Run `npm run doctor:backend-release`.
- Deploy with `npm run firebase:deploy:backend`.
- Confirm Firebase Auth Email/Password is enabled.
- Confirm the default Firebase Storage bucket exists.
- Confirm `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and the public brand asset URL are configured.
- Confirm Google Maps Android restrictions allow `com.sosync.mobile` for debug and release SHA1 fingerprints.
- Confirm Firestore indexes are serving, especially the `members.userId` collection-group index.

## Data Readiness

- Run `npm run backfill:circle-codes` after backend deploy.
- Run `npm run audit:circle-data`.
- Fix every reported circle before release.
- Keep legacy `primaryContactIds` tolerated only as data compatibility; trusted-circle membership is the current surfaced model.
- Keep phone sign-in as a compatibility redirect only.
- Keep the route proxy dormant unless a non-Navigation-SDK fallback returns to product scope.

## Safety Data Readiness

- Validate scheduled and manual disaster alert sync for groups with live member locations.
- Confirm alert documents include coordinates, location basis, location confidence, source provider, forecast window, and generated time.
- Validate flood/weather sheets in Talisay City/Cebu, a known covered area, a no-coverage area, denied location, paused sharing, stale location, and rate-limit states.
- Keep personal flood risk out of Firestore `alerts` and circle push fanout for this release.

## Support And Legal Readiness

- Publish hosted Privacy Policy and Terms pages at the URLs linked from the app.
- Validate `submitSupportRequest` and `submitProblemReport` after Functions deploy.
- Validate report media upload under `supportReports/{userId}/{reportId}/...`.
- Confirm `support_reports` is readable in Firebase Console or the chosen admin review workflow.
- Keep email fallback working for support and report flows.

## Theme And Home Map Readiness

- Test Light, Dark, and System on onboarding, Home, Hotlines, SOS, Notifications, Profile, Settings, Help, Legal, modals, empty states, loading states, and errors.
- Validate Home on at least one weaker Android device for cold start, tab return, background/foreground, map tile blanking, avatar rendering, location recovery, and sheet performance.
- Treat web Home as a placeholder fallback, not native map proof.
