# Roadmap

## Immediate Next

- Run a full Android device smoke test against live Firebase.
- Verify email auth, email OTP verification, profile setup, create/join/later circle onboarding, map rendering, SOS dispatch, alert sync, and Android push.
- Verify the Android production EAS path against the same live Firebase backend.

## Near-Term Hardening

- Tighten Firestore rules and backend auth assumptions before broader rollout.
- Improve alert generation so geography is not shared PH-wide across all groups.
- Add or document emulator seed data for isolated local debugging.
- Clarify or remove message notification expectations until a real messages feature exists.
- Add more operational tests around functions and rules.

## Later Platform Completion

- Decide the iOS map strategy before regenerating `ios/`.
- Regenerate the iOS native folder only when that strategy is settled.
- Complete Apple Developer and APNs setup when budget allows.
- Validate iOS remote push after APNs is configured.
