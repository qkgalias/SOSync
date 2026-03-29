/** Purpose: Lock the backend-mode and host selection rules for live, demo, and emulator testing. */
import {
  parseDevelopmentHost,
  resolveBackendMode,
  resolveFirebaseClientMode,
  resolveFirebaseEmulatorHost,
} from "@/config/backendRuntime";

describe("backendRuntime host helpers", () => {
  it("treats real projects with emulators disabled as live mode", () => {
    expect(
      resolveBackendMode({
        appEnv: "development",
        firebaseProjectId: "sosync-3276e",
        useFirebaseEmulators: false,
      }),
    ).toBe("live");
  });

  it("treats real projects with emulators enabled as emulator mode", () => {
    expect(
      resolveBackendMode({
        appEnv: "development",
        firebaseProjectId: "sosync-3276e",
        useFirebaseEmulators: true,
      }),
    ).toBe("emulator");
  });

  it("treats explicit demo app env as demo mode", () => {
    expect(
      resolveBackendMode({
        appEnv: "demo",
        firebaseProjectId: "sosync-3276e",
        useFirebaseEmulators: false,
      }),
    ).toBe("demo");
  });

  it("treats the demo project id as demo mode", () => {
    expect(
      resolveBackendMode({
        appEnv: "development",
        firebaseProjectId: "demo-sosync",
        useFirebaseEmulators: false,
      }),
    ).toBe("demo");
  });

  it("allows demo fallback only in demo mode", () => {
    expect(
      resolveFirebaseClientMode({
        backendMode: "demo",
        hasNativeFirebaseApp: false,
      }),
    ).toBe("demo");
  });

  it("keeps using Firebase when the native app is configured", () => {
    expect(
      resolveFirebaseClientMode({
        backendMode: "live",
        hasNativeFirebaseApp: true,
      }),
    ).toBe("firebase");
  });

  it("throws when live mode has no native Firebase app", () => {
    expect(() =>
      resolveFirebaseClientMode({
        backendMode: "live",
        hasNativeFirebaseApp: false,
      }),
    ).toThrow("live Firebase project");
  });

  it("throws when emulator mode has no native Firebase app", () => {
    expect(() =>
      resolveFirebaseClientMode({
        backendMode: "emulator",
        hasNativeFirebaseApp: false,
      }),
    ).toThrow("emulator mode");
  });

  it("extracts the host from a Metro bundle URL", () => {
    expect(parseDevelopmentHost("http://192.168.1.23:8081/index.bundle?platform=android")).toBe("192.168.1.23");
  });

  it("prefers the Android emulator loopback alias when running on an emulator", () => {
    expect(
      resolveFirebaseEmulatorHost({
        platform: "android",
        isPhysicalDevice: false,
      }),
    ).toBe("10.0.2.2");
  });

  it("keeps localhost for the iOS simulator", () => {
    expect(
      resolveFirebaseEmulatorHost({
        platform: "ios",
        isPhysicalDevice: false,
      }),
    ).toBe("127.0.0.1");
  });

  it("uses an explicit override before any inferred host", () => {
    expect(
      resolveFirebaseEmulatorHost({
        overrideHost: "192.168.1.44",
        platform: "android",
        isPhysicalDevice: true,
        scriptURL: "http://192.168.1.23:8081/index.bundle?platform=android",
      }),
    ).toBe("192.168.1.44");
  });

  it("falls back to the Metro host for physical devices", () => {
    expect(
      resolveFirebaseEmulatorHost({
        platform: "android",
        isPhysicalDevice: true,
        scriptURL: "http://192.168.1.23:8081/index.bundle?platform=android",
      }),
    ).toBe("192.168.1.23");
  });
});
