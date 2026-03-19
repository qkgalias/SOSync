/** Purpose: Configure Babel for Expo, NativeWind, and Reanimated. */
module.exports = function (api) {
  const isTest = process.env.NODE_ENV === "test" || process.env.BABEL_ENV === "test";
  api.cache(() => (isTest ? "test" : "default"));

  if (isTest) {
    return {
      presets: ["babel-preset-expo"],
    };
  }

  return {
    presets: ["babel-preset-expo", "nativewind/babel"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
