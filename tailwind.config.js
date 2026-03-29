/** Purpose: Define SOSync design tokens for NativeWind utility classes. */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
        soft: "#F6DDDD",
        softText: "#5C1515",
        panel: "#E0E0E0",
        page: "#FFFFFF",
      },
      boxShadow: {
        soft: "0 18px 36px rgba(100, 47, 47, 0.12)",
      },
      borderRadius: {
        card: "24px",
      },
    },
  },
  plugins: [],
};
