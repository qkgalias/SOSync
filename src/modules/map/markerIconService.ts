/** Purpose: Build local Android marker icons that the Navigation SDK can load by file path. */
import { NativeModules, Platform } from "react-native";

import type { HomeMapAppearance } from "@/types";

type NativeMarkerIconModule = {
  buildMarkerIcon: (options: MarkerIconRequest) => Promise<string>;
};

export type MarkerIconRequest = {
  displayName?: string;
  isCenter?: boolean;
  isCurrentUser?: boolean;
  isHighlighted?: boolean;
  mapTheme: HomeMapAppearance;
  markerId: string;
  photoURL?: string;
};

const nativeMarkerIconModule = NativeModules.SOSyncMarkerIcon as NativeMarkerIconModule | undefined;

export const hasNativeMarkerIconSupport = () =>
  Platform.OS !== "android" || Boolean(nativeMarkerIconModule?.buildMarkerIcon);

export const buildMarkerIconCacheKey = (request: MarkerIconRequest) =>
  request.isCenter
    ? [request.markerId, "center", request.mapTheme, "static"].join("|")
    : [
        request.markerId,
        request.displayName?.trim() ?? "",
        request.photoURL?.trim() ?? "",
        request.mapTheme,
        request.isCurrentUser ? "current" : "member",
        "avatar",
        request.isHighlighted ? "highlighted" : "normal",
      ].join("|");

export const buildLocalMarkerIcon = async (request: MarkerIconRequest) => {
  if (Platform.OS !== "android" || !nativeMarkerIconModule?.buildMarkerIcon) {
    if (Platform.OS === "android") {
      console.warn("App build is missing SOSyncMarkerIcon native marker support.");
    }
    return undefined;
  }

  try {
    return await nativeMarkerIconModule.buildMarkerIcon({
      ...request,
      displayName: request.displayName?.trim() ?? "",
      photoURL: request.photoURL?.trim() ?? "",
    });
  } catch (error) {
    console.warn("Home map marker icon generation failed.", error);
    return undefined;
  }
};
