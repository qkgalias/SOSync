import { FormEvent, useEffect, useState } from "react";
import {
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { BrandLockup } from "../components/Brand";
import type { ThemeMode } from "../App";
import { getAuthErrorMessage, getPasswordResetErrorMessage, isValidEmail } from "../errors";
import { auth } from "../firebase";
import heroMap from "../assets/philippines-alert-map.png";

function MailIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M4 6.5h16v11H4z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M7 10h10v9H7z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9 10V8a3 3 0 1 1 6 0v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M3 3l18 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M10.6 10.6a2.6 2.6 0 0 0 2.8 2.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M7.4 7.8C4.3 9.4 2.5 12 2.5 12s3.5 6 9.5 6c1.4 0 2.7-.3 3.8-.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M19.2 15.2c1.5-1.4 2.3-3.2 2.3-3.2S18 6 12 6c-.7 0-1.4.1-2 .2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a7.8 7.8 0 1 0 11.5 11.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="26" viewBox="0 0 24 24" width="26">
      <path d="M12 3.5 19 6v5.4c0 4.2-2.7 7.8-7 9.1-4.3-1.3-7-4.9-7-9.1V6l7-2.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

type LoginDialog = "privacy" | "support" | null;

function LoginInfoDialog({ onClose, type }: { onClose: () => void; type: Exclude<LoginDialog, null> }) {
  const isPrivacy = type === "privacy";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="info-dialog" onMouseDown={onClose} role="presentation">
      <section aria-labelledby={`${type}-dialog-title`} aria-modal="true" className="info-dialog__card" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <button aria-label="Close dialog" className="info-dialog__close" onClick={onClose} type="button">
          ×
        </button>
        <p className="eyebrow">{isPrivacy ? "Privacy Policy" : "Support"}</p>
        <h2 id={`${type}-dialog-title`}>{isPrivacy ? "Admin portal privacy" : "Admin support"}</h2>
        {isPrivacy ? (
          <div className="info-dialog__body">
            <p>
              SOSync Admin is a restricted internal portal. Only administrators
              who have already been granted access by the system owner can sign
              in and use this web app.
            </p>

            <p>
              Regular users, visitors, or unapproved accounts cannot access the
              admin portal, even if they request, apply, or contact support.
            </p>

            <p>
              Access is protected through secure authentication, role-based
              permissions, and admin-only account verification. Admin activity
              may be monitored and logged for security, accountability, and
              system protection.
            </p>

            <p>This portal displays operational data needed to manage:</p>

            <ul>
              <li>Emergency hotline records</li>
              <li>Safety hub and evacuation center records</li>
              <li>Support and incident reports</li>
              <li>Operational timestamps and activity logs</li>
              <li>Limited user-submitted information needed for response handling</li>
            </ul>

            <p>
              Administrators must only access, update, or export data for
              official SOSync management and emergency coordination purposes.
            </p>

            <p>
              Do not share admin credentials, screenshots, exported files, or
              report details with unauthorized persons.
            </p>

            <p>
              SOSync follows a privacy-first approach. Data must be minimized,
              protected, and used only for approved operational purposes.
            </p>

            <p>
              By signing in, you confirm that you are an authorized SOSync
              administrator and accept responsibility for all actions performed
              using your account.
            </p>
          </div>
        ) : (
          <div className="info-dialog__body">
            <p>
              This admin portal is only available to users who have already been
              granted administrator access by the system owner.
            </p>

            <p>
              Access is not open for public registration, user application, or
              general request. If your account has not been granted admin
              permission, you will not be able to access this web app.
            </p>

            <p>
              Support is only provided for authorized administrators who need
              help with portal access, technical issues, or operational data
              updates.
            </p>

            <p>When reporting a technical issue, include:</p>

            <ul>
              <li>Admin email address</li>
              <li>Page or feature affected</li>
              <li>Description of the problem</li>
              <li>Screenshot of the issue, if available</li>
              <li>Date and time the issue happened</li>
              <li>Browser and device used</li>
            </ul>

            <p>
              For data correction requests, clearly identify the affected
              record, such as the hotline, safety hub, evacuation center, or
              report that needs updating.
            </p>

            <p>
              For urgent emergency-related corrections, contact the assigned
              system administrator immediately before making public-facing
              changes.
            </p>

            <p>
              Only granted administrators may request operational updates. All
              changes may be reviewed and logged for security and accountability.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export function LoginScreen({ onToggleTheme, theme }: { onToggleTheme: () => void; theme: ThemeMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dialog, setDialog] = useState<LoginDialog>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const nextFieldErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      nextFieldErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      nextFieldErrors.password = "Enter your password.";
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      return;
    }
    setIsSubmitting(true);
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async () => {
    setError("");
    setNotice("");
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setFieldErrors({ email: "Enter a valid email address." });
      setError("Enter a valid email address before requesting a reset link.");
      return;
    }
    setFieldErrors({});
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setNotice("Password reset email sent.");
    } catch (nextError) {
      setError(getPasswordResetErrorMessage(nextError));
    }
  };

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="login-hero__content">
          <BrandLockup inverse />
          <div className="login-hero__copy">
            <h1>Welcome back</h1>
            <p>Sign in to access the SOSync Admin Portal and manage alerts, evacuation centers, hotlines, support reports, and trusted community data.</p>
          </div>
        </div>
        <div className="login-hero__map" aria-hidden="true">
          <img alt="" src={heroMap} />
          <span className="login-hero__map-glow" />
        </div>
        <div className="login-hero__footer">
          <span aria-hidden="true" className="country-dot" />
          <p>
            <strong>Philippines-first emergency coordination</strong>
            Built for local communities. Backed by trust.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel__utilities" aria-label="Display preferences">
          <button className="theme-toggle theme-toggle--login" onClick={onToggleTheme} type="button">
            {theme === "light" ? <SunIcon /> : <MoonIcon />}
            {theme === "light" ? "Light" : "Dark"}
          </button>
        </div>
        <form className="signin-card" onSubmit={submit}>
          <div>
            <p className="eyebrow">Admin Portal</p>
            <h2>Sign in</h2>
            <p className="muted">Use your administrator account to continue.</p>
          </div>
          <label className="field">
            <span>Email address</span>
            <span className={["input-shell", fieldErrors.email ? "input-shell--invalid" : ""].filter(Boolean).join(" ")}>
              <MailIcon />
              <input
                aria-invalid={Boolean(fieldErrors.email)}
                autoComplete="email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }
                }}
                placeholder="admin@sosync.ph"
                type="email"
                value={email}
              />
            </span>
            {fieldErrors.email ? <small className="field-error">{fieldErrors.email}</small> : null}
          </label>
          <label className="field">
            <span>Password</span>
            <span className={["input-shell", fieldErrors.password ? "input-shell--invalid" : ""].filter(Boolean).join(" ")}>
              <LockIcon />
              <input
                aria-invalid={Boolean(fieldErrors.password)}
                autoComplete="current-password"
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                  }
                }}
                placeholder="••••••••••••••••"
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </span>
            {fieldErrors.password ? <small className="field-error">{fieldErrors.password}</small> : null}
          </label>
          <div className="signin-card__row">
            <span className="session-note">Session ends when this tab closes.</span>
            <button className="text-button" onClick={() => void resetPassword()} type="button">
              Forgot password?
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {notice ? <p className="notice">{notice}</p> : null}
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
          <div className="signin-card__separator">
          </div>
          <div className="authorized-note">
            <ShieldIcon />
            <strong>Authorized administrators only</strong>
          </div>
        </form>
        <footer className="login-panel__footer">
          <span>© 2026 SOSync. All rights reserved.</span>
          <nav aria-label="Login footer">
            <button onClick={() => setDialog("privacy")} type="button">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => setDialog("support")} type="button">Support</button>
          </nav>
        </footer>
        {dialog ? <LoginInfoDialog onClose={() => setDialog(null)} type={dialog} /> : null}
      </section>
    </main>
  );
}
