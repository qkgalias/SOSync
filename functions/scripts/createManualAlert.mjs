import {
  defaultProjectId,
  getFirestoreForLiveProject,
  getNumberArg,
  getStringArg,
  nowIso,
  parseArgs,
  requireStringArg,
  withScriptErrorBoundary,
} from "./_shared.mjs";

const usage = `Usage:
  npm --prefix functions run seed:manual-alert -- --groupId=<groupId>
  npm --prefix functions run seed:manual-alert -- --groupId=<groupId> --type=flood --severity=warning

Creates one live Firestore alert document for a specific trusted circle so the Alerts tab can be tested deterministically.`;

const validTypes = new Set(["flood", "storm", "evacuation"]);
const validSeverities = new Set(["advisory", "watch", "warning", "critical"]);

const args = parseArgs();
if (args.help) {
  console.log(usage);
  process.exit(0);
}

await withScriptErrorBoundary(async () => {
  const projectId = getStringArg(args, "projectId", defaultProjectId) ?? defaultProjectId;
  const groupId = requireStringArg(args, "groupId");
  const type = getStringArg(args, "type", "flood") ?? "flood";
  const severity = getStringArg(args, "severity", "watch") ?? "watch";

  if (!validTypes.has(type)) {
    throw new Error(`Invalid --type value: ${type}. Use flood, storm, or evacuation.`);
  }

  if (!validSeverities.has(severity)) {
    throw new Error(
      `Invalid --severity value: ${severity}. Use advisory, watch, warning, or critical.`,
    );
  }

  const createdAt = nowIso();
  const alertId =
    getStringArg(args, "alertId") ??
    `manual-${groupId}-${type}-${createdAt.replace(/[:.]/g, "-")}`;

  const title =
    getStringArg(args, "title") ??
    (type === "evacuation" ? "Evacuation advisory for your circle" : "Manual disaster alert for testing");
  const message =
    getStringArg(args, "message") ??
    "This is a manually created alert for Android smoke testing. Open the alert detail screen to verify the current UI.";
  const latitude = getNumberArg(args, "latitude", 14.5995);
  const longitude = getNumberArg(args, "longitude", 120.9842);
  const source = getStringArg(args, "source", "manual") ?? "manual";

  const db = getFirestoreForLiveProject(projectId);
  await db.collection("alerts").doc(alertId).set(
    {
      alertId,
      groupId,
      type,
      severity,
      source,
      title,
      message,
      latitude,
      longitude,
      createdAt,
    },
    { merge: true },
  );

  console.log(`Created manual alert ${alertId} for group ${groupId} in live project ${projectId}.`);
});
