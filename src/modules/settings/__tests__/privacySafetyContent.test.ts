/** Purpose: Keep in-app legal summaries aligned with the current SOSync feature set. */
import {
  PRIVACY_POLICY_CONTENT,
  TERMS_AND_CONDITIONS_CONTENT,
} from "@/modules/settings/privacySafetyContent";
import { SIGN_UP_LEGAL_MODAL_CONTENT } from "@/modules/onboarding/signUpLegalContent";

const privacyText = PRIVACY_POLICY_CONTENT.cards.map((card) => `${card.title} ${card.body}`).join(" ");
const termsText = TERMS_AND_CONDITIONS_CONTENT.cards.map((card) => `${card.title} ${card.body}`).join(" ");
const signupPrivacyText = SIGN_UP_LEGAL_MODAL_CONTENT.privacy.sections
  .map((section) => `${section.title} ${section.body}`)
  .join(" ");
const signupTermsText = SIGN_UP_LEGAL_MODAL_CONTENT.terms.sections
  .map((section) => `${section.title} ${section.body}`)
  .join(" ");

describe("privacySafetyContent legal summaries", () => {
  it("covers current privacy data categories and controls", () => {
    expect(privacyText).toContain("account details");
    expect(privacyText).toContain("trusted-circle memberships");
    expect(privacyText).toContain("invite-code activity");
    expect(privacyText).toContain("live map");
    expect(privacyText).toContain("Last seen");
    expect(privacyText).toContain("offline");
    expect(privacyText).toContain("SOS events");
    expect(privacyText).toContain("weather advisories");
    expect(privacyText).toContain("push tokens");
    expect(privacyText).toContain("support requests");
    expect(privacyText).toContain("pause live sharing");
  });

  it("covers responsible use, emergency limits, advisories, security, and availability", () => {
    expect(termsText).toContain("Use SOS for real emergencies only");
    expect(termsText).toContain("trusted people");
    expect(termsText).toContain("does not replace 911");
    expect(termsText).toContain("official advisories");
    expect(termsText).toContain("not a guarantee");
    expect(termsText).toContain("Keep your account secure");
    expect(termsText).toContain("Android-first live EAS build");
  });

  it("keeps signup legal modal copy aligned with signed-in legal summaries", () => {
    expect(signupPrivacyText).toContain("trusted-circle memberships");
    expect(signupPrivacyText).toContain("last seen/offline status");
    expect(signupPrivacyText).toContain("support requests");
    expect(signupPrivacyText).toContain("pause live sharing");
    expect(signupTermsText).toContain("official hotlines");
    expect(signupTermsText).toContain("Android-first live EAS build");
  });
});
