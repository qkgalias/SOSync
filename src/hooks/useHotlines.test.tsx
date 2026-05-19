/** Purpose: Verify emergency hotlines remain available when live Firestore data is unavailable. */
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { useHotlines } from "@/hooks/useHotlines";
import { firestoreService } from "@/services/firestoreService";

jest.mock("@/services/firestoreService", () => ({
  firestoreService: {
    listenToHotlines: jest.fn(),
  },
}));

jest.mock("@/config/env", () => ({
  env: {
    defaultRegion: "PH",
  },
}));

const mockedFirestoreService = jest.mocked(firestoreService);

function Probe() {
  const hotlines = useHotlines();

  return (
    <>
      <Text>count:{hotlines.length}</Text>
      {hotlines.map((hotline) => (
        <Text key={hotline.hotlineId}>{hotline.name}</Text>
      ))}
    </>
  );
}

describe("useHotlines", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFirestoreService.listenToHotlines.mockReturnValue(jest.fn());
  });

  it("starts with bundled Philippine emergency contacts", () => {
    render(<Probe />);

    expect(screen.getByText("National Emergency Hotline")).toBeTruthy();
    expect(screen.getByText("Philippine Red Cross")).toBeTruthy();
  });

  it("keeps bundled emergency contacts when the live listener returns no rows", () => {
    mockedFirestoreService.listenToHotlines.mockImplementation((_region, callback) => {
      callback([]);
      return jest.fn();
    });

    render(<Probe />);

    expect(screen.getByText("National Emergency Hotline")).toBeTruthy();
    expect(screen.getByText("Philippine Red Cross")).toBeTruthy();
  });
});
