/** Purpose: Verify About screen build/runtime labels stay user-friendly across build profiles. */
let mockAppEnv = "development";
let mockExpoConfig: Record<string, any> = {};
let mockNativeBuildVersion: string | null = null;
let mockNativeAppVersion: string | null = null;

jest.mock("@/config/env", () => ({
  env: {
    get appEnv() {
      return mockAppEnv;
    },
  },
}));

jest.mock("expo-constants", () => ({
  get expoConfig() {
    return mockExpoConfig;
  },
  get nativeAppVersion() {
    return mockNativeAppVersion;
  },
  get nativeBuildVersion() {
    return mockNativeBuildVersion;
  },
}));

import {
  getResolvedAppVersion,
  getResolvedBuildLabel,
  getResolvedRuntimeLabel,
} from "@/modules/settings/helpAboutUtils";

describe("helpAboutUtils", () => {
  beforeEach(() => {
    mockAppEnv = "development";
    mockExpoConfig = {};
    mockNativeAppVersion = null;
    mockNativeBuildVersion = null;
  });

  it("resolves preview EAS labels when no native build number is available", () => {
    mockAppEnv = "preview";

    expect(getResolvedBuildLabel()).toBe("EAS Preview Build");
    expect(getResolvedRuntimeLabel()).toBe("EAS preview runtime");
  });

  it("resolves production EAS labels when no native build number is available", () => {
    mockAppEnv = "production";

    expect(getResolvedBuildLabel()).toBe("EAS Production Build");
    expect(getResolvedRuntimeLabel()).toBe("EAS production runtime");
  });

  it("resolves development labels without exposing dev-client or raw runtime wording", () => {
    mockAppEnv = "development";

    expect(getResolvedBuildLabel()).toBe("Development Build");
    expect(getResolvedRuntimeLabel()).toBe("Development runtime");
  });

  it("prefers native build and configured version values when available", () => {
    mockAppEnv = "preview";
    mockExpoConfig = { version: "1.2.3" };
    mockNativeBuildVersion = "42";

    expect(getResolvedAppVersion()).toBe("1.2.3");
    expect(getResolvedBuildLabel()).toBe("42");
    expect(getResolvedRuntimeLabel()).toBe("EAS preview runtime");
  });

  it("falls back to configured native build values before profile labels", () => {
    mockAppEnv = "preview";
    mockExpoConfig = {
      android: {
        versionCode: 7,
      },
    };

    expect(getResolvedBuildLabel()).toBe("7");
  });
});
