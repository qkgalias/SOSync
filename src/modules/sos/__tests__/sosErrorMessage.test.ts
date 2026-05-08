import {
  resolveSosSendErrorMessage,
  SOS_GENERIC_SEND_FAILURE_MESSAGE,
  SOS_OFFLINE_MESSAGE,
} from "@/modules/sos/sosErrorMessage";

describe("resolveSosSendErrorMessage", () => {
  it("returns the offline message when connectivity is unavailable", () => {
    expect(
      resolveSosSendErrorMessage({
        error: new Error("anything"),
        isOffline: true,
      }),
    ).toBe(SOS_OFFLINE_MESSAGE);
  });

  it("maps Firestore timeout wording to the offline message", () => {
    expect(
      resolveSosSendErrorMessage({
        error: new Error(
          "Firestore did not respond in time. Confirm this Firebase project has a default Cloud Firestore database and that the app has network access.",
        ),
      }),
    ).toBe(SOS_OFFLINE_MESSAGE);
  });

  it("falls back to the generic SOS failure message for unknown errors", () => {
    expect(
      resolveSosSendErrorMessage({
        error: new Error("Something unexpected happened."),
      }),
    ).toBe(SOS_GENERIC_SEND_FAILURE_MESSAGE);
  });
});
