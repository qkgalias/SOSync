# Roadmap

## Immediate Next

- Deploy the Android V1 backend/ops surface: Functions, Firestore rules/indexes, Storage rules, and Firebase Hosting.
- Assign the first `sosyncRole=super_admin`, verify admin sign-out/sign-in refresh, and smoke test admin content/report workflows.
- Run live data readiness: circle-code backfill, circle-data audit, and any required legacy data fixes.
- Build an Android EAS preview artifact and smoke test it against live Firebase before the production artifact.

## Near-Term Hardening

- Improve alert generation so geography is not shared PH-wide across all groups.
- Add or document emulator seed data for isolated local debugging.
- Add more operational tests around functions and rules.
- Deepen Android device coverage for Home map reliability, flood/weather, theme consistency, and lower-end hardware performance.

## Later Platform Completion

- Decide the iOS map strategy before regenerating `ios/`.
- Regenerate the iOS native folder only when that strategy is settled.
- Complete Apple Developer and APNs setup when budget allows.
- Validate iOS remote push after APNs is configured.
