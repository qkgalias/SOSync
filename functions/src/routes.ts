/** Purpose: Proxy evacuation route requests so Google API keys never live in the app bundle. */
import axios from "axios";
import { onRequest } from "firebase-functions/v2/https";

import { adminDb } from "./admin.js";
import { functionsRegion, googleDirectionsApiKey } from "./config.js";
import {
  authenticateRequest,
  ensurePostRequest,
  handleCorsPreflight,
  requireAuthenticatedRequest,
  sendJsonError,
  sendRateLimitExceeded,
  setCorsHeaders,
  takeRateLimit,
} from "./http.js";
import { coerceCoordinate } from "./httpValidation.js";
import {
  coerceEvacuationTravelMode,
  filterNearbyEvacuationCenters,
  mapTravelModeToGoogle,
  normalizeGoogleRoute,
  resolveNearbyEvacuationCenter,
  type EvacuationCenterDoc,
} from "./routeHelpers.js";

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const AUTHORIZED_NAVIGATION_START_LIMIT = 5;
const GOOGLE_ROUTES_FIELD_MASK = [
  "routes.distanceMeters",
  "routes.duration",
  "routes.legs.distanceMeters",
  "routes.legs.duration",
  "routes.legs.steps.distanceMeters",
  "routes.legs.steps.navigationInstruction",
  "routes.legs.steps.polyline.encodedPolyline",
  "routes.legs.steps.staticDuration",
  "routes.polyline.encodedPolyline",
  "routes.warnings",
].join(",");

const emptyRoute = (centerId: string, travelMode: ReturnType<typeof coerceEvacuationTravelMode>) => ({
  distanceMeters: 0,
  durationSeconds: 0,
  encodedPolyline: "",
  hasGeometry: false,
  steps: [],
  targetCenterId: centerId,
  travelMode: travelMode ?? "four_wheeler",
  warnings: [],
});

export const getNearbyEvacuationCenters = onRequest(
  { region: functionsRegion },
  async (request, response) => {
    setCorsHeaders(response);

    if (handleCorsPreflight(request, response)) {
      return;
    }

    if (!ensurePostRequest(request, response)) {
      return;
    }

    const authContext = await requireAuthenticatedRequest(request, response, {
      authenticatedLimit: 90,
      routeKey: "getNearbyEvacuationCenters",
      unauthenticatedLimit: 60,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!authContext) {
      return;
    }

    const body = typeof request.body === "object" && request.body ? request.body : {};
    const origin = (body as { origin?: { latitude: number; longitude: number } }).origin;
    const originLatitude = coerceCoordinate(origin?.latitude, -90, 90);
    const originLongitude = coerceCoordinate(origin?.longitude, -180, 180);

    if (originLatitude === null || originLongitude === null) {
      sendJsonError(response, 400, "Valid origin coordinates are required.");
      return;
    }

    const snapshot = await adminDb.collection("evacuation_centers").where("region", "==", "PH").get();
    const centers = snapshot.docs.map((doc) => ({
      centerId: doc.id,
      ...(doc.data() as Omit<EvacuationCenterDoc, "centerId">),
    }));

    response.json({
      centers: filterNearbyEvacuationCenters(centers, {
        latitude: originLatitude,
        longitude: originLongitude,
      }),
    });
  },
);

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
    const { destination, origin, travelMode: rawTravelMode } = body as {
      destination?: { centerId: string; latitude: number; longitude: number };
      origin?: { latitude: number; longitude: number };
      travelMode?: unknown;
    };
    const travelMode = coerceEvacuationTravelMode(rawTravelMode);

    const originLatitude = coerceCoordinate(origin?.latitude, -90, 90);
    const originLongitude = coerceCoordinate(origin?.longitude, -180, 180);
    const destinationLatitude = coerceCoordinate(destination?.latitude, -90, 90);
    const destinationLongitude = coerceCoordinate(destination?.longitude, -180, 180);
    const centerId = String(destination?.centerId ?? "").trim();

    if (!travelMode) {
      sendJsonError(response, 400, "A valid travel mode is required.");
      return;
    }

    if (!centerId || centerId.length > 120 || originLatitude === null || originLongitude === null || destinationLatitude === null || destinationLongitude === null) {
      sendJsonError(response, 400, "Valid origin and destination coordinates are required.");
      return;
    }

    if (!googleDirectionsApiKey.value()) {
      response.json({
        route: emptyRoute(centerId, travelMode),
      });
      return;
    }

    const apiResponse = await axios.post(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        destination: {
          location: {
            latLng: {
              latitude: destinationLatitude,
              longitude: destinationLongitude,
            },
          },
        },
        origin: {
          location: {
            latLng: {
              latitude: originLatitude,
              longitude: originLongitude,
            },
          },
        },
        polylineEncoding: "ENCODED_POLYLINE",
        polylineQuality: "HIGH_QUALITY",
        travelMode: mapTravelModeToGoogle(travelMode),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleDirectionsApiKey.value(),
          "X-Goog-FieldMask": GOOGLE_ROUTES_FIELD_MASK,
        },
      },
    );

    const route = Array.isArray(apiResponse.data?.routes) ? apiResponse.data.routes[0] : null;

    response.json({
      route: route
        ? normalizeGoogleRoute({ centerId, googleRoute: route, travelMode })
        : emptyRoute(centerId, travelMode),
    });
  },
);

