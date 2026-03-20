# Firebase Status

## Project

- Firebase project ID: `sosync-3276e`
- Functions region: `asia-southeast1`

## Registered Apps

- Android app:
  - package: `com.sosync.mobile`
- iOS app:
  - bundle ID: `com.sosync.mobile`

## Auth Providers

- Email/Password: enabled
- Phone: enabled

## Expected Secrets And Local Config

Client-side local config:
- `google-services.json`
- `GoogleService-Info.plist`
- `.env`

Client-side env names:
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY`
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `ANDROID_GOOGLE_SERVICES_FILE`
- `IOS_GOOGLE_SERVICES_FILE`

Functions secrets:
- `GOOGLE_MAPS_DIRECTIONS_API_KEY`
- `GOOGLE_FLOOD_FORECASTING_API_KEY`

This file documents names and expected locations only. Do not store secret values here.

## Firestore Collections In Use

- `users`
- `users/{userId}/pushTokens`
- `groups`
- `groups/{groupId}/members`
- `groups/{groupId}/invites`
- `locations`
- `alerts`
- `sos_events`
- `evacuation_centers`
- `emergency_hotlines`

## Current Push Posture

- Android remote push is the active path.
- iOS remote push is deferred until Apple Developer + APNs configuration is available.
