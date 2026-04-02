import {
  defaultProjectId,
  getFirestoreForLiveProject,
  getStringArg,
  nowIso,
  parseArgs,
  withScriptErrorBoundary,
} from "./_shared.mjs";

const usage = `Usage:
  npm --prefix functions run seed:test-data
  npm --prefix functions run seed:test-data -- --projectId=sosync-3276e --region=PH

Seeds live Firestore with the minimum evacuation-center and hotline data needed for Android smoke tests.`;

const defaultCenters = [
  {
    centerId: "ncr-1",
    name: "Manila Civic Relief Hall",
    latitude: 14.6042,
    longitude: 120.9822,
    capacity: 450,
    contact: "+63 2 8000 1000",
    address: "Taft Avenue, Manila",
  },
  {
    centerId: "ncr-2",
    name: "Pasig Community Shelter",
    latitude: 14.5764,
    longitude: 121.0851,
    capacity: 320,
    contact: "+63 2 8000 2000",
    address: "Capitol Drive, Pasig",
  },
];

const defaultHotlines = [
  {
    hotlineId: "911",
    name: "National Emergency Hotline",
    phone: "911",
    description: "Police, fire, and medical emergency dispatch.",
  },
  {
    hotlineId: "red-cross",
    name: "Philippine Red Cross",
    phone: "143",
    description: "First aid, rescue support, and blood services.",
  },
  {
    hotlineId: "ndrrmc",
    name: "NDRRMC Operations Center",
    phone: "(02) 8911-5061",
    description: "National disaster coordination and relief response.",
  },
  {
    hotlineId: "pnp-talisay",
    name: "Philippine National Police (PNP)",
    phone: "273-4480",
    description: "Talisay City Hall police contact.",
  },
  {
    hotlineId: "bfp-talisay",
    name: "Bureau of Fire Protection (BFP)",
    phone: "272-8277",
    description: "Talisay City Hall fire response contact.",
  },
  {
    hotlineId: "talisay-drrmo",
    name: "Talisay City DRRMO Rescue",
    phone: "0999-969-5555",
    description: "City disaster risk reduction and rescue hotline.",
  },
  {
    hotlineId: "tabunok-hall",
    name: "Barangay Tabunok Hall",
    phone: "462-1932",
    description: "Local barangay office contact in Tabunok, Talisay.",
  },
];

const args = parseArgs();
if (args.help) {
  console.log(usage);
  process.exit(0);
}

await withScriptErrorBoundary(async () => {
  const projectId = getStringArg(args, "projectId", defaultProjectId) ?? defaultProjectId;
  const region = getStringArg(args, "region", "PH") ?? "PH";
  const db = getFirestoreForLiveProject(projectId);
  const batch = db.batch();
  const seededAt = nowIso();

  for (const center of defaultCenters) {
    batch.set(
      db.collection("evacuation_centers").doc(center.centerId),
      {
        ...center,
        region,
        updatedAt: seededAt,
      },
      { merge: true },
    );
  }

  for (const hotline of defaultHotlines) {
    batch.set(
      db.collection("emergency_hotlines").doc(hotline.hotlineId),
      {
        ...hotline,
        region,
        updatedAt: seededAt,
      },
      { merge: true },
    );
  }

  await batch.commit();

  console.log(
    `Seeded ${defaultCenters.length} evacuation centers and ${defaultHotlines.length} hotlines into live project ${projectId}.`,
  );
});
