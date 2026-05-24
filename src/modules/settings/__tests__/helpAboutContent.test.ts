/** Purpose: Keep Help & About guidance aligned with the current user-facing feature set. */
import {
  EMERGENCY_USAGE_GUIDE_CONTENT,
  HELP_FAQ_ITEMS,
} from "@/modules/settings/helpAboutContent";

const joinedGuideText = EMERGENCY_USAGE_GUIDE_CONTENT.cards
  .map((card) => `${card.title} ${card.body}`)
  .join(" ");
const joinedFaqText = HELP_FAQ_ITEMS
  .map((item) => `${item.question} ${item.answer}`)
  .join(" ");

describe("helpAboutContent", () => {
  it("explains the main emergency and safety features in the guide", () => {
    expect(joinedGuideText).toContain("SOS");
    expect(joinedGuideText).toContain("Live Location");
    expect(joinedGuideText).toContain("hotlines");
    expect(joinedGuideText).toContain("Weather");
    expect(joinedGuideText).toContain("Offline");
    expect(joinedGuideText).toContain("notifications");
  });

  it("answers common questions about SOS, offline status, circles, permissions, and support", () => {
    expect(joinedFaqText).toContain("Active SOS");
    expect(joinedFaqText).toContain("offline");
    expect(joinedFaqText).toContain("live location");
    expect(joinedFaqText).toContain("weather advisories");
    expect(joinedFaqText).toContain("join a circle");
    expect(joinedFaqText).toContain("switch");
    expect(joinedFaqText).toContain("location and notifications");
    expect(joinedFaqText).toContain("Contact Support");
    expect(joinedFaqText).toContain("Report a Problem");
  });

  it("does not claim SOSync replaces official emergency responders", () => {
    expect(joinedFaqText).toContain("Does SOSync replace 911");
    expect(joinedFaqText).toContain("No. SOSync is for trusted-circle coordination.");
  });
});
