# SOSync

SOSync is a privacy-focused disaster awareness and evacuation app built with Expo Router, React Native, NativeWind, Firebase, and Cloud Functions. The foundation in this repo is structured around trusted circles, scoped location sharing, disaster alerts, evacuation routing, SOS dispatching, and Philippines-first emergency data.

## Read This First

- [AGENTS.md](/Users/karlos/Developer/VScode/SOSync/AGENTS.md)
- [Project Guide](/Users/karlos/Developer/VScode/SOSync/docs/PROJECT_GUIDE.md)
- [Project Status](/Users/karlos/Developer/VScode/SOSync/docs/PROJECT_STATUS.md)
- [Testing](/Users/karlos/Developer/VScode/SOSync/docs/TESTING.md)
- [Daily Testing Cheat Sheet](/Users/karlos/Developer/VScode/SOSync/docs/DAILY_TESTING.md)
- [Known Issues](/Users/karlos/Developer/VScode/SOSync/docs/KNOWN_ISSUES.md)
- [Architecture](/Users/karlos/Developer/VScode/SOSync/docs/ARCHITECTURE.md)
- [Firebase Status](/Users/karlos/Developer/VScode/SOSync/docs/FIREBASE_STATUS.md)
- [Decisions](/Users/karlos/Developer/VScode/SOSync/docs/DECISIONS.md)
- [Roadmap](/Users/karlos/Developer/VScode/SOSync/docs/ROADMAP.md)

## Stack

- App runtime: Node `24.14.0`
- Functions runtime: Node `22`
- Mobile framework: Expo SDK `55`, React Native `0.83.2`, Expo Router
- Styling: NativeWind
- Backend: Firebase Auth, Firestore, Cloud Messaging, Cloud Functions
- Maps and location: `react-native-maps`, `expo-location`
- External APIs: Google Directions API, Open-Meteo, Google Flood Forecasting API

## Project structure

```text
app/                    Expo Router route files
src/components/         Reusable UI primitives
src/config/             Runtime config and app defaults
src/hooks/              Screen-facing hooks
src/modules/            Feature modules and screen implementations
src/providers/          Root app providers
src/services/           Firebase, location, notification, and API services
src/types/              Shared domain contracts
src/utils/              Validators, helpers, and seed constants
functions/              Firebase Cloud Functions workspace
```

## Local setup

1. Use Node `24.14.0` at the repo root and Node `22` inside [`functions/package.json`](/Users/karlos/Developer/VScode/SOSync/functions/package.json).
2. Copy `.env.example` to `.env` and provide:
   - `EXPO_PUBLIC_APP_ENV`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `EXPO_PUBLIC_USE_FIREBASE_EMULATORS`
   - `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` when running emulators from a physical device
   - `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`
   - `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - `ANDROID_GOOGLE_SERVICES_FILE`
   - `IOS_GOOGLE_SERVICES_FILE`
3. Add `google-services.json` and `GoogleService-Info.plist` locally. They are intentionally gitignored.
4. Install missing local tooling if needed: `eas-cli`, `firebase-tools`, and `watchman`.
5. Use a development build, not Expo Go, because the app depends on native Firebase and map modules.
6. Create the default Cloud Firestore database in the Firebase console before live testing.
7. Check the Android live-Firebase setup:

```bash
npm run doctor:android-live
```

8. Seed live Firestore data needed by Home, SOS, and Hotlines:

```bash
npm run seed:live-data
```

9. Run the app:

```bash
npm run android
```

When you are validating on an Android emulator and want the repo to bootstrap the Expo dev client, use:

```bash
npm run qa:android-emulator
```

If native Firebase config is missing while you are in live or emulator mode, the app now surfaces an explicit configuration error instead of silently falling back to demo data.

Physical Android first install:

- For a brand-new phone, QR alone is not enough.
- Install the SOSync development build once over USB first.
- Enable `Developer options` and `USB debugging` on the phone.
- Connect the phone by USB and confirm it appears in `adb devices` as `device`.
- Start Metro with `npm run start:clear`.
- In another terminal run `npm run android` to install the development build onto the phone.
- After the first install, you can usually reopen the installed SOSync dev client from the Metro QR/server link while the phone and laptop are on the same Wi-Fi.
- Do not use Expo Go for this project.

10. After you create a circle, create one manual alert for your new `groupId` when you want to test the Alerts tab deterministically:

```bash
npm run seed:live-alert -- --groupId=<your-group-id>
```

11. Run the backend workspace when you need Cloud Functions locally:

```bash
npm --prefix functions run build
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true npm run firebase:emulators
```

Default backend mode:

- `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false` sends app traffic to the live Firebase project and deployed Cloud Functions
- `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` switches Firebase SDK traffic and Functions HTTP traffic together
- `EXPO_PUBLIC_APP_ENV=demo` or `EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-sosync` is the only supported path for seed/mock fallback behavior
- Android emulators use `10.0.2.2` automatically, iOS simulators use `127.0.0.1`, and physical devices should set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` to the Mac LAN IP
- Live Firestore seed scripts require either `gcloud auth application-default login` or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service-account JSON with Firestore access
- `npm run seed:live-data` and `npm run seed:live-alert` are live-project utilities and intentionally reject `FIRESTORE_EMULATOR_HOST`

Secondary local-isolated path:

- Emulator mode is still supported for rules tests and isolated local debugging.
- It is no longer the default or recommended day-to-day smoke-test path.

## Production Path

Use the same live Firebase project for development and the initial production rollout.

Canonical backend deploy path:

```bash
npm run firebase:deploy:backend
```

This deploys:
- Cloud Functions
- Firestore rules
- Firestore indexes

`firebase.json` now builds the Functions workspace automatically before deploy, so production deploys do not depend on remembering a separate manual Functions build step.

Canonical Android release path:

```bash
npm run eas:build:android:production
```

Optional Android store submission path:

```bash
npm run eas:submit:android:production
```

### EAS build requirements

Production and preview builds use the same live Firebase project defaults through `eas.json`.

Keep these out of git and provide them to EAS securely:
- `ANDROID_GOOGLE_SERVICES_FILE`
- `IOS_GOOGLE_SERVICES_FILE`

Provide these non-secret env values to EAS as well:
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID=sosync-3276e`
- `EXPO_PUBLIC_FUNCTIONS_REGION=asia-southeast1`
- `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false`

Release-readiness checklist:
- Firebase Auth providers enabled
- default Cloud Firestore database created
- deployed Cloud Functions current
- Firestore rules and indexes current
- native Firebase config files available to EAS securely
- Android signing and Play Store delivery configured
- APNs deferred until iOS remote push work resumes

## App commands

```bash
npm run start
npm run ios
npm run android
npm run qa:android-emulator
npm run doctor:android-live
npm run seed:live-data
npm run seed:live-alert -- --groupId=<your-group-id>
npm run typecheck
npm test
npm run functions:build
npm run firebase:deploy:backend
npm run eas:build:android:preview
npm run eas:build:android:production
```

## Context Notes

- Android is the active validation platform.
- iOS remains in the codebase but native regeneration and APNs-backed push are deferred.
- For current project reality, blockers, and next steps, prefer the docs listed above over inferring status from old chat context.
