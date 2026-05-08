/** Purpose: Share the SOSync Google map style between Home and embedded map previews. */
import type { HomeMapAppearance } from "@/types";

export const lightHomeMapStyle = [
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

export const darkHomeMapStyle = [
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

export const getHomeMapStyle = (appearance: HomeMapAppearance) =>
  appearance === "dark" ? darkHomeMapStyle : lightHomeMapStyle;

export const getHomeMapStyleJson = (appearance: HomeMapAppearance) => JSON.stringify(getHomeMapStyle(appearance));
