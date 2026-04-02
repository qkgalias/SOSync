/** Purpose: Proxy evacuation route requests so Google API keys never live in the app bundle. */
import axios from "axios";
import { onRequest } from "firebase-functions/v2/https";

import { functionsRegion, googleDirectionsApiKey } from "./config.js";
import {
  ensurePostRequest,
  handleCorsPreflight,
  requireAuthenticatedRequest,
  sendJsonError,
  setCorsHeaders,
} from "./http.js";
import { coerceCoordinate } from "./httpValidation.js";

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

export const getEvacuationRoute = onRequest(
  { region: functionsRegion, secrets: [googleDirectionsApiKey] },
  async (request, response) => {
    setCorsHeaders(response);

    if (handleCorsPreflight(request, response)) {
      return;
    }

    if (!ensurePostRequest(request, response)) {
      return;
    }

    const authContext = await requireAuthenticatedRequest(request, response, {
      authenticatedLimit: 30,
      routeKey: "getEvacuationRoute",
      unauthenticatedLimit: 60,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!authContext) {
      return;
    }

    const body = typeof request.body === "object" && request.body ? request.body : {};
    const { destination, origin } = body as {
      destination?: { centerId: string; latitude: number; longitude: number };
      origin?: { latitude: number; longitude: number };
    };

    const originLatitude = coerceCoordinate(origin?.latitude, -90, 90);
    const originLongitude = coerceCoordinate(origin?.longitude, -180, 180);
    const destinationLatitude = coerceCoordinate(destination?.latitude, -90, 90);
    const destinationLongitude = coerceCoordinate(destination?.longitude, -180, 180);
    const centerId = String(destination?.centerId ?? "").trim();

    if (!centerId || centerId.length > 120 || originLatitude === null || originLongitude === null || destinationLatitude === null || destinationLongitude === null) {
      sendJsonError(response, 400, "Valid origin and destination coordinates are required.");
      return;
    }

    if (!googleDirectionsApiKey.value()) {
      response.json({
        route: {
          distanceMeters: 1850,
          durationSeconds: 660,
          encodedPolyline: "",
          targetCenterId: centerId,
        },
      });
      return;
    }

    const apiResponse = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
      params: {
        origin: `${originLatitude},${originLongitude}`,
        destination: `${destinationLatitude},${destinationLongitude}`,
        key: googleDirectionsApiKey.value(),
      },
    });

    const leg = apiResponse.data.routes?.[0]?.legs?.[0];
    const polyline = apiResponse.data.routes?.[0]?.overview_polyline?.points ?? "";

    response.json({
      route: {
        distanceMeters: leg?.distance?.value ?? 0,
        durationSeconds: leg?.duration?.value ?? 0,
        encodedPolyline: polyline,
        targetCenterId: centerId,
      },
    });
  },
);
