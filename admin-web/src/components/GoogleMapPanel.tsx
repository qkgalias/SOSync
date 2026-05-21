import { useEffect, useMemo, useRef, useState } from "react";

import type { EvacuationCenter } from "../types";

type GoogleMapsRuntime = {
  maps: {
    LatLngBounds: new () => {
      extend: (point: { lat: number; lng: number }) => void;
    };
    Map: new (
      element: HTMLElement,
      options: {
        center: { lat: number; lng: number };
        disableDefaultUI?: boolean;
        fullscreenControl?: boolean;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
        styles?: Array<Record<string, unknown>>;
        zoomControl?: boolean;
        zoom: number;
      },
    ) => {
      addListener: (eventName: string, handler: (event: { latLng?: { lat: () => number; lng: () => number } }) => void) => unknown;
      fitBounds: (bounds: unknown) => void;
      panTo: (point: { lat: number; lng: number }) => void;
      setCenter: (point: { lat: number; lng: number }) => void;
      setOptions: (options: { styles?: Array<Record<string, unknown>> }) => void;
      setZoom: (zoom: number) => void;
    };
    Marker: new (options: {
      icon?: {
        anchor?: unknown;
        scaledSize?: unknown;
        url: string;
      };
      map: unknown;
      position: { lat: number; lng: number };
      title: string;
    }) => {
      addListener: (eventName: string, handler: () => void) => unknown;
      setIcon?: (icon: { anchor?: unknown; scaledSize?: unknown; url: string }) => void;
      setMap?: (map: unknown) => void;
      setPosition?: (position: { lat: number; lng: number }) => void;
    };
    Point: new (x: number, y: number) => unknown;
    Size: new (width: number, height: number) => unknown;
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        options: { componentRestrictions?: { country: string }; fields: string[] },
      ) => {
        addListener: (eventName: string, handler: () => void) => unknown;
        getPlace: () => {
          address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
          formatted_address?: string;
          geometry?: { location?: { lat: () => number; lng: () => number } };
          name?: string;
        };
      };
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMapsRuntime;
    sosyncGoogleMapsPromise?: Promise<GoogleMapsRuntime>;
  }
}

const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY as string | undefined;
const PHILIPPINES_CENTER = { lat: 12.8797, lng: 121.774 };

function getDefaultMapView(compact: boolean) {
  return {
    center: PHILIPPINES_CENTER,
    zoom: compact ? 5 : 6,
  };
}

