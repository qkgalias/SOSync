/** Purpose: Register shared Jest matchers and mocks for Expo-native tests. */
import "@testing-library/jest-native/extend-expect";

jest.mock("@googlemaps/react-native-navigation-sdk", () => {
  const React = require("react");
  const { View } = require("react-native");

  const navigationController = {
    clearDestinations: jest.fn().mockResolvedValue(undefined),
    init: jest.fn().mockResolvedValue("OK"),
    setDestination: jest.fn().mockResolvedValue("OK"),
    showTermsAndConditionsDialog: jest.fn().mockResolvedValue(true),
    startGuidance: jest.fn().mockResolvedValue(undefined),
    stopGuidance: jest.fn().mockResolvedValue(undefined),
  };

  return {
    MapColorScheme: {
      DARK: "DARK",
      LIGHT: "LIGHT",
    },
    MapType: {
      NORMAL: "NORMAL",
    },
    MapView: (props: Record<string, unknown>) => React.createElement(View, { testID: "navigation-view", ...props }),
    NavigationNightMode: {
      FORCE_DAY: "FORCE_DAY",
      FORCE_NIGHT: "FORCE_NIGHT",
    },
    NavigationProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    NavigationSessionStatus: {
      LOCATION_PERMISSION_MISSING: "LOCATION_PERMISSION_MISSING",
      NETWORK_ERROR: "NETWORK_ERROR",
      NOT_AUTHORIZED: "NOT_AUTHORIZED",
      OK: "OK",
      TERMS_NOT_ACCEPTED: "TERMS_NOT_ACCEPTED",
    },
    NavigationUIEnabledPreference: {
      AUTOMATIC: "AUTOMATIC",
      DISABLED: "DISABLED",
    },
    NavigationView: (props: Record<string, unknown>) => React.createElement(View, { testID: "navigation-view", ...props }),
    RouteStatus: {
      LOCATION_DISABLED: "LOCATION_DISABLED",
      LOCATION_UNKNOWN: "LOCATION_UNKNOWN",
      NETWORK_ERROR: "NETWORK_ERROR",
      NO_ROUTE_FOUND: "NO_ROUTE_FOUND",
      OK: "OK",
      QUOTA_CHECK_FAILED: "QUOTA_CHECK_FAILED",
    },
    TaskRemovedBehavior: {
      QUIT_SERVICE: "QUIT_SERVICE",
    },
    TravelMode: {
      DRIVING: "DRIVING",
      TWO_WHEELER: "TWO_WHEELER",
      WALKING: "WALKING",
    },
    useNavigation: () => ({
      navigationController,
    }),
  };
});
