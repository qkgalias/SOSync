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

## Local Admin Script Auth

Live Firestore seed scripts require one of:

- `gcloud auth application-default login`
- `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`

## Firestore Collections In Use

- `users`
- `users/{userId}/pushTokens`
- `groups`
- `groups/{groupId}/members`
- `email_verifications`
- `locations`
- `alerts`
- `sos_events`
- `evacuation_centers`
- `emergency_hotlines`

## Current Push Posture

- Android remote push is the active path.
- iOS remote push is deferred until Apple Developer + APNs configuration is available.

## Release Contract

- Production builds should keep `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false`.
- Production builds should target the same Firebase project ID: `sosync-3276e`.
- Native Firebase app files stay out of git and should be injected through secure EAS build configuration.
- Backend deploys should update Functions, Firestore rules, and Firestore indexes together.
- Deploy the public `branding/brand-mark-transparent.png` asset to Firebase Storage if `RESEND_BRAND_LOGO_URL` is not set explicitly.
