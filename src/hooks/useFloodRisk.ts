/** Purpose: Load and cache shared local weather and flood data for the Home outlook sheets. */
import { useCallback, useEffect, useMemo, useState } from "react";

import type { FloodRiskOverview, MapCoordinate } from "@/types";
import { apiService } from "@/services/apiService";
import {
  buildFloodRiskCacheKey,
  getFloodRiskErrorMessage,
  shouldRefreshFloodRisk,
} from "@/hooks/useFloodRisk.helpers";

type CacheEntry = {
  data: FloodRiskOverview;
  fetchedAt: number;
  location: MapCoordinate;
};

type FloodRiskStatus = "error" | "idle" | "loading" | "success";

const floodRiskCache = new Map<string, CacheEntry>();

export const useFloodRisk = (currentLocation: MapCoordinate | null, isFocused: boolean) => {
  const [data, setData] = useState<FloodRiskOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<FloodRiskStatus>("idle");

  const cacheKey = useMemo(
    () => (currentLocation ? buildFloodRiskCacheKey(currentLocation) : null),
    [currentLocation],
  );

  const loadFloodRisk = useCallback(async (force = false) => {
    if (!currentLocation || !cacheKey) {
      return null;
    }

    const cached = floodRiskCache.get(cacheKey);
    if (!force && cached && !shouldRefreshFloodRisk({
      currentLocation,
      fetchedAt: cached.fetchedAt,
      lastLocation: cached.location,
    })) {
      setData(cached.data);
      setError(null);
      setStatus("success");
      return cached.data;
    }

    setIsRefreshing(Boolean(data));
    setStatus((currentStatus) => (currentStatus === "success" && data ? currentStatus : "loading"));
    try {
      const nextData = await apiService.getFloodRiskOverview(currentLocation);
      const nextEntry = {
        data: nextData,
        fetchedAt: Date.now(),
        location: currentLocation,
      } satisfies CacheEntry;

      floodRiskCache.set(cacheKey, nextEntry);
      setData(nextData);
      setError(null);
      setIsRefreshing(false);
      setStatus("success");
      return nextData;
    } catch (nextError) {
      const message = getFloodRiskErrorMessage(nextError);
      setError(message);
      setIsRefreshing(false);
      setStatus("error");
      return null;
    }
  }, [cacheKey, currentLocation, data]);

  useEffect(() => {
    if (!isFocused || !currentLocation) {
      return;
    }

    void loadFloodRisk(false);
  }, [currentLocation, isFocused, loadFloodRisk]);

  useEffect(() => {
    if (!cacheKey) {
      setData(null);
      setError(null);
      setStatus("idle");
      return;
    }

    const cached = floodRiskCache.get(cacheKey);
    if (cached) {
      setData(cached.data);
      setError(null);
      setStatus("success");
    }
  }, [cacheKey]);

  return {
    data,
    error,
    isRefreshing,
    refresh: () => loadFloodRisk(true),
    status,
  };
};
