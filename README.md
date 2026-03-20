# SOSync

SOSync is a privacy-focused disaster awareness and evacuation app built with Expo Router, React Native, NativeWind, Firebase, and Cloud Functions. The foundation in this repo is structured around trusted circles, scoped location sharing, disaster alerts, evacuation routing, SOS dispatching, and Philippines-first emergency data.

## Read This First

- [AGENTS.md](/Users/karlos/Developer/VScode/SOSync/AGENTS.md)
- [Project Status](/Users/karlos/Developer/VScode/SOSync/docs/PROJECT_STATUS.md)
- [Testing](/Users/karlos/Developer/VScode/SOSync/docs/TESTING.md)
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
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`
   - `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - `ANDROID_GOOGLE_SERVICES_FILE`
   - `IOS_GOOGLE_SERVICES_FILE`
3. Add `google-services.json` and `GoogleService-Info.plist` locally. They are intentionally gitignored.
4. Install missing local tooling if needed: `eas-cli`, `firebase-tools`, and `watchman`.
5. Run the app in a development build:

```bash
npm run start
```

6. Run the backend workspace when you need Cloud Functions locally:

```bash
npm --prefix functions run build
npm run firebase:emulators
```

## App commands

```bash
npm run start
npm run ios
npm run android
npm run typecheck
npm test
npm run functions:build
```

## Context Notes

- Android is the active validation platform.
- iOS remains in the codebase but native regeneration and APNs-backed push are deferred.
- For current project reality, blockers, and next steps, prefer the docs listed above over inferring status from old chat context.
