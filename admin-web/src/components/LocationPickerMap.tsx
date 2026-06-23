import { useEffect, useRef, useState } from "react";

import { createMarkerIcon, darkMapStyles, lightMapStyles, loadGoogleMaps } from "./GoogleMapPanel";
import { deriveGooglePlaceGeography } from "../pages/evacuationCenterHelpers";

type LocationValue = {
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  region?: string;
  regionCode?: string;
  islandGroup?: string;
};

const defaultCenter = { lat: 12.8797, lng: 121.774 };

const getCurrentTheme = () =>
  typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export function LocationPickerMap({
  onChange,
  value,
}: {
  onChange: (value: Partial<LocationValue>) => void;
  value: LocationValue;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<{ setPosition?: (position: { lat: number; lng: number }) => void } | null>(null);
  const [status, setStatus] = useState<"error" | "loading" | "missing-places" | "ready">("loading");
  const [theme, setTheme] = useState<"dark" | "light">(getCurrentTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    });
    observer.observe(document.documentElement, { attributeFilter: ["data-theme"], attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mapCanvasRef.current || !inputRef.current) {
      return;
    }

    let isMounted = true;
    setStatus("loading");
    loadGoogleMaps()
      .then((google) => {
        if (!isMounted || !mapCanvasRef.current || !inputRef.current) {
          return;
        }
        const hasValidCoordinate =
          Number.isFinite(value.latitude) &&
          Number.isFinite(value.longitude) &&
          value.latitude !== 0 &&
          value.longitude !== 0;
        const position = hasValidCoordinate ? { lat: value.latitude, lng: value.longitude } : defaultCenter;
        const map = new google.maps.Map(mapCanvasRef.current, {
          center: position,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          styles: theme === "dark" ? darkMapStyles : lightMapStyles,
          zoom: hasValidCoordinate ? 15 : 6,
          zoomControl: true,
        });
        const marker = new google.maps.Marker({
          icon: createMarkerIcon(google, theme, { selected: true }),
          map,
          position,
          title: "Selected evacuation center location",
        });
        markerRef.current = marker;

        map.addListener("click", (event) => {
          const nextPosition = event.latLng ? { lat: event.latLng.lat(), lng: event.latLng.lng() } : null;
          if (!nextPosition) {
            return;
          }
          marker.setPosition?.(nextPosition);
          onChange({ latitude: nextPosition.lat, longitude: nextPosition.lng });
        });

        try {
          if (!google.maps.places?.Autocomplete) {
            setStatus("missing-places");
            return;
          }

          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: "ph" },
            fields: ["address_components", "formatted_address", "geometry", "name"],
          });
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const location = place.geometry?.location;
            if (!location) {
              return;
            }
            const nextPosition = { lat: location.lat(), lng: location.lng() };
            const geography = deriveGooglePlaceGeography(place.address_components);
            marker.setPosition?.(nextPosition);
            map.panTo(nextPosition);
            map.setZoom(15);
            onChange({
              address: place.formatted_address || place.name || value.address,
              ...geography,
              latitude: nextPosition.lat,
              longitude: nextPosition.lng,
            });
          });
          setStatus("ready");
        } catch {
          setStatus("missing-places");
        }
      })
      .catch(() => setStatus("error"));

    return () => {
      isMounted = false;
    };
  }, [onChange, theme, value.latitude, value.longitude]);

  return (
    <div className="location-picker">
      <label className="field">
        <span>Search area or place</span>
        <input ref={inputRef} placeholder="Search for a school, hall, or address" type="search" />
      </label>
      <div className="location-picker__map" ref={mapRef}>
        <div className="location-picker__canvas" ref={mapCanvasRef} />
        {status === "loading" ? <span>Loading map picker...</span> : null}
        {status === "missing-places" ? (
          <span className="location-picker__notice">
            Place search is unavailable. You can still click the map or enter coordinates manually.
          </span>
        ) : null}
        {status === "error" ? <span>Map picker unavailable. Manual coordinates still work.</span> : null}
      </div>
    </div>
  );
}
