/** Purpose: Centralize backend runtime settings and secret bindings for Cloud Functions. */
import { defineSecret } from "firebase-functions/params";

export const functionsRegion = "asia-southeast1";
export const openMeteoForecastUrl = "https://api.open-meteo.com/v1/forecast";
export const googleDirectionsApiKey = defineSecret("GOOGLE_MAPS_DIRECTIONS_API_KEY");
export const googleFloodApiKey = defineSecret("GOOGLE_FLOOD_FORECASTING_API_KEY");
