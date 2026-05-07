import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const failures = [];
const warnings = [];
const passes = [];

const addFailure = (message) => failures.push(message);
const addWarning = (message) => warnings.push(message);
const addPass = (message) => passes.push(message);
const exists = (relativePath) => fs.existsSync(path.resolve(projectRoot, relativePath));

const readJson = (relativePath) => {
  const fullPath = path.resolve(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    addFailure(`Unable to parse ${relativePath}: ${error instanceof Error ? error.message : "unknown error"}.`);
    return null;
  }
};

const requireFile = (relativePath, label) => {
  if (exists(relativePath)) {
    addPass(`${label} exists at ${relativePath}.`);
  } else {
    addFailure(`${label} is missing at ${relativePath}.`);
  }
};

requireFile("firebase.json", "Firebase deploy config");
requireFile("firestore.rules", "Firestore rules");
requireFile("firestore.indexes.json", "Firestore indexes");
requireFile("storage.rules", "Storage rules");
requireFile("functions/src/index.ts", "Cloud Functions entrypoint");

const firebaseJson = readJson("firebase.json");
if (firebaseJson?.functions && firebaseJson?.firestore && firebaseJson?.storage) {
  addPass("firebase.json includes Functions, Firestore, and Storage config.");
} else {
  addFailure("firebase.json must include Functions, Firestore, and Storage config before backend deploy.");
}

const indexes = readJson("firestore.indexes.json");
const hasMembersUserIdIndex = indexes?.fieldOverrides?.some(
  (index) =>
    index.collectionGroup === "members" &&
    index.fieldPath === "userId" &&
    index.indexes?.some((entry) => entry.queryScope === "COLLECTION_GROUP"),
);
if (hasMembersUserIdIndex) {
  addPass("members.userId collection-group index is declared.");
} else {
  addFailure("members.userId collection-group index is missing from firestore.indexes.json.");
}

const storageRules = exists("storage.rules") ? fs.readFileSync(path.resolve(projectRoot, "storage.rules"), "utf8") : "";
if (storageRules.includes("match /avatars/{userId}/{fileName}")) {
  addPass("Storage rules include owner-scoped avatar uploads.");
} else {
  addFailure("Storage rules must include owner-scoped avatar uploads.");
}

if (storageRules.includes("match /branding/{fileName}")) {
  addPass("Storage rules include public branding reads.");
} else {
  addFailure("Storage rules must include public branding reads for email assets.");
}

if (storageRules.includes("match /supportReports/{userId}/{reportId}/{fileName}")) {
  addPass("Storage rules include owner-scoped support report media uploads.");
} else {
  addFailure("Storage rules must include report media upload restrictions.");
}

const envExample = exists(".env.example") ? fs.readFileSync(path.resolve(projectRoot, ".env.example"), "utf8") : "";
if (envExample.includes("EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY")) {
  addPass(".env.example documents the Android Maps key.");
} else {
  addWarning(".env.example should document EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY.");
}

addWarning("Verify in Firebase Console: default Storage bucket exists and Email/Password auth is enabled.");
addWarning("Verify Functions config/secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, optional RESEND_BRAND_LOGO_URL, GOOGLE_FLOOD_FORECASTING_API_KEY, and GOOGLE_MAPS_DIRECTIONS_API_KEY.");
addWarning("Verify Google Cloud Console: Android Maps key allows com.sosync.mobile for debug and release SHA1 fingerprints.");
addWarning("After deploy, run live smoke checks for OTP email, avatar upload, support report submission, flood lookup, and push token registration.");

console.log("SOSync Backend Release Readiness Check\n");
passes.forEach((message) => console.log(`PASS  ${message}`));
warnings.forEach((message) => console.log(`WARN  ${message}`));
failures.forEach((message) => console.log(`FAIL  ${message}`));
console.log(`\nSummary: ${passes.length} passed, ${warnings.length} warnings, ${failures.length} failures.`);

if (failures.length) {
  process.exitCode = 1;
}
