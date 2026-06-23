import { filterHotlines } from "../utils";
import { formatCityArea, resolveHotlineCityArea } from "./hotlineHelpers";

describe("hotlineHelpers", () => {
  it("formats and resolves city/area text for the admin hotline editor", () => {
    expect(formatCityArea("  talisay city  ")).toBe("Talisay City");
    expect(
      resolveHotlineCityArea({
        cityArea: "  Cebu City  ",
        hotlineId: "hotline-1",
        name: "Hotline",
        region: "PH",
      }),
    ).toBe("Cebu City");
  });

  it("keeps city/area searchable in admin hotline filters", () => {
    const results = filterHotlines(
      [
        {
          cityArea: "Talisay",
          hotlineId: "hotline-1",
          name: "City Hotline",
          phone: "12345",
          region: "PH",
        },
      ],
      "talisay",
    );

    expect(results).toHaveLength(1);
  });
});
