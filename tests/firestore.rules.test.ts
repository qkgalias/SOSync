/** Purpose: Guard the privacy-critical Firestore rules when the emulator is available. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const rules = readFileSync(resolve(__dirname, "../firestore.rules"), "utf8");
const describeIfEmulator = emulatorHost ? describe : describe.skip;

describeIfEmulator("firestore rules", () => {
  let assertFails: any;
  let assertSucceeds: any;
  let initializeTestEnvironment: any;
  let testEnv: any;

  beforeAll(async () => {
    const rulesTesting = await import("@firebase/rules-unit-testing");
    assertFails = rulesTesting.assertFails;
    assertSucceeds = rulesTesting.assertSucceeds;
    initializeTestEnvironment = rulesTesting.initializeTestEnvironment;

    const [host, rawPort] = String(emulatorHost).split(":");
    testEnv = await initializeTestEnvironment({
      projectId: "sosync-rules-test",
      firestore: {
        host,
        port: Number(rawPort),
        rules,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      const db = context.firestore();
      await db.collection("groups").doc("group-1").set({
        name: "Family Response Circle",
        createdBy: "user-1",
        membersCount: 2,
      });
      await db.collection("groups").doc("group-1").collection("members").doc("user-1").set({
        userId: "user-1",
        role: "admin",
      });
      await db.collection("groups").doc("group-1").collection("members").doc("user-2").set({
        userId: "user-2",
        role: "member",
      });
      await db.collection("alerts").doc("alert-1").set({
        groupId: "group-1",
        title: "Flood risk rising",
        message: "Heavy rainfall expected.",
        createdAt: new Date().toISOString(),
      });
    });
  });

  it("allows a user to update their own profile", async () => {
    const db = testEnv.authenticatedContext("user-1").firestore();
    await assertSucceeds(
      db.collection("users").doc("user-1").set({
        name: "Responder One",
        onboarding: { currentStep: "complete" },
      }),
    );
  });

  it("blocks a user from updating another profile", async () => {
    const db = testEnv.authenticatedContext("user-2").firestore();
    await assertFails(
      db.collection("users").doc("user-1").set({
        name: "Intruder",
      }),
    );
  });

  it("allows group members to read scoped alerts", async () => {
    const db = testEnv.authenticatedContext("user-2").firestore();
    await assertSucceeds(db.collection("alerts").doc("alert-1").get());
  });
});
