import { FieldValue } from "firebase-admin/firestore";

import {
  defaultProjectId,
  getFirestoreForLiveProject,
  getStringArg,
  parseArgs,
  withScriptErrorBoundary,
} from "./_shared.mjs";

const PH = "PH";
const REGIONS = {
  NCR: { code: "1300000000", islandGroup: "Luzon", name: "National Capital Region (NCR)" },
  IVA: { code: "0400000000", islandGroup: "Luzon", name: "Region IV-A (CALABARZON)" },
  VII: { code: "0700000000", islandGroup: "Visayas", name: "Region VII (Central Visayas)" },
};

const normalize = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export const inferEvacuationCenterRegion = (center) => {
  const city = normalize(center?.city);
  const province = normalize(center?.province);
  const region = normalize(center?.region);
  const regionCode = String(center?.regionCode ?? "").trim();

  const existingRegion = Object.values(REGIONS).find((entry) => entry.code === regionCode);
  if (existingRegion) return existingRegion;

  if (["quezon city", "manila", "pasig", "pasig city"].includes(city) || ["metro manila", "kalakhang maynila"].includes(province)) {
    return REGIONS.NCR;
  }
  if (city === "antipolo" || city === "antipolo city" || province === "rizal" || region.includes("calabarzon")) {
    return REGIONS.IVA;
  }
  if (["talisay", "talisay city"].includes(city) && (province === "cebu" || region.includes("central visayas"))) {
    return REGIONS.VII;
  }
  return null;
};

export const getEvacuationCenterGeographyUpdate = (center) => {
  const inferred = inferEvacuationCenterRegion(center);
  const update = {};
  if (inferred && (
    center?.countryCode !== PH ||
    center?.islandGroup !== inferred.islandGroup ||
    center?.region !== inferred.name ||
    center?.regionCode !== inferred.code
  )) {
    Object.assign(update, {
      countryCode: PH,
      islandGroup: inferred.islandGroup,
      region: inferred.name,
      regionCode: inferred.code,
    });
  }
  if (Object.prototype.hasOwnProperty.call(center ?? {}, "province")) {
    update.province = FieldValue.delete();
  }
  return Object.keys(update).length ? update : null;
};

const run = async () => {
  const args = parseArgs();
  const projectId = getStringArg(args, "projectId", defaultProjectId);
  const apply = args.apply === true;
  const db = getFirestoreForLiveProject(projectId);
  const snapshot = await db.collection("evacuation_centers").get();
  const updates = [];
  const unresolved = [];
  const invalidContacts = [];

  for (const centerDoc of snapshot.docs) {
    const center = centerDoc.data();
    const inferred = inferEvacuationCenterRegion(center);
    const contact = String(center.contact ?? "").trim();
    const contactDigits = contact.replace(/\D/g, "");
    if (!/^[+()\d\s.-]+$/.test(contact) || contactDigits.length < 7 || contactDigits.length > 11) {
      invalidContacts.push({ centerId: centerDoc.id, contact, name: center.name ?? "Unnamed evacuation center" });
    }
    if (!inferred) {
      unresolved.push({
        centerId: centerDoc.id,
        city: center.city ?? null,
        name: center.name ?? "Unnamed evacuation center",
        province: center.province ?? null,
        region: center.region ?? null,
      });
    }
    const update = getEvacuationCenterGeographyUpdate(center);
    if (!update) continue;
    updates.push({
      centerId: centerDoc.id,
      from: {
        countryCode: center.countryCode ?? null,
        islandGroup: center.islandGroup ?? null,
        province: center.province ?? null,
        region: center.region ?? null,
        regionCode: center.regionCode ?? null,
      },
      name: center.name ?? "Unnamed evacuation center",
      to: {
        countryCode: update.countryCode ?? center.countryCode ?? null,
        islandGroup: update.islandGroup ?? center.islandGroup ?? null,
        province: null,
        region: update.region ?? center.region ?? null,
        regionCode: update.regionCode ?? center.regionCode ?? null,
      },
    });
    if (apply) await centerDoc.ref.update(update);
  }

  console.log(JSON.stringify({ applied: apply, centersScanned: snapshot.size, invalidContacts, projectId, unresolved, updates }, null, 2));
  if (!apply && updates.length) console.log("Dry run only. Re-run with --apply after reviewing these records.");
  if (unresolved.length) console.log("Unresolved geography was not guessed. Province removal can still be applied independently.");
  if (invalidContacts.length) console.log("Invalid contacts were not changed. Update them in the admin portal before editing those centers.");
};

await withScriptErrorBoundary(run);
