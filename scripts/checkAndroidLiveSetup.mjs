import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const expectedNodeVersion = "v24.14.0";
const expectedProjectId = "sosync-3276e";
const expectedAndroidPackage = "com.sosync.mobile";
const latestKnownEasPreviewSha1 = "36:12:0E:32:63:5B:FE:8C:3A:03:42:FC:59:A3:E3:2A:CD:A1:66:EC";

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

const normalizeSha1 = (value) => value.toUpperCase().replace(/[^A-F0-9]/g, "").match(/.{1,2}/g)?.join(":") ?? value;

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

const resolveApkFingerprint = () => {
  const apkPath = process.env.SOSYNC_ANDROID_APK_PATH;
  if (!apkPath) {
    addPass(`Latest known EAS preview signing SHA1: ${latestKnownEasPreviewSha1}.`);
    addWarning(
      `Google Maps Android API key restrictions must allow package ${expectedAndroidPackage} with EAS preview SHA1 ${latestKnownEasPreviewSha1}.`,
    );
    addWarning("Set SOSYNC_ANDROID_APK_PATH=/path/to/app.apk to verify the APK signing certificate directly.");
    return;
  }

  const resolvedApkPath = path.resolve(projectRoot, apkPath);
  if (!fs.existsSync(resolvedApkPath)) {
    addWarning(`SOSYNC_ANDROID_APK_PATH points to a missing APK: ${resolvedApkPath}`);
    return;
  }

  const buildToolsRoot = path.join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? "", "build-tools");
  const buildToolsVersion = fs.existsSync(buildToolsRoot)
    ? fs.readdirSync(buildToolsRoot).sort().at(-1)
    : null;
  const apksignerPath = buildToolsVersion ? path.join(buildToolsRoot, buildToolsVersion, "apksigner") : "apksigner";

  try {
    const output = execFileSync(apksignerPath, ["verify", "--print-certs", resolvedApkPath], { encoding: "utf8" });
    const fingerprintMatch = output.match(/SHA-1 digest:\s*([a-f0-9]+)/i);
    if (!fingerprintMatch?.[1]) {
      addWarning(`Unable to parse APK signing SHA1 from ${resolvedApkPath}.`);
      return;
    }

    const sha1 = normalizeSha1(fingerprintMatch[1]);
    addPass(`APK signing fingerprint resolved: ${sha1}.`);
    addWarning(
      `Google Maps Android API key restrictions must allow package ${expectedAndroidPackage} with APK SHA1 ${sha1}.`,
    );
  } catch (error) {
    addWarning(
      `Unable to inspect APK signing certificate with apksigner: ${error instanceof Error ? error.message : "unknown error"}.`,
    );
  }
};

const verifyGeneratedAndroidRequirement = (label, condition, failureMessage) => {
  if (condition) {
    addPass(label);
  } else {
    addFailure(failureMessage);
  }
};

