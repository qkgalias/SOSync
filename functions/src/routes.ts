/** Purpose: Proxy evacuation route requests so Google API keys never live in the app bundle. */
import axios from "axios";
import { onRequest } from "firebase-functions/v2/https";

import { functionsRegion, googleDirectionsApiKey } from "./config.js";

export const getEvacuationRoute = onRequest(
  { region: functionsRegion, secrets: [googleDirectionsApiKey] },
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    const { destination, origin } = request.body as {
      destination?: { centerId: string; latitude: number; longitude: number };
      origin?: { latitude: number; longitude: number };
    };

    if (!origin || !destination) {
      response.status(400).json({ error: "origin and destination are required." });
      return;
    }

    if (!googleDirectionsApiKey.value()) {
      response.json({
        route: {
          distanceMeters: 1850,
          durationSeconds: 660,
          encodedPolyline: "",
          targetCenterId: destination.centerId,
        },
      });
      return;
    }

    const apiResponse = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
      params: {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
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
        targetCenterId: destination.centerId,
      },
    });
  },
);
