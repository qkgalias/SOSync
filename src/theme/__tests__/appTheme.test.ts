import {
  DARK_THEME_TOKENS,
  LIGHT_THEME_TOKENS,
  getThemeTokens,
  resolveThemePreference,
} from "@/theme/appTheme";

describe("appTheme", () => {
  it("resolves a saved dark preference", () => {
    expect(resolveThemePreference("dark", "light")).toBe("dark");
  });

  it("resolves a saved light preference", () => {
    expect(resolveThemePreference("light", "dark")).toBe("light");
  });

  it("resolves system preference to device dark", () => {
    expect(resolveThemePreference("system", "dark")).toBe("dark");
  });

  it("resolves system preference to device light", () => {
    expect(resolveThemePreference("system", "light")).toBe("light");
  });

  it("falls back to light when system preference is unavailable", () => {
    expect(resolveThemePreference("system", undefined)).toBe("light");
  });

  it("returns the official dark token set", () => {
    expect(getThemeTokens("dark")).toEqual(DARK_THEME_TOKENS);
  });

  it("returns the official light token set", () => {
    expect(getThemeTokens("light")).toEqual(LIGHT_THEME_TOKENS);
  });
});
