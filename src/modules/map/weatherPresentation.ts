/** Purpose: Share weather labels, icons, and temperature formatting across Home weather surfaces. */
import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type WeatherIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export const formatTemperature = (value?: number) =>
  Number.isFinite(value) ? `${Math.round(Number(value))}°` : "--";

export const formatHomeWeatherHeadline = (input: {
  temperatureC?: number;
  weatherCode?: number;
}) => {
  const formattedTemperature = Number.isFinite(input.temperatureC)
    ? formatTemperature(input.temperatureC)
    : null;
  const weatherLabel = input.weatherCode === undefined
    ? null
    : getWeatherCodeLabel(input.weatherCode);

  if (formattedTemperature && weatherLabel) {
    return `${formattedTemperature} ${weatherLabel}`;
  }

  return formattedTemperature ?? weatherLabel ?? "Weather";
};

export const resolveHomeWeatherLocationLabel = (input: {
  apiLocationLabel?: string | null;
  fallback: string;
  reverseGeocodedLocality?: string | null;
}) =>
  input.apiLocationLabel?.trim() ||
  input.reverseGeocodedLocality?.trim() ||
  input.fallback;

export const getWeatherCodeLabel = (code?: number) => {
  if (code === undefined) {
    return "Weather";
  }
  if (code >= 95) {
    return "Thunderstorm";
  }
  if (code >= 80) {
    return "Showers";
  }
  if (code >= 61) {
    return "Rain";
  }
  if (code >= 51) {
    return "Drizzle";
  }
  if (code >= 45) {
    return "Fog";
  }
  if (code >= 3) {
    return "Cloudy";
  }
  return "Clear";
};

export const getWeatherIconName = (code?: number): WeatherIconName => {
  if (code === undefined) {
    return "weather-partly-cloudy";
  }
  if (code >= 95) {
    return "weather-lightning-rainy";
  }
  if (code >= 80) {
    return "weather-pouring";
  }
  if (code >= 61) {
    return "weather-rainy";
  }
  if (code >= 45) {
    return "weather-fog";
  }
  if (code >= 3) {
    return "weather-cloudy";
  }
  if (code >= 1) {
    return "weather-partly-cloudy";
  }
  return "weather-sunny";
};
