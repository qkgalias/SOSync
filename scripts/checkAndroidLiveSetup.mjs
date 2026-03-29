import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const expectedNodeVersion = "v24.14.0";
const expectedProjectId = "sosync-3276e";
const expectedAndroidPackage = "com.sosync.mobile";

const failures = [];
const warnings = [];
const passes = [];

const addFailure = (message) => failures.push(message);
const addWarning = (message) => warnings.push(message);
const addPass = (message) => passes.push(message);

const readFileIfExists = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, "utf8");
};

const parseDotEnv = (content) => {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
};

const resolveFromProject = (relativePath) => path.resolve(projectRoot, relativePath);
const resolveDebugFingerprint = () => {
  const debugKeystorePath = resolveFromProject("android/app/debug.keystore");
  if (!fs.existsSync(debugKeystorePath)) {
    addWarning("android/app/debug.keystore is missing, so the current Android Maps signing fingerprint could not be derived.");
    return;
  }

  try {
    const output = execFileSync(
      "keytool",
      [
        "-list",
        "-v",
        "-keystore",
        debugKeystorePath,
        "-storepass",
        "android",
        "-alias",
        "androiddebugkey",
        "-keypass",
        "android",
      ],
      { encoding: "utf8" },
    );
    const fingerprintMatch = output.match(/SHA1:\s*([A-F0-9:]+)/i);

    if (!fingerprintMatch?.[1]) {
      addWarning("Unable to parse the Android debug signing fingerprint from android/app/debug.keystore.");
      return;
    }

    addPass(`Android debug signing fingerprint resolved: ${fingerprintMatch[1]}.`);
    addWarning(
      `Google Maps Android API key restrictions must allow package ${expectedAndroidPackage} with SHA1 ${fingerprintMatch[1]}.`,
    );
  } catch (error) {
    addWarning(
      `Unable to read android/app/debug.keystore with keytool: ${error instanceof Error ? error.message : "unknown error"}.`,
    );
  }
};

const envPath = resolveFromProject(".env");
const envContent = readFileIfExists(envPath);
if (!envContent) {
  addFailure("Missing .env. Copy .env.example to .env before running the Android smoke test.");
}

const env = envContent ? parseDotEnv(envContent) : {};

if (process.version === expectedNodeVersion) {
  addPass(`Node version matches expected app runtime (${expectedNodeVersion}).`);
} else {
  addWarning(`Node version is ${process.version}. Expected ${expectedNodeVersion} at the repo root.`);
}

resolveDebugFingerprint();

const requiredEnvKeys = [
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FUNCTIONS_REGION",
  "EXPO_PUBLIC_USE_FIREBASE_EMULATORS",
  "EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY",
  "ANDROID_GOOGLE_SERVICES_FILE",
];

for (const key of requiredEnvKeys) {
  if (env[key]) {
    addPass(`${key} is set.`);
  } else {
    addFailure(`${key} is missing from .env.`);
  }
}

if (env.EXPO_PUBLIC_FIREBASE_PROJECT_ID && env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== expectedProjectId) {
  addWarning(
    `EXPO_PUBLIC_FIREBASE_PROJECT_ID is ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}. The documented live project is ${expectedProjectId}.`,
  );
}

if (env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === "false") {
  addPass("Live Firebase mode is enabled for the Android smoke test.");
} else if (env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS) {
  addFailure("EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false for the live Firebase smoke test.");
}

const androidServicesPath = env.ANDROID_GOOGLE_SERVICES_FILE
  ? resolveFromProject(env.ANDROID_GOOGLE_SERVICES_FILE)
  : resolveFromProject("google-services.json");

if (!fs.existsSync(androidServicesPath)) {
  addFailure(`Android Firebase config file not found at ${androidServicesPath}.`);
} else {
  addPass(`Android Firebase config file exists at ${androidServicesPath}.`);
  try {
    const googleServices = JSON.parse(fs.readFileSync(androidServicesPath, "utf8"));
    const projectId = googleServices.project_info?.project_id;
    const clientPackages =
      googleServices.client?.map((client) => client.client_info?.android_client_info?.package_name).filter(Boolean) ?? [];

    if (projectId === (env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || expectedProjectId)) {
      addPass(`google-services.json project_id matches ${projectId}.`);
    } else {
      addFailure(
        `google-services.json project_id is ${projectId ?? "missing"}, expected ${
          env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || expectedProjectId
        }.`,
      );
    }

    if (clientPackages.includes(expectedAndroidPackage)) {
      addPass(`google-services.json contains Android package ${expectedAndroidPackage}.`);
    } else {
      addFailure(`google-services.json does not contain Android package ${expectedAndroidPackage}.`);
    }
  } catch (error) {
    addFailure(
      `Unable to parse ${androidServicesPath}: ${error instanceof Error ? error.message : "unknown error"}.`,
    );
  }
}

const localPropertiesPath = resolveFromProject("android/local.properties");
const localPropertiesContent = readFileIfExists(localPropertiesPath);
if (!localPropertiesContent) {
  addFailure("Missing android/local.properties. Android Studio or Gradle cannot find your SDK without it.");
} else {
  const sdkDirLine = localPropertiesContent
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("sdk.dir="));
  const sdkDir = sdkDirLine ? sdkDirLine.slice("sdk.dir=".length).replace(/\\:/g, ":") : "";

  if (!sdkDir) {
    addFailure("android/local.properties exists, but sdk.dir is missing.");
  } else if (!fs.existsSync(sdkDir)) {
    addFailure(`android/local.properties points to a missing SDK path: ${sdkDir}`);
  } else {
    addPass(`Android SDK path exists: ${sdkDir}`);
  }
}

const firebasercPath = resolveFromProject(".firebaserc");
const firebasercContent = readFileIfExists(firebasercPath);
if (!firebasercContent) {
  addWarning("Missing .firebaserc. Local Firebase CLI commands may target the wrong project.");
} else {
  try {
    const firebaserc = JSON.parse(firebasercContent);
    const defaultProject = firebaserc.projects?.default;
    if (defaultProject === (env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || expectedProjectId)) {
      addPass(`.firebaserc default project matches ${defaultProject}.`);
    } else {
      addWarning(
        `.firebaserc default project is ${defaultProject ?? "missing"}, expected ${
          env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || expectedProjectId
        }.`,
      );
    }
  } catch (error) {
    addWarning(`Unable to parse .firebaserc: ${error instanceof Error ? error.message : "unknown error"}.`);
  }
}

addWarning("Still verify in Firebase console: Email/Password auth, deployed Functions, rules/indexes, and Functions secrets.");
addWarning("Live Firestore test data is not automatic. Run `npm run seed:live-data` before opening Home, Hotlines, and SOS.");

console.log("Android Live Firebase Setup Check");
console.log("");

for (const message of passes) {
  console.log(`PASS  ${message}`);
}

for (const message of warnings) {
  console.log(`WARN  ${message}`);
}

for (const message of failures) {
  console.log(`FAIL  ${message}`);
}

console.log("");
console.log(`Summary: ${passes.length} passed, ${warnings.length} warnings, ${failures.length} failures.`);

if (failures.length) {
  process.exitCode = 1;
}
