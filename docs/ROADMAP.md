# Roadmap

## Immediate Next

- Make Firebase emulator usage opt-in instead of always forced in `__DEV__`.
- Run an Android smoke test against either live Firebase or correctly reachable emulators.
- Verify email auth, phone auth, profile setup, circle creation, invite generation, map rendering, SOS dispatch, alert sync, and Android push.

## Near-Term Hardening

- Tighten Firestore rules, especially around `groups/{groupId}/members` self-write behavior.
- Review backend HTTP functions for stronger auth and membership validation.
- Improve alert generation so geography is not shared PH-wide across all groups.
- Clarify or remove message notification expectations until a real messages feature exists.
- Add more operational tests around functions and rules.

## Later Platform Completion

- Decide the iOS map strategy before regenerating `ios/`.
- Regenerate the iOS native folder only when that strategy is settled.
- Complete Apple Developer and APNs setup when budget allows.
- Validate iOS remote push and real-device phone auth after APNs is configured.
