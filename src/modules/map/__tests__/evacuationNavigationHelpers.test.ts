import { formatNavigationRetryAfter } from "@/modules/map/evacuationNavigationHelpers";

describe("evacuation navigation helpers", () => {
  it("formats short retry waits in seconds", () => {
    expect(formatNavigationRetryAfter(5)).toBe(
      "Too many navigation attempts. Try again in 5 sec.",
    );
  });

  it("formats longer retry waits in minutes and seconds", () => {
    expect(formatNavigationRetryAfter(125)).toBe(
      "Too many navigation attempts. Try again in 2 min 5 sec.",
    );
  });

  it("falls back to a generic message when the wait time is missing", () => {
    expect(formatNavigationRetryAfter()).toBe(
      "Too many navigation attempts. Try again shortly.",
    );
  });
});