export const authorizeEvacuationNavigationStart = onRequest(
  { region: functionsRegion },
  async (request, response) => {
    setCorsHeaders(response);

    if (handleCorsPreflight(request, response)) {
      return;
    }

    if (!ensurePostRequest(request, response)) {
      return;
    }

    const authContext = await authenticateRequest(request, response);
    if (!authContext) {
      return;
    }

    const body = typeof request.body === "object" && request.body ? request.body : {};
    const { destination, origin, travelMode: rawTravelMode } = body as {
      destination?: { centerId: string; latitude: number; longitude: number };
      origin?: { latitude: number; longitude: number };
      travelMode?: unknown;
    };
    const travelMode = coerceEvacuationTravelMode(rawTravelMode);

    const originLatitude = coerceCoordinate(origin?.latitude, -90, 90);
    const originLongitude = coerceCoordinate(origin?.longitude, -180, 180);
    const destinationLatitude = coerceCoordinate(destination?.latitude, -90, 90);
    const destinationLongitude = coerceCoordinate(destination?.longitude, -180, 180);
    const centerId = String(destination?.centerId ?? "").trim();

    if (!travelMode) {
      sendJsonError(response, 400, "A valid travel mode is required.");
      return;
    }

    if (
      !centerId ||
      centerId.length > 120 ||
      originLatitude === null ||
      originLongitude === null ||
      destinationLatitude === null ||
      destinationLongitude === null
    ) {
      sendJsonError(response, 400, "Valid origin and destination coordinates are required.");
      return;
    }

    const snapshot = await adminDb.collection("evacuation_centers").where("region", "==", "PH").get();
    const centers = snapshot.docs.map((doc) => ({
      centerId: doc.id,
      ...(doc.data() as Omit<EvacuationCenterDoc, "centerId">),
    }));

    const matchedCenter = resolveNearbyEvacuationCenter(centers, {
      centerId,
      destination: {
        latitude: destinationLatitude,
        longitude: destinationLongitude,
      },
      origin: {
        latitude: originLatitude,
        longitude: originLongitude,
      },
    });

    if (!matchedCenter) {
      sendJsonError(response, 403, "That evacuation center is no longer nearby for this navigation request.");
      return;
    }

    const rateLimit = await takeRateLimit({
      limit: AUTHORIZED_NAVIGATION_START_LIMIT,
      routeKey: "authorizeEvacuationNavigationStart",
      subjectKey: `user:${authContext.userId}`,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      sendRateLimitExceeded(response, rateLimit);
      return;
    }

    response.json({
      allowed: true,
      center: {
        centerId: matchedCenter.centerId,
        name: matchedCenter.name ?? centerId,
      },
      travelMode,
    });
  },
);
