/** Purpose: Centralize product-level design, region, and map defaults for SOSync. */
export const appConfig = {
  appName: "SOSync",
  launchRegion: "PH",
  map: {
    initialRegion: {
      latitude: 14.5995,
      longitude: 120.9842,
      latitudeDelta: 0.28,
      longitudeDelta: 0.28,
    },
  },
  theme: {
    colors: {
      canvas: "#F4F9FF",
      surface: "#FFFFFF",
      ink: "#0E1A2B",
      muted: "#5B6B82",
      line: "#D6E1F2",
      primary: "#1E5EFF",
      accent: "#2BB8A5",
      caution: "#F2A93B",
      danger: "#D6524E",
      focus: "#123D8B",
    },
  },
};
