# Daily Testing Cheat Sheet

Use this file for the shortest path to testing SOSync against the live Firebase project.

## Default Assumption

- Live Firebase project: `sosync-3276e`
- `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false`
- Android is the primary test platform

## One-Time Prerequisites

Make sure these already exist before testing:

- `.env` copied from `.env.example`
- local `google-services.json`
- local `GoogleService-Info.plist`
- Android SDK and emulator or Android device
- Firebase Auth and default Cloud Firestore database configured in the live project
- local admin auth for seed scripts:
  - `gcloud auth application-default login`
  - or `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`

## Normal Local Smoke Test

Run these in order:

```bash
npm run doctor:android-live
npm run seed:live-data
npm run android
```

What this does:

- checks your live Android setup
- seeds hotlines and evacuation centers into the live Firebase project
- installs and runs the Android development build

If the Android emulator opens Expo Dev Launcher instead of the SOSync UI, use:

```bash
npm run qa:android-emulator
```

This command starts Metro on a free port, wires `adb reverse`, opens the dev client, and writes debugging artifacts to `/tmp/sosync-android-emulator-qa/`.

## Optional Confidence Checks

Run these when you changed code and want a clean validation pass:

```bash
npm run typecheck
npm test -- --runInBand
npm --prefix functions run build
```

## Deterministic Alerts Test

After you create a circle, seed one alert for that `groupId`:

```bash
npm run seed:live-alert -- --groupId=<your-group-id>
```

Use this when you want to verify:

- Alerts tab rendering
- alert detail navigation
- live Firestore alert reads

## When You Need A Backend Deploy

Only do this if you changed:

- Cloud Functions
- Firestore rules
- Firestore indexes

```bash
npm run firebase:deploy:backend
```

## When You Need A Production Android Build

This is separate from normal local testing:

```bash
npm run eas:build:android:production
```

Before running it, EAS must already have secure access to:

- `ANDROID_GOOGLE_SERVICES_FILE`
- `IOS_GOOGLE_SERVICES_FILE`
- `EXPO_PUBLIC_EAS_PROJECT_ID`

## Short Version

Daily local test:

```bash
npm run doctor:android-live
npm run seed:live-data
npm run android
```

If you changed code:

```bash
npm run typecheck
npm test -- --runInBand
npm --prefix functions run build
```

If you changed backend:

```bash
npm run firebase:deploy:backend
```

If you need a production Android artifact:

```bash
npm run eas:build:android:production
```
