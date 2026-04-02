/** Purpose: Centralize backend runtime settings and secret bindings for Cloud Functions. */
import { defineSecret, defineString, storageBucket } from "firebase-functions/params";

export const functionsRegion = "asia-southeast1";
export const openMeteoForecastUrl = "https://api.open-meteo.com/v1/forecast";
export const googleDirectionsApiKey = defineSecret("GOOGLE_MAPS_DIRECTIONS_API_KEY");
export const googleFloodApiKey = defineSecret("GOOGLE_FLOOD_FORECASTING_API_KEY");
export const resendApiKey = defineSecret("RESEND_API_KEY");
export const resendFromEmail = defineString("RESEND_FROM_EMAIL", { default: "" });
export const resendBrandLogoUrl = defineString("RESEND_BRAND_LOGO_URL", { default: "" });
export const defaultBrandLogoUrl = () => {
  const bucket = storageBucket.value();
  if (!bucket) {
    return "";
  }

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/branding%2Fbrand-mark-transparent.png?alt=media`;
};
