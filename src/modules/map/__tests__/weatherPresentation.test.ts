/** Purpose: Keep Home and Weather sheet weather presentation helpers consistent. */
import {
  formatHomeWeatherHeadline,
  formatTemperature,
  getWeatherCodeLabel,
  getWeatherIconName,
  resolveHomeWeatherLocationLabel,
  resolveHomeWeatherPreview,
} from "@/modules/map/weatherPresentation";

describe("weatherPresentation", () => {
  it("formats temperatures as rounded degree values", () => {
    expect(formatTemperature(29.4)).toBe("29°");
    expect(formatTemperature(29.6)).toBe("30°");
    expect(formatTemperature(undefined)).toBe("--");
  });

  it("maps weather codes to user-facing labels", () => {
    expect(getWeatherCodeLabel(undefined)).toBe("Weather");
    expect(getWeatherCodeLabel(0)).toBe("Clear");
    expect(getWeatherCodeLabel(2)).toBe("Clear");
    expect(getWeatherCodeLabel(3)).toBe("Cloudy");
    expect(getWeatherCodeLabel(55)).toBe("Drizzle");
    expect(getWeatherCodeLabel(63)).toBe("Rain");
    expect(getWeatherCodeLabel(81)).toBe("Showers");
    expect(getWeatherCodeLabel(96)).toBe("Thunderstorm");
  });

  it("maps weather codes to stable icon names", () => {
    expect(getWeatherIconName(undefined)).toBe("weather-partly-cloudy");
    expect(getWeatherIconName(0)).toBe("weather-sunny");
    expect(getWeatherIconName(1)).toBe("weather-partly-cloudy");
    expect(getWeatherIconName(3)).toBe("weather-cloudy");
    expect(getWeatherIconName(45)).toBe("weather-fog");
    expect(getWeatherIconName(61)).toBe("weather-rainy");
    expect(getWeatherIconName(80)).toBe("weather-pouring");
    expect(getWeatherIconName(95)).toBe("weather-lightning-rainy");
  });

  it("formats compact Home weather headlines", () => {
    expect(formatHomeWeatherHeadline({ temperatureC: 29.4, weatherCode: 3 })).toBe("29° Cloudy");
    expect(formatHomeWeatherHeadline({ weatherCode: 95 })).toBe("Thunderstorm");
    expect(formatHomeWeatherHeadline({ temperatureC: 31.2 })).toBe("31°");
    expect(formatHomeWeatherHeadline({})).toBe("Weather");
  });

  it("prefers a short locality label for the Home weather preview", () => {
    expect(
      resolveHomeWeatherLocationLabel({
        apiLocationLabel: "Quezon City",
        fallback: "Getting current conditions",
        reverseGeocodedLocality: "Metro Manila",
      }),
    ).toBe("Quezon City");

    expect(
      resolveHomeWeatherLocationLabel({
        apiLocationLabel: " ",
        fallback: "Getting current conditions",
        reverseGeocodedLocality: "Cebu",
      }),
    ).toBe("Cebu");

    expect(
      resolveHomeWeatherLocationLabel({
        fallback: "Getting current conditions",
        reverseGeocodedLocality: null,
      }),
    ).toBe("Getting current conditions");
  });

  it("hides cached weather data when location sharing is off", () => {
    const preview = resolveHomeWeatherPreview({
      floodRisk: {
        currentWeather: {
          feelsLikeC: 31,
          temperatureC: 29,
          time: "2026-04-27T08:00:00.000Z",
          weatherCode: 3,
        },
        flood: {
          hero: {
            badgeLabel: "LOW",
            safetyMessage: "No elevated flood signal right now.",
            summary: "No elevated flood signal right now.",
            title: "No elevated flood signal right now",
            trend: "stable",
            trendLabel: "Steady",
          },
          level: "SAFE",
          map: null,
          measurement: null,
          nearbyPoints: [],
          primaryPoint: null,
          state: "ready",
          updatedAt: "2026-04-27T08:00:00.000Z",
        },
        location: {
          label: "Talisay",
          latitude: 10.25,
          localityLabel: "Talisay",
          longitude: 123.84,
        },
        weatherDaily: [],
        weatherHourly: [],
      },
      floodRiskStatus: "success",
      isLocationSharingEnabled: false,
      permissionStatus: "granted",
      reverseGeocodedLocality: "Talisay",
    });

    expect(preview).toEqual({
      headlineText: "Location is off",
      locationText: "Turn on location to see weather",
      variant: "permission",
    });
  });
});
