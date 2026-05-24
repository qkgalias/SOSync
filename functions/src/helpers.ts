/** Purpose: Reuse backend data shaping helpers across alert and notification functions. */
type AlertSeverity = "advisory" | "watch" | "warning" | "critical";
type OpenMeteoAlertMetricsInput = {
  current?: {
    temperature_2m?: unknown;
    wind_gusts_10m?: unknown;
    wind_speed_10m?: unknown;
  };
  hourly?: {
    precipitation?: unknown[];
    precipitation_probability?: unknown[];
    temperature_2m?: unknown[];
    time?: string[];
    uv_index?: unknown[];
    wind_gusts_10m?: unknown[];
    wind_speed_10m?: unknown[];
  };
};

export const nowIso = () => new Date().toISOString();

export const toAlertSeverity = (rainfallMm: number): AlertSeverity => {
  if (rainfallMm >= 40) {
    return "critical";
  }
  if (rainfallMm >= 25) {
    return "warning";
  }
  if (rainfallMm >= 12) {
    return "watch";
  }
  return "advisory";
};

export const toAlertType = (rainfallMm: number) => (rainfallMm >= 20 ? "flood" : "storm");

export const buildActiveAlertId = (groupId: string, type: string, severity: string, forecastStart: string) => {
  const forecastDay = forecastStart.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return `${groupId}_${type}_${severity}_${forecastDay}`.replace(/[^A-Za-z0-9_-]/g, "-");
};

const toFiniteNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

const roundMetric = (value: unknown, precision = 0) => {
  const numberValue = toFiniteNumber(value);
  if (numberValue === undefined) {
    return undefined;
  }

  const multiplier = 10 ** precision;
  return Math.round(numberValue * multiplier) / multiplier;
};

const maxFinite = (values: unknown[] = []) => {
  const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return numbers.length ? Math.max(...numbers) : undefined;
};

const getPeakRainfallIndex = (rainfallSeries: unknown[] = []) => {
  let peakIndex = -1;
  let peakValue = Number.NEGATIVE_INFINITY;
  rainfallSeries.forEach((value, index) => {
    const rainfall = toFiniteNumber(value);
    if (rainfall !== undefined && rainfall > peakValue) {
      peakValue = rainfall;
      peakIndex = index;
    }
  });

  return peakIndex;
};

const addHoursToOpenMeteoTime = (value?: string, hours = 1) => {
  if (!value) {
    return undefined;
  }

  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return undefined;
  }

  const date = new Date(`${value}:00+08:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  date.setHours(date.getHours() + hours);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Manila",
    year: "numeric",
  });

  return formatter.format(date).replace(" ", "T");
};

export const extractOpenMeteoAlertMetrics = (forecastData: OpenMeteoAlertMetricsInput) => {
  const hourly = forecastData.hourly ?? {};
  const rainfallSeries = hourly.precipitation ?? [];
  const peakRainfallIndex = getPeakRainfallIndex(rainfallSeries);
  const peakRiskStart = peakRainfallIndex >= 0 ? hourly.time?.[peakRainfallIndex] : undefined;

  return {
    peakRainfallIndex,
    peakRiskEnd: addHoursToOpenMeteoTime(peakRiskStart),
    peakRiskStart,
    rainChancePercent: roundMetric(maxFinite(hourly.precipitation_probability)),
    temperatureC: roundMetric(forecastData.current?.temperature_2m ?? hourly.temperature_2m?.[0]),
    uvIndex: roundMetric(maxFinite(hourly.uv_index), 1),
    windGustKph: roundMetric(maxFinite(hourly.wind_gusts_10m) ?? forecastData.current?.wind_gusts_10m),
    windSpeedKph: roundMetric(maxFinite(hourly.wind_speed_10m) ?? forecastData.current?.wind_speed_10m),
  };
};
