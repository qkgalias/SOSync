# Firebase Status

## Project

- Firebase project ID: `sosync-3276e`
- Functions region: `asia-southeast1`
- A default Cloud Firestore database must exist in this project for onboarding, circles, SOS, alerts, and hotlines to work.

## Registered Apps

- Android app:
  - package: `com.sosync.mobile`
- iOS app:
  - bundle ID: `com.sosync.mobile`
- Web app:
  - used by the `admin-web/` Firebase Hosting portal
  - configured locally through `admin-web/.env.local`

## Auth Providers

- Email/Password: enabled
- Phone: no longer used by the current app flow

## Expected Secrets And Local Config

Client-side local config:
- `google-services.json`
- `GoogleService-Info.plist`
- `.env`

Client-side env names:
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_USE_FIREBASE_EMULATORS`
- `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST`
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY`
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `ANDROID_GOOGLE_SERVICES_FILE`
- `IOS_GOOGLE_SERVICES_FILE`

Admin web env names:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_GOOGLE_MAPS_BROWSER_API_KEY`
- `VITE_FUNCTIONS_REGION`
- `VITE_USE_FUNCTIONS_EMULATOR`
- `VITE_FUNCTIONS_EMULATOR_HOST`

Functions secrets:
- `GOOGLE_MAPS_DIRECTIONS_API_KEY`
- `GOOGLE_FLOOD_FORECASTING_API_KEY`
- `RESEND_API_KEY`

Functions params:
- `RESEND_FROM_EMAIL`
- `RESEND_BRAND_LOGO_URL`

This file documents names and expected locations only. Do not store secret values here.

Runtime posture:

- Live Firebase is the default development path.
- Emulator mode is supported, but must be enabled explicitly.
- Demo/mock behavior is only allowed when `EXPO_PUBLIC_APP_ENV=demo` or `EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-sosync`.
- Initial production rollout uses the same live Firebase project as development.

## Auth Email Templates

Verification email:

- Sent by Cloud Functions through Resend from the repo-owned template in `functions/src/emailVerification.ts`.
- Uses the SOSync primary dark red `#650B11`.
- Uses a flat white email layout with a soft footer block.
- Keeps the OTP code, 10-minute expiry, resend guidance, and security notice.

Password reset email:

- Sent by Cloud Functions through Resend from the repo-owned template in `functions/src/emailVerification.ts`.
- The function uses Firebase Admin to generate the official password reset link, then wraps that link in a branded SOSync email.
- Uses subject `Reset your SOSync password`.
- Uses the locked main message: `We received a request to reset the password for your SOSync account associated with {email}. Click the button below to create a new password.`
- Shows only the `Reset password` button as the visible reset action; the raw reset URL is not printed in the email body.
- Uses the security notice: `If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.`
- Keeps Firebase's secure hosted reset page for choosing the new password.
- Stores hashed-email cooldown records in `password_reset_requests` so repeated reset requests cannot spam the same address.
- Firebase Console's default Password reset template is no longer the app delivery path after the updated function is deployed.

## Local Admin Script Auth

Live Firestore seed scripts require one of:

- `gcloud auth application-default login`
- `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`

The first admin portal account also needs a Firebase Auth custom claim:

```bash
npm --prefix functions run set:admin-claim -- --email=<admin-email>
```

Supported `sosyncRole` values are `superadmin`, `admin`, and `operator`. Legacy claims are still accepted and normalized by the backend for compatibility. The admin must sign out and sign back in before the new claim appears in their ID token.

## Firestore Collections In Use

- `users`
- `users/{userId}/pushTokens`
- `groups`
- `groups/{groupId}/members`
- `groups/{groupId}/statuses`
- `email_verifications`
- `password_reset_requests`
- `support_reports`
- `locations`
- `alerts`
- `sos_events`
- `evacuation_centers`
- `emergency_hotlines`

## Admin Back Office

- Hosted from `admin-web/dist` through Firebase Hosting.
- Calls custom-claim protected callable Functions in `asia-southeast1`.
- `admin` can manage emergency hotlines, evacuation centers, and support/problem reports.
- `operator` can manage emergency hotlines and evacuation centers.
- `superadmin` can access content workflows, support workflows, admin access management, and audit logs.
- Mobile Firestore rules stay locked down; admin operations go through Cloud Functions.

## Current Push Posture

- Android remote push is the active path.
- iOS remote push is deferred until Apple Developer + APNs configuration is available.

## Release Contract

- Production builds should keep `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false`.
- Production builds should target the same Firebase project ID: `sosync-3276e`.
- Native Firebase app files stay out of git and should be injected through secure EAS build configuration.
- Backend deploys should update Functions, Firestore rules, Firestore indexes, Storage rules, and Hosting together for Android V1.
- Deploy the public `branding/brand-mark-transparent.png` asset to Firebase Storage if `RESEND_BRAND_LOGO_URL` is not set explicitly.
- Run `npm run backfill:circle-codes` and `npm run audit:circle-data` after backend deploy before final Android EAS smoke testing.
