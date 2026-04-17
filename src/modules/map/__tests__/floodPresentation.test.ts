/** Purpose: Keep flood monitoring labels and hero copy readable when metadata is incomplete. */
import {
  buildFloodRiskLadder,
  formatFloodLowConfidenceNote,
  getFloodLevelIconName,
  getFloodTrendIconName,
  getFloodTrendLabel,
  resolveFloodGaugeDisplayLabel,
  shouldRenderFloodHeroTitle,
} from "@/modules/map/floodPresentation";

describe("floodPresentation", () => {
  it("prefers a human-readable site name", () => {
    expect(
      resolveFloodGaugeDisplayLabel({
        distanceLabel: "8.6 km",
        isPrimary: true,
        localityLabel: "Quezon City",
        river: "Pasig River",
        siteName: "Marikina Station",
      }),
    ).toBe("Marikina Station");
  });

  it("falls back to the river name when the site name is missing", () => {
    expect(
      resolveFloodGaugeDisplayLabel({
        distanceLabel: "8.6 km",
        isPrimary: false,
        localityLabel: "Quezon City",
        river: "Pasig River",
        siteName: " ",
      }),
    ).toBe("Pasig River");
  });

  it("uses a locality-based title for unnamed gauges", () => {
    expect(
      resolveFloodGaugeDisplayLabel({
        distanceLabel: "8.6 km",
        isPrimary: true,
        localityLabel: "Quezon City",
      }),
    ).toBe("Monitoring point near Quezon City");

    expect(
      resolveFloodGaugeDisplayLabel({
        distanceLabel: "9.6 km",
        isPrimary: false,
        localityLabel: "Quezon City",
      }),
    ).toBe("Monitoring point near Quezon City • 9.6 km");
  });

  it("uses distance-first fallbacks when no locality is available", () => {
    expect(
      resolveFloodGaugeDisplayLabel({
        distanceLabel: "8.6 km",
        isPrimary: true,
      }),
    ).toBe("Closest monitoring point");

    expect(
      resolveFloodGaugeDisplayLabel({
        distanceLabel: "9.6 km",
        isPrimary: false,
      }),
    ).toBe("Monitoring point 9.6 km away");
  });

  it("hides redundant flood hero titles when the badge already says the same thing", () => {
    expect(
      shouldRenderFloodHeroTitle({
        badgeLabel: "Safe",
        title: "Safe",
      }),
    ).toBe(false);

    expect(
      shouldRenderFloodHeroTitle({
        badgeLabel: "Watch",
        title: "Watch",
      }),
    ).toBe(false);
  });

  it("keeps the flood hero title when it adds more context than the badge", () => {
    expect(
      shouldRenderFloodHeroTitle({
        badgeLabel: "Limited data",
        title: "Coverage found, limited confidence",
      }),
    ).toBe(true);

    expect(
      shouldRenderFloodHeroTitle({
        badgeLabel: "Watch",
        title: "Coverage found, limited confidence",
      }),
    ).toBe(true);
  });

  it("maps flood levels and trends to stable icons and labels", () => {
    expect(getFloodLevelIconName("SAFE")).toBe("shield-check-outline");
    expect(getFloodLevelIconName("DANGER")).toBe("home-flood");
    expect(getFloodTrendLabel("rising")).toBe("Rising");
    expect(getFloodTrendLabel("unknown")).toBe("Trend unavailable");
    expect(getFloodTrendIconName("falling")).toBe("arrow-bottom-right");
  });

  it("only surfaces a low-confidence note when the gauge is not verified", () => {
    expect(
      formatFloodLowConfidenceNote({
        confidenceNote: "Useful nearby model, but confidence is lower because the gauge is not quality verified.",
        isPrimary: true,
        verified: false,
      }),
    ).toBe("Useful nearby model, but confidence is lower because the gauge is not quality verified.");

    expect(
      formatFloodLowConfidenceNote({
        confidenceNote: "Higher confidence from a quality-verified nearby modeled gauge.",
        isPrimary: true,
        verified: true,
      }),
    ).toBeNull();
  });

  it("builds a stable plain-language risk ladder without raw threshold text", () => {
    expect(buildFloodRiskLadder()).toEqual([
      {
        description: "Conditions are changing. Stay alert and check local updates.",
        key: "caution",
        title: "Caution",
      },
      {
        description: "Flood risk is increasing near this area. Prepare to move if needed.",
        key: "warning",
        title: "Warning",
      },
      {
        description: "Flood conditions may affect nearby roads or homes. Be ready to act quickly.",
        key: "danger",
        title: "Danger",
      },
      {
        description: "Severe flood conditions need urgent attention. Follow official instructions immediately.",
        key: "extreme-danger",
        title: "Extreme danger",
      },
    ]);

    expect(JSON.stringify(buildFloodRiskLadder())).not.toContain("cubic_meters_per_second");
  });
});
