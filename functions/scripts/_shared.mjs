import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const defaultProjectId = "sosync-3276e";

export const parseArgs = (argv = process.argv.slice(2)) =>
  argv.reduce((accumulator, entry) => {
    if (!entry.startsWith("--")) {
      return accumulator;
    }

    const normalized = entry.slice(2);
    if (!normalized) {
      return accumulator;
    }

    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex === -1) {
      accumulator[normalized] = true;
      return accumulator;
    }

    const key = normalized.slice(0, separatorIndex);
    const value = normalized.slice(separatorIndex + 1);
    accumulator[key] = value;
    return accumulator;
  }, {});

export const getStringArg = (args, key, fallback) => {
  const value = args[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
};

export const requireStringArg = (args, key) => {
  const value = getStringArg(args, key);
  if (!value) {
    throw new Error(`Missing required argument --${key}.`);
  }

  return value;
};

export const getNumberArg = (args, key, fallback) => {
  const value = getStringArg(args, key);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Argument --${key} must be a valid number.`);
  }

  return parsed;
};

export const getFirestoreForLiveProject = (projectId) => {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is set. Unset it before running live Firebase seed scripts.",
    );
  }

  if (!getApps().length) {
    initializeApp({ projectId });
  }

  return getFirestore();
};

export const nowIso = () => new Date().toISOString();

export const withScriptErrorBoundary = async (run) => {
  try {
    await run();
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Unexpected error while running Firebase test-data script.",
    );
    console.error(
      "Authenticate first with `gcloud auth application-default login` or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file with Firestore access.",
    );
    process.exitCode = 1;
  }
};
