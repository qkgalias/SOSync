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
    centerId: "manila-don-bosco-1",
    name: "Don Bosco School",
    latitude: 14.59639,
    longitude: 121.02139,
    capacity: 400,
    contact: "(02) 714 7791",
    address: "3500 V. Mapa Extension, Sta. Mesa, Manila",
    city: "Manila",
    province: "Metro Manila",
    islandGroup: "Luzon",
    serviceRadiusKm: 35,
  },
  {
    centerId: "manila-dapitan-sports-1",
    name: "Dapitan Sports Complex",
    latitude: 14.61791,
    longitude: 120.99604,
    capacity: 350,
    contact: "0920 956 1565",
    address: "Instruccion St., Sampaloc, Manila 1008",
    city: "Manila",
    province: "Metro Manila",
    islandGroup: "Luzon",
    serviceRadiusKm: 35,
  },
  {
    centerId: "cebu-talisay-sports-academy-1",
    name: "Talisay Sports Academy Center",
    latitude: 10.2597,
    longitude: 123.8494,
    capacity: 520,
    contact: "TEMP-VERIFY-WITH-LGU",
    address: "Cebu South Coastal Rd, Talisay, Cebu",
    city: "Talisay",
    province: "Cebu",
    islandGroup: "Visayas",
    serviceRadiusKm: 35,
  },
  {
    centerId: "cebu-tabunok-barangay-hall-1",
    name: "Tabunok Barangay Hall",
    latitude: 10.26082,
    longitude: 123.84346,
    capacity: 200,
    contact: "(032) 344 9143",
    address: "7R6V+8CC, Rafael Rabaya Rd, Talisay, 6045 Cebu",
    city: "Talisay",
    province: "Cebu",
    islandGroup: "Visayas",
    serviceRadiusKm: 35,
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
