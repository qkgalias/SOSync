/** Purpose: Keep Firestore writes safe by stripping unsupported undefined values before persistence. */
import { sanitizeForFirestore } from "@/utils/firestore";

describe("sanitizeForFirestore", () => {
  it("removes undefined fields recursively", () => {
    expect(
      sanitizeForFirestore({
        name: "Karlos",
        photoURL: undefined,
        onboarding: {
          currentStep: "profile",
          defaultGroupId: undefined,
        },
        tags: ["ok", undefined, "still-ok"],
      }),
    ).toEqual({
      name: "Karlos",
      onboarding: {
        currentStep: "profile",
      },
      tags: ["ok", "still-ok"],
    });
  });
});
