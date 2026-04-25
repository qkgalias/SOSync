/** Purpose: Send and verify branded email OTP codes for SOSync onboarding. */
import { createHash, randomInt } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { adminAuth, adminDb } from "./admin.js";
import {
  defaultBrandLogoUrl,
  functionsRegion,
  resendApiKey,
  resendBrandLogoUrl,
  resendFromEmail,
} from "./config.js";
import { nowIso } from "./helpers.js";
import { normalizeEmail, sanitizeOtpCode } from "./input.js";

const OTP_CODE_REGEX = /^\d{6}$/;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const BRAND_PRIMARY = "#650B11";
const BRAND_PRIMARY_SOFT = "#8B2E35";
const EMAIL_FOOTER = "#F2D8DC";
const EMAIL_TEXT = "#32252B";
const EMAIL_TEXT_MUTED = "#6D5F61";

type EmailVerificationRecord = {
  attemptCount?: number;
  codeHash?: string;
  email?: string;
  expiresAt?: string;
  purpose?: string;
  resendAvailableAt?: string;
  sentAt?: string;
  verifiedAt?: string | null;
};

type ResendEmailPayload = {
  email: string;
  html: string;
  subject: string;
};

type PasswordResetRecord = {
  emailHash?: string;
  resendAvailableAt?: string;
  sentAt?: string;
};

const assertAuthenticated = (uid?: string) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in before verifying your email.");
  }

  return uid;
};

const toVerificationRef = (userId: string) => adminDb.collection("email_verifications").doc(userId);
const toPasswordResetRef = (email: string) => {
  const emailHash = createHash("sha256").update(normalizeEmail(email)).digest("hex");
  return adminDb.collection("password_reset_requests").doc(emailHash);
};
const buildOtp = () => `${randomInt(100000, 1000000)}`;
const hashOtp = (userId: string, email: string, code: string) =>
  createHash("sha256").update(`${userId}:${normalizeEmail(email)}:${code}`).digest("hex");
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const resolveLogoUrl = () => {
  const configuredLogoUrl = resendBrandLogoUrl.value().trim().replace(/^"+|"+$/g, "");
  return configuredLogoUrl || defaultBrandLogoUrl();
};

