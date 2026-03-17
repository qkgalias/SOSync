/** Purpose: Define SOSync design tokens for NativeWind utility classes. */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
      boxShadow: {
        soft: "0 16px 40px rgba(25, 56, 113, 0.12)",
      },
      borderRadius: {
        card: "28px",
      },
    },
  },
  plugins: [],
};