export const lightMapStyles: Array<Record<string, unknown>> = [
  { elementType: "geometry", stylers: [{ color: "#F8F2EC" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7C726D" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F8F2EC" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#D9CCC2" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#F5EFE9" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#E4EFE6" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#DCEAD8" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ color: "#F8E8E4" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#DFD7D0" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#F1E8E1" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7D736E" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#D9D2CA" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#EEE3D7" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#CFE4EA" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#6A8695" }] },
];

export const darkMapStyles: Array<Record<string, unknown>> = [
  { elementType: "geometry", stylers: [{ color: "#26343E" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#B8C4CD" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#26343E" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#425461" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#30414C" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#314A46" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ color: "#4F4B58" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#6B7A83" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#3E4C56" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#CFD6DB" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#7B8891" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#55626A" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#34566A" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#8FB2C4" }] },
];

export function createMarkerIcon(
  google: GoogleMapsRuntime,
  theme: "dark" | "light",
  options: { disabled?: boolean; index?: number; selected?: boolean } = {},
) {
  const ring = theme === "dark" ? "#1d1716" : "#ffffff";
  const shadow = theme === "dark" ? "#000000" : "#7b9d8a";
  const fill = options.disabled ? "#9CA3AF" : "#07853e";
  const size = options.selected ? 42 : 36;
  const center = size / 2;
  const radius = options.selected ? 13 : 11;
  const fontSize = options.index ? 13 : 0;
  const label = options.index ? `<text x="${center}" y="${center + 4}" fill="#ffffff" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="800" text-anchor="middle">${options.index}</text>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${center}" cy="${center + 2}" r="${radius + 3}" fill="${shadow}" opacity=".2"/><circle cx="${center}" cy="${center}" r="${radius}" fill="${fill}" stroke="${ring}" stroke-width="4"/>${label}</svg>`;
  return {
    anchor: new google.maps.Point(center, center),
    scaledSize: new google.maps.Size(size, size),
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  };
}

export function loadGoogleMaps() {
  if (window.google) {
    return Promise.resolve(window.google);
  }
  if (window.sosyncGoogleMapsPromise) {
    return window.sosyncGoogleMapsPromise;
  }
  if (!mapsApiKey) {
    return Promise.reject(new Error("missing-google-maps-key"));
  }

  window.sosyncGoogleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsApiKey)}&libraries=places`;
    script.onload = () => (window.google ? resolve(window.google) : reject(new Error("google-maps-unavailable")));
    script.onerror = () => reject(new Error("google-maps-load-failed"));
    document.head.appendChild(script);
  });
  return window.sosyncGoogleMapsPromise;
}

export function GoogleMapPanel({
  centers,
  compact = false,
  emptyMessage,
  mapResetToken = 0,
  onSelectCenter,
  selectedCenterId,
  showDisabled = false,
  variant = "default",
}: {
  centers: EvacuationCenter[];
  compact?: boolean;
  emptyMessage?: { body: string; title: string };
  mapResetToken?: number;
  onSelectCenter?: (centerId: string) => void;
  selectedCenterId?: string;
  showDisabled?: boolean;
  variant?: "centers" | "dashboard" | "default";
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const didInitialFitRef = useRef("");
  const mapInstanceRef = useRef<InstanceType<GoogleMapsRuntime["maps"]["Map"]> | null>(null);
  const googleRuntimeRef = useRef<GoogleMapsRuntime | null>(null);
  const markerRefs = useRef<
    Array<{
      center: EvacuationCenter;
      index: number;
      marker: InstanceType<GoogleMapsRuntime["maps"]["Marker"]>;
    }>
  >([]);
  const [theme, setTheme] = useState<"dark" | "light">(
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const [status, setStatus] = useState<"configured" | "error" | "missing" | "ready">(
    mapsApiKey ? "configured" : "missing",
  );
  const defaultViewRef = useRef<{ center: { lat: number; lng: number }; zoom: number } | null>(null);
  const skipSelectedFocusRef = useRef(false);
  const lastSelectedCenterIdRef = useRef<string | undefined>(undefined);
  const markerSetKeyRef = useRef("");
  const mappableCenters = useMemo(
    () =>
      centers.filter(
        (center) =>
          (showDisabled || !center.disabled) &&
          Number.isFinite(center.latitude) &&
          Number.isFinite(center.longitude),
      ),
    [centers, showDisabled],
  );
  const mappableCenterIds = useMemo(
    () => mappableCenters.map((center) => center.centerId).join("|"),
    [mappableCenters],
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    });
    observer.observe(document.documentElement, { attributeFilter: ["data-theme"], attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mappableCenters.length) {
      return;
    }

    markerRefs.current.forEach(({ marker }) => marker.setMap?.(null));
    markerRefs.current = [];
    didInitialFitRef.current = "";
    markerSetKeyRef.current = "";
    skipSelectedFocusRef.current = false;
    lastSelectedCenterIdRef.current = undefined;

    const defaultView = getDefaultMapView(compact);
    defaultViewRef.current = defaultView;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(defaultView.center);
      mapInstanceRef.current.setZoom(defaultView.zoom);
    }
  }, [compact, mappableCenters.length]);

  useEffect(() => {
    if (!mapRef.current || !mapsApiKey || mapInstanceRef.current) {
      return;
    }

    let isMounted = true;
    setStatus("configured");
    loadGoogleMaps()
      .then((google) => {
        if (!isMounted || !mapRef.current) {
          return;
        }
        const first = mappableCenters[0];
        const defaultView = first
          ? {
              center: { lat: first.latitude, lng: first.longitude },
              zoom: compact ? 7 : 8,
            }
          : getDefaultMapView(compact);
        const map = new google.maps.Map(mapRef.current, {
          center: defaultView.center,
          disableDefaultUI: compact,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          styles: variant === "default" ? undefined : theme === "dark" ? darkMapStyles : lightMapStyles,
          zoom: defaultView.zoom,
          zoomControl: variant === "default" || variant === "centers",
        });
        googleRuntimeRef.current = google;
        mapInstanceRef.current = map;
        defaultViewRef.current = defaultView;
        setStatus("ready");
      })
      .catch(() => setStatus("error"));

    return () => {
      isMounted = false;
    };
  }, [compact, mappableCenters, theme, variant]);

  useEffect(() => {
    const google = googleRuntimeRef.current;
    const map = mapInstanceRef.current;
    if (!google || !map || status !== "ready") {
      return;
    }

    const markerKey = `${mappableCenterIds}:${variant}`;
    if (markerSetKeyRef.current === markerKey) {
      return;
    }

    markerRefs.current.forEach(({ marker }) => marker.setMap?.(null));
    markerRefs.current = [];

    const bounds = new google.maps.LatLngBounds();
    mappableCenters.forEach((center, index) => {
      const position = { lat: center.latitude, lng: center.longitude };
      bounds.extend(position);
      const marker = new google.maps.Marker({
        icon: createMarkerIcon(google, theme, {
          disabled: center.disabled,
          index: variant === "centers" ? index + 1 : undefined,
          selected: center.centerId === selectedCenterId,
        }),
        map,
        position,
        title: center.name,
      });
      markerRefs.current.push({ center, index, marker });
      if (onSelectCenter) {
        marker.addListener("click", () => onSelectCenter(center.centerId));
      }
    });

    if (mappableCenters.length > 1) {
      map.fitBounds(bounds);
      didInitialFitRef.current = mappableCenterIds;
    } else if (mappableCenters.length === 1) {
      map.setCenter({ lat: mappableCenters[0].latitude, lng: mappableCenters[0].longitude });
      map.setZoom(compact ? 7 : 8);
    }
    markerSetKeyRef.current = markerKey;
  }, [compact, mappableCenters, mappableCenterIds, onSelectCenter, selectedCenterId, status, theme, variant]);

  useEffect(() => {
    const google = googleRuntimeRef.current;
    if (!google || !mapInstanceRef.current || status !== "ready") {
      return;
    }

    markerRefs.current.forEach(({ center, index, marker }) => {
      marker.setIcon?.(
        createMarkerIcon(google, theme, {
          disabled: center.disabled,
          index: variant === "centers" ? index + 1 : undefined,
          selected: center.centerId === selectedCenterId,
        }),
      );
    });
  }, [selectedCenterId, status, theme, variant]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || status !== "ready") {
      return;
    }

    map.setOptions({
      styles: variant === "default" ? undefined : theme === "dark" ? darkMapStyles : lightMapStyles,
    });
  }, [status, theme, variant]);

  useEffect(() => {
    const selectedCenter = mappableCenters.find((center) => center.centerId === selectedCenterId);
    if (!selectedCenter || !mapInstanceRef.current || status !== "ready") {
      return;
    }

    if (skipSelectedFocusRef.current && lastSelectedCenterIdRef.current === selectedCenterId) {
      return;
    }
    skipSelectedFocusRef.current = false;
    lastSelectedCenterIdRef.current = selectedCenterId;

    const position = { lat: selectedCenter.latitude, lng: selectedCenter.longitude };
    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.panTo(position);
    if (!compact) {
      mapInstanceRef.current.setZoom(14);
    }
  }, [compact, mappableCenters, selectedCenterId, status]);

  useEffect(() => {
    if (!mapRef.current || !mapsApiKey || !mappableCenters.length || status !== "ready") {
      return;
    }

    const map = mapInstanceRef.current;
    const google = googleRuntimeRef.current;
    if (!map || !google || didInitialFitRef.current === mappableCenterIds || selectedCenterId) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    mappableCenters.forEach((center) => bounds.extend({ lat: center.latitude, lng: center.longitude }));
    if (mappableCenters.length > 1) {
      map.fitBounds(bounds);
    } else {
      map.setCenter({ lat: mappableCenters[0].latitude, lng: mappableCenters[0].longitude });
      map.setZoom(compact ? 7 : 8);
    }
    didInitialFitRef.current = mappableCenterIds;
  }, [compact, mappableCenters, mappableCenterIds, selectedCenterId, status]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const google = googleRuntimeRef.current;
    if (!map || !google || status !== "ready" || !mappableCenters.length) {
      return;
    }

    skipSelectedFocusRef.current = true;
    const first = mappableCenters[0];
    const bounds = new google.maps.LatLngBounds();
    mappableCenters.forEach((center) => bounds.extend({ lat: center.latitude, lng: center.longitude }));

    if (mappableCenters.length > 1) {
      map.fitBounds(bounds);
      return;
    }

    map.setCenter(defaultViewRef.current?.center ?? { lat: first.latitude, lng: first.longitude });
    map.setZoom(defaultViewRef.current?.zoom ?? (compact ? 7 : 8));
  }, [compact, mapResetToken, mappableCenters, status]);

  if (!mapsApiKey) {
    return (
      <div className={["map-fallback", compact ? "map-fallback--compact" : ""].filter(Boolean).join(" ")}>
        <strong>Google Maps key needed</strong>
        <span>Add `VITE_GOOGLE_MAPS_BROWSER_API_KEY` to admin-web to enable center mapping.</span>
      </div>
    );
  }

  return (
    <div className={["google-map-shell", compact ? "google-map-shell--compact" : "", `google-map-shell--${variant}`].filter(Boolean).join(" ")}>
      <div className="google-map-canvas" ref={mapRef} />
      {status === "configured" ? <span className="map-loading">Loading Google Maps...</span> : null}
      {status === "ready" && !mappableCenters.length ? (
        <div className={variant === "centers" ? "evacuation-map-empty-popup" : "map-fallback map-fallback--overlay"}>
          <strong>{emptyMessage?.title ?? "No active map markers"}</strong>
          <span>{emptyMessage?.body ?? "Add active centers with valid latitude and longitude."}</span>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="map-fallback map-fallback--overlay">
          <strong>Map unavailable</strong>
          <span>Check the browser Maps key and Google Maps JavaScript API access.</span>
        </div>
      ) : null}
    </div>
  );
}
