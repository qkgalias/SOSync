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
      canvas: "#FFFFFF",
      surface: "#F1F1F1",
      ink: "#2E2C2C",
      muted: "#6A6767",
      line: "#E4D8D8",
      primary: "#D06B6B",
      accent: "#7B2C28",
      caution: "#D78B4A",
      danger: "#8A2D2B",
      focus: "#B85757",
    },
  },
};
