/** Purpose: Verify location-scoped evacuation centers and route normalization stay deterministic. */
import {
  filterNearbyEvacuationCenters,
  mapTravelModeToGoogle,
  normalizeGoogleRoute,
  resolveNearbyEvacuationCenter,
} from "../functions/src/routeHelpers";

const centers = [
  {
    centerId: "manila-1",
    latitude: 14.6042,
    longitude: 120.9822,
    name: "Manila City Hall Evacuation Center",
    serviceRadiusKm: 35,
  },
  {
    centerId: "talisay-1",
    latitude: 10.2597,
    longitude: 123.8494,
    name: "Talisay City Sports Complex Evacuation Center",
    serviceRadiusKm: 35,
  },
];

describe("evacuation routing helpers", () => {
  it("hides Manila centers for Visayas coordinates", () => {
    const result = filterNearbyEvacuationCenters(centers, {
      latitude: 10.2635,
      longitude: 123.8395,
    });

    expect(result.map((center) => center.centerId)).toEqual(["talisay-1"]);
  });

  it("returns Manila centers for Manila coordinates", () => {
    const result = filterNearbyEvacuationCenters(centers, {
      latitude: 14.5995,
      longitude: 120.9842,
    });

    expect(result.map((center) => center.centerId)).toEqual(["manila-1"]);
  });

  it("excludes disabled centers even when they are inside the service radius", () => {
    const result = filterNearbyEvacuationCenters(
      [
        ...centers,
        {
          centerId: "disabled-nearby",
          disabled: true,
          latitude: 14.5996,
          longitude: 120.9843,
          name: "Disabled Nearby Center",
          serviceRadiusKm: 35,
        },
      ],
      {
        latitude: 14.5995,
        longitude: 120.9842,
      },
    );

    expect(result.map((center) => center.centerId)).toEqual(["manila-1"]);
  });

  it("accepts a chosen center only when it is still nearby and matches the submitted destination", () => {
    const matchedCenter = resolveNearbyEvacuationCenter(centers, {
      centerId: "talisay-1",
      destination: {
        latitude: 10.2597,
        longitude: 123.8494,
      },
      origin: {
        latitude: 10.2635,
        longitude: 123.8395,
      },
    });

    expect(matchedCenter?.centerId).toBe("talisay-1");
    expect(
      resolveNearbyEvacuationCenter(centers, {
        centerId: "manila-1",
        destination: {
          latitude: 14.6042,
          longitude: 120.9822,
        },
        origin: {
          latitude: 10.2635,
          longitude: 123.8395,
        },
      }),
    ).toBeNull();
  });

  it("maps app travel modes to Google Routes API travel modes", () => {
    expect(mapTravelModeToGoogle("walk")).toBe("WALK");
    expect(mapTravelModeToGoogle("two_wheeler")).toBe("TWO_WHEELER");
    expect(mapTravelModeToGoogle("four_wheeler")).toBe("DRIVE");
  });

  it("normalizes route distance, duration, geometry, warnings, and steps", () => {
    const route = normalizeGoogleRoute({
      centerId: "talisay-1",
      googleRoute: {
        distanceMeters: 1280,
        duration: "420s",
        legs: [
          {
            steps: [
              {
                distanceMeters: 300,
                navigationInstruction: { instructions: "Head south" },
                polyline: { encodedPolyline: "abcd" },
                staticDuration: "90s",
              },
            ],
          },
        ],
        polyline: { encodedPolyline: "efgh" },
        warnings: ["Use caution near flooded roads."],
      },
      travelMode: "two_wheeler",
    });

    expect(route).toMatchObject({
      distanceMeters: 1280,
      durationSeconds: 420,
      encodedPolyline: "efgh",
      hasGeometry: true,
      targetCenterId: "talisay-1",
      travelMode: "two_wheeler",
      warnings: ["Use caution near flooded roads."],
    });
    expect(route.steps).toEqual([
      {
        distanceMeters: 300,
        durationSeconds: 90,
        encodedPolyline: "abcd",
        instruction: "Head south",
      },
    ]);
  });
});
