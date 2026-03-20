# Testing

## Static Validation

Run these first:

```bash
npm run typecheck
npm test
npm --prefix functions run build
```

These checks confirm that the app TypeScript, current Jest suite, and Functions TypeScript all compile cleanly.

## Android Smoke Test

Current target platform for realistic validation:

Android prerequisites:

- Android SDK installed locally.
- Either `ANDROID_HOME` / `ANDROID_SDK_ROOT` is set, or `android/local.properties` points at your SDK path.

```bash
npm run android
```

What to verify once emulator/live Firebase switching is fixed:

- splash and onboarding routing
- email sign-in/sign-up
- phone auth
- profile setup
- circle creation
- invite generation
- location permission flow
- map rendering
- evacuation route preview
- SOS event creation
- alert feed rendering
- Android push receipt and tap routing

## Firebase Emulator Path

Local emulator suite:

```bash
npm run firebase:emulators
```

Rules test when the Firestore emulator is available:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test
```

Important:
- emulator-backed app testing is currently misleading because the app forces emulator connections automatically in `__DEV__`
- physical Android devices cannot use `127.0.0.1` to reach your Mac
- Android emulator host mapping also needs explicit handling

## iOS Validation Limits

What is not currently realistic on iOS:

- native smoke testing, because the generated `ios/` folder has been removed
- remote push testing, because APNs is not configured
- end-to-end iOS notification delivery

When iOS work resumes:
- choose the iOS map strategy first
- regenerate `ios/`
- then restore native validation
