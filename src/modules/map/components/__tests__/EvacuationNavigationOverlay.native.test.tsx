import { Platform } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { EvacuationNavigationOverlay } from "@/modules/map/components/EvacuationNavigationOverlay.native";
import type { EvacuationCenter } from "@/types";

const mockShowTermsAndConditionsDialog = jest.fn().mockResolvedValue(true);
const mockInit = jest.fn().mockResolvedValue("OK");
const mockSetDestination = jest.fn().mockResolvedValue("OK");
const mockStartGuidance = jest.fn().mockResolvedValue(undefined);
const mockStopGuidance = jest.fn().mockResolvedValue(undefined);
const mockClearDestinations = jest.fn().mockResolvedValue(undefined);
const mockGetCurrentTimeAndDistance = jest.fn().mockResolvedValue({
  delaySeverity: "LOW",
  meters: 800,
  seconds: 660,
});
const mockAuthorizeEvacuationNavigationStart = jest.fn();
const mockRemoveAllListeners = jest.fn();
const mockSetOnRemainingTimeOrDistanceChanged = jest.fn();
let consoleErrorSpy: jest.SpyInstance | null = null;

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    MaterialCommunityIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock("@/components/BackButton", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");

  return {
    BackButton: ({ onPress, testID }: { onPress: () => void; testID?: string }) => (
      <Pressable onPress={onPress} testID={testID}>
        <Text>Back</Text>
      </Pressable>
    ),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");

  const BottomSheet = React.forwardRef(function MockBottomSheet(props: any, ref: any) {
    React.useImperativeHandle(ref, () => ({
      snapToIndex: jest.fn(),
    }));

    return (
      <View testID="navigation-bottom-sheet" {...props}>
        {props.children}
      </View>
    );
  });

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

jest.mock("@googlemaps/react-native-navigation-sdk", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    NavigationNightMode: {
      FORCE_DAY: "FORCE_DAY",
      FORCE_NIGHT: "FORCE_NIGHT",
    },
    NavigationSessionStatus: {
      OK: "OK",
      LOCATION_PERMISSION_MISSING: "LOCATION_PERMISSION_MISSING",
      NETWORK_ERROR: "NETWORK_ERROR",
      NOT_AUTHORIZED: "NOT_AUTHORIZED",
      TERMS_NOT_ACCEPTED: "TERMS_NOT_ACCEPTED",
    },
    NavigationUIEnabledPreference: {
      AUTOMATIC: "AUTOMATIC",
    },
    NavigationView: (props: any) => <View testID="navigation-view" {...props} />,
    RouteStatus: {
      LOCATION_DISABLED: "LOCATION_DISABLED",
      LOCATION_UNKNOWN: "LOCATION_UNKNOWN",
      NETWORK_ERROR: "NETWORK_ERROR",
      NO_ROUTE_FOUND: "NO_ROUTE_FOUND",
      OK: "OK",
      QUOTA_CHECK_FAILED: "QUOTA_CHECK_FAILED",
    },
    useNavigation: () => ({
      navigationController: {
        clearDestinations: mockClearDestinations,
        getCurrentTimeAndDistance: mockGetCurrentTimeAndDistance,
        init: mockInit,
        setDestination: mockSetDestination,
        showTermsAndConditionsDialog: mockShowTermsAndConditionsDialog,
        startGuidance: mockStartGuidance,
        stopGuidance: mockStopGuidance,
      },
      removeAllListeners: mockRemoveAllListeners,
      setOnRemainingTimeOrDistanceChanged: mockSetOnRemainingTimeOrDistanceChanged,
    }),
  };
});

jest.mock("@/services/apiService", () => ({
  NavigationAuthorizationError: class NavigationAuthorizationError extends Error {
    code: "invalid_center" | "rate_limited" | "unknown";
    retryAfterSeconds?: number;

    constructor(input: {
      code: "invalid_center" | "rate_limited" | "unknown";
      message: string;
      retryAfterSeconds?: number;
    }) {
      super(input.message);
      this.code = input.code;
      this.retryAfterSeconds = input.retryAfterSeconds;
    }
  },
  apiService: {
    authorizeEvacuationNavigationStart: (...args: unknown[]) =>
      mockAuthorizeEvacuationNavigationStart(...args),
  },
}));

const center: EvacuationCenter = {
  address: "Talisay City, Cebu",
  capacity: 300,
  centerId: "center-1",
  contact: "+639171234567",
  latitude: 10.261,
  longitude: 123.849,
  name: "Talisay Evacuation Center",
  region: "PH",
};

describe("EvacuationNavigationOverlay native", () => {
  beforeAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthorizeEvacuationNavigationStart.mockResolvedValue({ allowed: true });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    consoleErrorSpy = null;
  });

  it("builds the preview route before requesting navigation authorization", async () => {
    const onClose = jest.fn();
    const screen = render(
      <EvacuationNavigationOverlay
        appearance="light"
        center={center}
        currentLocation={{ latitude: 10.2635, longitude: 123.8395 }}
        onClose={onClose}
        onTravelModeChange={jest.fn()}
        selectedTravelMode="four_wheeler"
      />,
    );

    await waitFor(() => {
      expect(mockSetDestination).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId("navigation-start-button").props.disabled).toBeFalsy();
    });

    expect(screen.queryByText("Ready to start")).toBeNull();
    expect(screen.queryByTestId("navigation-retry-button")).toBeNull();
    expect(screen.getByTestId("navigation-view").props.recenterButtonEnabled).toBe(false);
    expect(mockAuthorizeEvacuationNavigationStart).not.toHaveBeenCalled();
    expect(mockStartGuidance).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("navigation-back-button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