const buildLogoMarkup = () => {
  const logoUrl = resolveLogoUrl();
  return logoUrl
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding:0 12px 0 0;">
            <img src="${logoUrl}" alt="SOSync" width="38" height="38" style="display:block;width:38px;max-width:38px;height:38px;border:0;outline:none;text-decoration:none;" />
          </td>
          <td style="font-size:31px;line-height:1.05;font-weight:700;color:${BRAND_PRIMARY};" class="email-brand">SOSync</td>
        </tr>
      </table>
    `
    : `<p style="margin:0;font-size:31px;line-height:1.05;font-weight:700;color:${BRAND_PRIMARY};" class="email-brand">SOSync</p>`;
};

const buildEmailDocument = ({
  body,
  footer,
  previewText,
  title,
}: {
  body: string;
  footer: string;
  previewText: string;
  title: string;
}) => {
  const logoMarkup = buildLogoMarkup();
  const safePreviewText = escapeHtml(previewText);
  const safeTitle = escapeHtml(title);
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <meta name="color-scheme" content="light dark" />
      <meta name="supported-color-schemes" content="light dark" />
      <title>${safeTitle}</title>
      <style>
        body, table, td, p, a, h1, span {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }

        @media (prefers-color-scheme: dark) {
          .email-shell,
          .email-body {
            background: #151112 !important;
          }

          .email-header,
          .email-main {
            background: #151112 !important;
          }

          .email-brand {
            color: #F7DADF !important;
          }

          .email-footer {
            background: #3A2024 !important;
          }

          .email-copy,
          .email-copy a,
          .email-code,
          .email-signoff,
          .email-link {
            color: #FFF7F7 !important;
          }

          .email-muted {
            color: #E6C9CD !important;
          }

          .email-footer-copy,
          .email-footer-brand {
            color: #F3DDE0 !important;
          }

          .email-button {
            background: #F7DADF !important;
            color: #650B11 !important;
          }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2E2C2C;" class="email-body">
      <div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">
        ${safePreviewText}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:0;" class="email-shell">
        <tr>
          <td align="center" style="padding:0 12px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="max-width:520px;background-color:#FFFFFF;" class="email-content">
              <tr>
                <td bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:38px 30px 18px;" class="email-header">
                  ${logoMarkup}
                </td>
              </tr>
              <tr>
                <td bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:12px 30px 42px;" class="email-main">
                  ${body}
                </td>
              </tr>
              <tr>
                <td bgcolor="${EMAIL_FOOTER}" style="background-color:${EMAIL_FOOTER};padding:26px 30px 28px;" class="email-footer">
                  ${footer}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const buildVerificationEmailHtml = ({ code, email }: { code: string; email: string }) => {
  const safeCode = escapeHtml(code);
  return buildEmailDocument({
    title: "Verify your email",
    previewText: "Use this 6-digit code to finish setting up and secure your SOSync account.",
    body: `
                  <p style="margin:0 0 28px;font-size:18px;line-height:1.65;color:${EMAIL_TEXT};" class="email-copy">
                    Hello,
                  </p>
                  <p style="margin:0 0 34px;font-size:18px;line-height:1.72;color:${EMAIL_TEXT};" class="email-copy">
                    Please enter this code in your SOSync app to finish setting up and secure your account.
                  </p>
                  <p align="center" style="margin:0 0 34px;font-size:50px;line-height:1.05;font-weight:700;letter-spacing:0.04em;color:${BRAND_PRIMARY};" class="email-code">${safeCode}</p>
                  <p style="margin:0 0 22px;font-size:18px;line-height:1.72;color:${EMAIL_TEXT};" class="email-copy">
                    This one-time code expires in 10 minutes.
                  </p>
                  <p style="margin:0 0 26px;font-size:18px;line-height:1.72;color:${EMAIL_TEXT};" class="email-copy">
                    If you did not submit this request, no action is necessary.
                  </p>
                  <p style="margin:0;font-size:18px;line-height:1.72;color:${EMAIL_TEXT};" class="email-signoff">
                    Sincerely,<br />
                    The SOSync Team
                  </p>
    `,
    footer: `
                  <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:${EMAIL_TEXT_MUTED};" class="email-footer-copy email-muted">
                    Need another code? Wait 60 seconds, then request a new one from the verification screen in the app.
                  </p>
                  <p style="margin:0;font-size:12px;line-height:1.6;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND_PRIMARY_SOFT};" class="email-footer-brand">
                    SOSync
                  </p>
    `,
  });
};

const buildPasswordResetEmailHtml = ({ email, resetLink }: { email: string; resetLink: string }) => {
  const safeEmail = escapeHtml(email);
  const safeResetLink = escapeHtml(resetLink);
  return buildEmailDocument({
    title: "Reset your SOSync password",
    previewText: "Create a new password for your SOSync account.",
    body: `
                  <p style="margin:0 0 28px;font-size:18px;line-height:1.65;color:${EMAIL_TEXT};" class="email-copy">
                    Hello,
                  </p>
                  <p style="margin:0 0 30px;font-size:18px;line-height:1.72;color:${EMAIL_TEXT};" class="email-copy">
                    We received a request to reset the password for your SOSync account associated with ${safeEmail}. Click the button below to create a new password.
                  </p>
                  <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 32px;">
                    <tr>
                      <td bgcolor="${BRAND_PRIMARY}" style="background-color:${BRAND_PRIMARY};border-radius:999px;">
                        <a href="${safeResetLink}" style="display:inline-block;padding:15px 28px;border-radius:999px;color:#FFFFFF;font-size:16px;line-height:1.2;font-weight:700;text-decoration:none;" class="email-button">Reset password</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 26px;font-size:18px;line-height:1.72;color:${EMAIL_TEXT};" class="email-copy">
                    If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
                  </p>
                  <p style="margin:0;font-size:18px;line-height:1.72;color:${EMAIL_TEXT};" class="email-signoff">
                    Sincerely,<br />
                    The SOSync Team
                  </p>
    `,
    footer: `
                  <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:${EMAIL_TEXT_MUTED};" class="email-footer-copy email-muted">
                    This button opens Firebase's secure password reset page so you can reset your password.
                  </p>
                  <p style="margin:0;font-size:12px;line-height:1.6;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND_PRIMARY_SOFT};" class="email-footer-brand">
                    SOSYNC
                  </p>
    `,
  });
};

const sendResendEmail = async ({ email, html, subject }: ResendEmailPayload) => {
  const apiKey = resendApiKey.value();
  const from = resendFromEmail.value();

  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Missing RESEND_API_KEY secret for email verification.");
  }

  if (!from) {
    throw new HttpsError("failed-precondition", "Missing RESEND_FROM_EMAIL config for email verification.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html,
    }),
  });

  if (response.ok) {
    return;
  }

  const body = await response.text().catch(() => "");
  throw new HttpsError("internal", body || "Unable to send the email right now.");
};

const sendVerificationEmail = async ({ code, email }: { code: string; email: string }) => {
  await sendResendEmail({
    email,
    subject: "Welcome to SOSync • Verify your email",
    html: buildVerificationEmailHtml({ code, email }),
  });
};

const sendPasswordResetEmail = async ({ email, resetLink }: { email: string; resetLink: string }) => {
  await sendResendEmail({
    email,
    subject: "Reset your SOSync password",
    html: buildPasswordResetEmailHtml({ email, resetLink }),
  });
};

export const sendEmailOtp = onCall<Record<string, never>, Promise<{ resendAvailableAt: string; sentAt: string }>>(
  { region: functionsRegion, secrets: [resendApiKey] },
  async (request) => {
    const userId = assertAuthenticated(request.auth?.uid);
    const user = await adminAuth.getUser(userId);
    const email = normalizeEmail(user.email ?? request.auth?.token.email ?? "");

    if (!email) {
      throw new HttpsError("failed-precondition", "Your account does not have an email address to verify.");
    }

    const now = Date.now();
    const verificationRef = toVerificationRef(userId);
    const verificationSnapshot = await verificationRef.get();
    const existing = verificationSnapshot.data() as EmailVerificationRecord | undefined;

    if (user.emailVerified) {
      const verifiedAt = nowIso();
      await adminDb.collection("users").doc(userId).set(
        {
          email,
          security: {
            emailVerified: true,
            emailVerifiedAt: verifiedAt,
          },
        },
        { merge: true },
      );

      return {
        resendAvailableAt: verifiedAt,
        sentAt: verifiedAt,
      };
    }

    if (
      existing?.resendAvailableAt &&
      new Date(existing.resendAvailableAt).getTime() > now
    ) {
      throw new HttpsError("resource-exhausted", "Wait 60 seconds before requesting another verification code.");
    }

    const code = buildOtp();
    const sentAt = nowIso();
    const resendAvailableAt = new Date(now + RESEND_COOLDOWN_MS).toISOString();
    const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

    await sendVerificationEmail({ code, email });

    await verificationRef.set(
      {
        attemptCount: 0,
        codeHash: hashOtp(userId, email, code),
        email,
        expiresAt,
        purpose: "signup",
        resendAvailableAt,
        sentAt,
        verifiedAt: null,
      } satisfies EmailVerificationRecord,
      { merge: true },
    );

    await adminDb.collection("users").doc(userId).set(
      {
        email,
        onboarding: {
          currentStep: "verify",
        },
        security: {
          emailVerified: false,
        },
      },
      { merge: true },
    );

    return { resendAvailableAt, sentAt };
  },
);

export const sendPasswordReset = onCall<{ email?: string }, Promise<{ sentAt: string }>>(
  { region: functionsRegion, secrets: [resendApiKey] },
  async (request) => {
    const email = normalizeEmail(request.data?.email ?? "");
    if (!email) {
      throw new HttpsError("invalid-argument", "Enter your email.");
    }

    const sentAt = nowIso();
    const now = Date.now();
    const resendAvailableAt = new Date(now + PASSWORD_RESET_COOLDOWN_MS).toISOString();
    const passwordResetRef = toPasswordResetRef(email);
    const passwordResetSnapshot = await passwordResetRef.get();
    const existing = passwordResetSnapshot.data() as PasswordResetRecord | undefined;

    if (
      existing?.resendAvailableAt &&
      new Date(existing.resendAvailableAt).getTime() > now
    ) {
      return { sentAt };
    }

    try {
      const resetLink = await adminAuth.generatePasswordResetLink(email);
      await sendPasswordResetEmail({ email, resetLink });
      await passwordResetRef.set(
        {
          emailHash: passwordResetRef.id,
          resendAvailableAt,
          sentAt,
        } satisfies PasswordResetRecord,
        { merge: true },
      );
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? error.code : "";
      if (code === "auth/user-not-found") {
        await passwordResetRef.set(
          {
            emailHash: passwordResetRef.id,
            resendAvailableAt,
            sentAt,
          } satisfies PasswordResetRecord,
          { merge: true },
        );
        return { sentAt };
      }

      if (code === "auth/invalid-email") {
        throw new HttpsError("invalid-argument", "Enter a valid email address.");
      }

      throw new HttpsError("internal", "Unable to send the password reset email right now.");
    }

    return { sentAt };
  },
);

export const verifyEmailOtp = onCall<{ code?: string }, Promise<{ verifiedAt: string }>>(
  { region: functionsRegion },
  async (request) => {
    const userId = assertAuthenticated(request.auth?.uid);
    const code = sanitizeOtpCode(request.data?.code);

    if (!OTP_CODE_REGEX.test(code)) {
      throw new HttpsError("invalid-argument", "Enter the 6-digit verification code.");
    }

    const user = await adminAuth.getUser(userId);
    const email = normalizeEmail(user.email ?? request.auth?.token.email ?? "");
    if (!email) {
      throw new HttpsError("failed-precondition", "Your account does not have an email address to verify.");
    }

    const verificationRef = toVerificationRef(userId);
    const verificationSnapshot = await verificationRef.get();
    const record = verificationSnapshot.data() as EmailVerificationRecord | undefined;

    if (!record) {
      throw new HttpsError("failed-precondition", "Request a verification code before entering one.");
    }

    if (normalizeEmail(record.email ?? "") !== email) {
      throw new HttpsError("failed-precondition", "Your verification code no longer matches this account.");
    }

    if (record.verifiedAt) {
      return { verifiedAt: record.verifiedAt };
    }

    const attempts = Number(record.attemptCount ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      throw new HttpsError("permission-denied", "Too many incorrect attempts. Request a fresh verification code.");
    }

    if (!record.expiresAt || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new HttpsError("deadline-exceeded", "This verification code expired. Request a new one.");
    }

    if (record.codeHash !== hashOtp(userId, email, code)) {
      await verificationRef.set(
        {
          attemptCount: FieldValue.increment(1),
        },
        { merge: true },
      );
      throw new HttpsError("permission-denied", "The verification code is incorrect.");
    }

    const verifiedAt = nowIso();

    await Promise.all([
      verificationRef.set(
        {
          codeHash: FieldValue.delete(),
          expiresAt: FieldValue.delete(),
          resendAvailableAt: FieldValue.delete(),
          sentAt: FieldValue.delete(),
          verifiedAt,
        },
        { merge: true },
      ),
      adminAuth.updateUser(userId, { emailVerified: true }),
      adminDb.collection("users").doc(userId).set(
        {
          email,
          onboarding: {
            currentStep: "profile",
          },
          security: {
            emailVerified: true,
            emailVerifiedAt: verifiedAt,
          },
        },
        { merge: true },
      ),
    ]);

    return { verifiedAt };
  },
);