const verifyNavigationSdkRequirements = () => {
  const gradleProperties = readFileIfExists(resolveFromProject("android/gradle.properties"));
  const appBuildGradle = readFileIfExists(resolveFromProject("android/app/build.gradle"));
  const androidManifest = readFileIfExists(resolveFromProject("android/app/src/main/AndroidManifest.xml"));
  const packageJson = readFileIfExists(resolveFromProject("package.json"));

  if (!gradleProperties) {
    addWarning("android/gradle.properties is missing; run a clean Android prebuild before inspecting Navigation SDK requirements.");
  } else {
    verifyGeneratedAndroidRequirement(
      "React Native new architecture is enabled for Android.",
      /newArchEnabled\s*=\s*true/.test(gradleProperties),
      "android/gradle.properties must set newArchEnabled=true for Google Navigation SDK.",
    );
    verifyGeneratedAndroidRequirement(
      "AndroidX Jetifier is enabled for Navigation SDK compatibility.",
      /android\.enableJetifier\s*=\s*true/.test(gradleProperties),
      "android/gradle.properties must set android.enableJetifier=true for Google Navigation SDK.",
    );
  }

  if (!appBuildGradle) {
    addWarning("android/app/build.gradle is missing; run a clean Android prebuild before inspecting Gradle requirements.");
  } else {
    const minSdkMatch = appBuildGradle.match(/minSdkVersion\s+rootProject\.ext\.minSdkVersion|minSdk\s+rootProject\.ext\.minSdkVersion|minSdkVersion\s+(\d+)|minSdk\s+(\d+)/);
    const targetSdkMatch = appBuildGradle.match(/targetSdkVersion\s+rootProject\.ext\.targetSdkVersion|targetSdk\s+rootProject\.ext\.targetSdkVersion|targetSdkVersion\s+(\d+)|targetSdk\s+(\d+)/);
    const minSdk = Number(gradleProperties?.match(/android\.minSdkVersion\s*=\s*(\d+)/)?.[1] ?? minSdkMatch?.[1] ?? minSdkMatch?.[2] ?? 0);
    const targetSdk = Number(gradleProperties?.match(/android\.targetSdkVersion\s*=\s*(\d+)/)?.[1] ?? targetSdkMatch?.[1] ?? targetSdkMatch?.[2] ?? 0);

    verifyGeneratedAndroidRequirement(
      `Android minSdkVersion satisfies Navigation SDK (${minSdk}).`,
      minSdk >= 24,
      `Android minSdkVersion must be 24 or higher for Navigation SDK; found ${minSdk || "unknown"}.`,
    );
    verifyGeneratedAndroidRequirement(
      `Android targetSdkVersion satisfies Navigation SDK (${targetSdk}).`,
      targetSdk >= 36,
      `Android targetSdkVersion must be 36 or higher for Navigation SDK 7.x; found ${targetSdk || "unknown"}.`,
    );
    verifyGeneratedAndroidRequirement(
      "Core library desugaring is enabled in android/app/build.gradle.",
      /coreLibraryDesugaringEnabled\s+true/.test(appBuildGradle) &&
        /coreLibraryDesugaring\s*\(?["']com\.android\.tools:desugar_jdk_libs_nio:2\.0\.4["']\)?/.test(appBuildGradle),
      "android/app/build.gradle must enable core library desugaring and include desugar_jdk_libs_nio 2.0.4.",
    );
  }

  if (!androidManifest) {
    addWarning("android/app/src/main/AndroidManifest.xml is missing; run a clean Android prebuild before inspecting the manifest.");
  } else {
    verifyGeneratedAndroidRequirement(
      "Android manifest contains com.google.android.geo.API_KEY metadata.",
      /com\.google\.android\.geo\.API_KEY/.test(androidManifest),
      "Android manifest must contain com.google.android.geo.API_KEY metadata for Maps/Navigation SDK.",
    );
  }

  if (!packageJson) {
    addWarning("package.json is missing; dependency checks were skipped.");
  } else {
    try {
      const parsedPackage = JSON.parse(packageJson);
      const allDependencies = {
        ...(parsedPackage.dependencies ?? {}),
        ...(parsedPackage.devDependencies ?? {}),
      };
      verifyGeneratedAndroidRequirement(
        "react-native-maps is not installed alongside Google Navigation SDK.",
        !allDependencies["react-native-maps"],
        "Remove react-native-maps before using Google Navigation SDK; the SDK replaces Maps SDK surfaces.",
      );
      verifyGeneratedAndroidRequirement(
        "Google React Native Navigation SDK dependency is installed.",
        Boolean(allDependencies["@googlemaps/react-native-navigation-sdk"]),
        "@googlemaps/react-native-navigation-sdk must be installed for Home map and in-app navigation.",
      );
    } catch (error) {
      addWarning(`Unable to parse package.json for dependency checks: ${error instanceof Error ? error.message : "unknown error"}.`);
    }
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
resolveApkFingerprint();

const requiredEnvKeys = [
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FUNCTIONS_REGION",
  "EXPO_PUBLIC_USE_FIREBASE_EMULATORS",
  "EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY",
  "ANDROID_GOOGLE_SERVICES_FILE",
];

verifyNavigationSdkRequirements();

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

addWarning("Run `npm run doctor:backend-release` before release smoke testing to verify backend rules, indexes, Storage, and Functions files.");
addWarning("Still verify in Firebase console: Email/Password auth, default Storage bucket, deployed Functions, rules/indexes, and Functions secrets.");
addWarning("Verify live backend flows after deploy: email OTP, avatar upload, support/report submission, flood lookup, and push token registration.");
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
