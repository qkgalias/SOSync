import fs from "node:fs";
import { promises as fsp } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const projectRoot = process.cwd();
const appId = "com.sosync.mobile";
const launchActivity = `${appId}/.MainActivity`;
const metroPortStart = Number(process.env.EXPO_DEV_SERVER_PORT ?? 8081);
const metroPortMax = metroPortStart + 20;
const requestedSerial = process.env.ANDROID_SERIAL ?? "";
const artifactRoot = path.join(os.tmpdir(), "sosync-android-emulator-qa");
const timestamp = new Date().toISOString().replaceAll(":", "-");
const artifactDir = path.join(artifactRoot, timestamp);
const metroLogPath = path.join(artifactDir, "metro.log");
const screenshotPath = path.join(artifactDir, "screenshot.png");
const uiDumpPath = path.join(artifactDir, "ui.xml");
const logcatPath = path.join(artifactDir, "logcat.txt");
const filteredLogcatPath = path.join(artifactDir, "logcat.filtered.txt");
const stateTimelinePath = path.join(artifactDir, "state-timeline.txt");
const launchTimeoutMs = Number(process.env.QA_ANDROID_LAUNCH_TIMEOUT_MS ?? 90_000);
const pollIntervalMs = Number(process.env.QA_ANDROID_POLL_INTERVAL_MS ?? 2_000);

const expoOverlayMarkers = [
  "This is the developer menu",
  "developer menu",
  "development builds",
  "Runtime version:",
  "Bundling",
  "Loading from",
  "Metro waiting on",
  "Open up App.js",
  "TOOLS",
  "Reload",
  "Go home",
  "Toggle performance monitor",
  "Toggle element inspector",
  "Open DevTools",
  "Tools button",
];

const appUiMarkers = [
  "Join the Safety",
  "Already have an account?",
  "Welcome! Enter your email",
  "Sign In",
  "OTP Verification",
  "Enter OTP Code",
  "Name your Trusted Circle",
  "Create your Trusted Circle",
  "Join Using Invite Code",
  "Invite your Trusted Circle",
  "Permission & Privacy",
  "Location Access",
  "Notifications",
  "Report/SOS",
  "Live tracking active",
  "Live tracking paused",
  "SOSync Home",
  "Disaster alerts",
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runCommand = async (command, args, options = {}) => {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: projectRoot,
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });

  return {
    stderr: String(stderr ?? "").trim(),
    stdout: String(stdout ?? "").trim(),
  };
};

const runBufferCommand = async (command, args) => {
  const { stdout } = await execFileAsync(command, args, {
    cwd: projectRoot,
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  });

  return stdout;
};

const isPortAvailable = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });

const canConnectToPort = (port, host) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1_000, () => {
      socket.destroy();
      resolve(false);
    });
  });

const waitForPort = async (port, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const reachable = await canConnectToPort(port, "127.0.0.1")
      || await canConnectToPort(port, "::1")
      || await canConnectToPort(port, "localhost");
    if (reachable) {
      return true;
    }

    await wait(1_000);
  }

  return false;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findAvailablePort = async () => {
  for (let port = metroPortStart; port <= metroPortMax; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No free Metro port found between ${metroPortStart} and ${metroPortMax}.`);
};

const resolveDeviceSerial = async () => {
  const { stdout } = await runCommand("adb", ["devices", "-l"]);
  const devices = stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts[1] === "device")
    .map((parts) => parts[0]);

  if (requestedSerial) {
    if (!devices.includes(requestedSerial)) {
      throw new Error(`Requested Android serial ${requestedSerial} is not connected.`);
    }

    return requestedSerial;
  }

  const emulatorSerial = devices.find((serial) => serial.startsWith("emulator-"));
  if (emulatorSerial) {
    return emulatorSerial;
  }

  throw new Error("No running Android emulator was found. Start one and rerun `npm run qa:android-emulator`.");
};

const startMetroServer = async (port) => {
  const logStream = fs.openSync(metroLogPath, "a");
  const child = spawn(
    "npx",
    ["expo", "start", "--dev-client", "--port", String(port), "--clear"],
    {
      cwd: projectRoot,
      detached: true,
      env: {
        ...process.env,
        CI: "1",
      },
      stdio: ["ignore", logStream, logStream],
    },
  );

  child.unref();
  return child.pid;
};

const readTopActivity = async (serial) => {
  const { stdout } = await runCommand("adb", ["-s", serial, "shell", "dumpsys", "activity", "activities"]);
  const patterns = [
    /topResumedActivity=ActivityRecord\{[^}]*\su\d+\s+([A-Za-z0-9_.$/]+)\s+t\d+/,
    /mResumedActivity:\s*ActivityRecord\{[^}]*\su\d+\s+([A-Za-z0-9_.$/]+)\s+t\d+/,
    /ResumedActivity:\s*ActivityRecord\{[^}]*\su\d+\s+([A-Za-z0-9_.$/]+)\s+t\d+/,
    /topActivity=ComponentInfo\{([A-Za-z0-9_.$/]+)\}/,
  ];

  for (const pattern of patterns) {
    const match = stdout.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
};

const dumpUiXml = async (serial) => {
  const { stdout } = await runCommand("adb", ["-s", serial, "exec-out", "uiautomator", "dump", "/dev/tty"]);
  return `${stdout}\n`;
};

const extractUiTexts = (uiXml) => {
  const texts = new Set();
  const patterns = [/text="([^"]*)"/g, /content-desc="([^"]*)"/g];

  for (const pattern of patterns) {
    for (const match of uiXml.matchAll(pattern)) {
      const value = match[1]?.trim();
      if (value) {
        texts.add(value);
      }
    }
  }

  return [...texts];
};

const findTapPointForLabel = (uiXml, label) => {
  const attributes = ["text", "content-desc"];

  for (const attribute of attributes) {
    const pattern = new RegExp(
      `${attribute}="${escapeRegex(label)}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
      "i",
    );
    const match = uiXml.match(pattern);
    if (!match) {
      continue;
    }

    const [x1, y1, x2, y2] = match.slice(1).map(Number);
    return {
      x: Math.round((x1 + x2) / 2),
      y: Math.round((y1 + y2) / 2),
    };
  }

  return null;
};

const tapScreenPoint = async (serial, point) => {
  await runCommand("adb", ["-s", serial, "shell", "input", "tap", String(point.x), String(point.y)]);
};

const detectUiState = ({ topActivity, uiXml }) => {
  const texts = extractUiTexts(uiXml);
  const matchedExpoMarker = expoOverlayMarkers.find((marker) => texts.some((text) => text.includes(marker)));
  const matchedAppMarker = appUiMarkers.find((marker) => texts.some((text) => text.includes(marker)));
  const isAppActivity = topActivity.includes(`${appId}/.MainActivity`);
  const isDevLauncherActivity = topActivity.includes("DevLauncherActivity");
  const isLauncherActivity = topActivity.includes("launcher") && !topActivity.includes(appId);
  const hasDeveloperOverlay = Boolean(matchedExpoMarker);
  const nonEmptyTextCount = texts.length;

  return {
    hasDeveloperOverlay,
    isAppActivity,
    isDevLauncherActivity,
    isLauncherActivity,
    matchedAppMarker: matchedAppMarker ?? "",
    matchedExpoMarker: matchedExpoMarker ?? "",
    nonEmptyTextCount,
    texts,
  };
};

const waitForAppUi = async (serial) => {
  const deadline = Date.now() + launchTimeoutMs;
  const states = [];
  let lastTopActivity = "";
  let lastUiXml = "";
  let overlayDismissCount = 0;

  while (Date.now() < deadline) {
    const topActivity = await readTopActivity(serial);
    const uiXml = await dumpUiXml(serial);
    const state = detectUiState({ topActivity, uiXml });
    lastTopActivity = topActivity;
    lastUiXml = uiXml;

    states.push(
      [
        new Date().toISOString(),
        `topActivity=${topActivity || "unknown"}`,
        `appActivity=${state.isAppActivity}`,
        `devLauncher=${state.isDevLauncherActivity}`,
        `launcher=${state.isLauncherActivity}`,
        `developerOverlay=${state.hasDeveloperOverlay}`,
        `appMarker=${state.matchedAppMarker || "-"}`,
        `expoMarker=${state.matchedExpoMarker || "-"}`,
        `visibleTextCount=${state.nonEmptyTextCount}`,
      ].join(" "),
    );

    if (state.hasDeveloperOverlay && overlayDismissCount < 6) {
      let dismissedOverlay = false;

      for (const label of ["Continue", "Close"]) {
        const point = findTapPointForLabel(uiXml, label);
        if (point) {
          await tapScreenPoint(serial, point);
          overlayDismissCount += 1;
          dismissedOverlay = true;
          await wait(2_000);
          break;
        }
      }

      if (dismissedOverlay) {
        continue;
      }

      await runCommand("adb", ["-s", serial, "shell", "input", "keyevent", "4"]);
      overlayDismissCount += 1;
      await wait(2_000);
      continue;
    }

    if (state.isLauncherActivity) {
      await fsp.writeFile(stateTimelinePath, `${states.join("\n")}\n`, "utf8");
      return {
        lastTopActivity,
        lastUiXml,
        outcome: "launcher_fallback",
        states,
      };
    }

    if (
      state.isAppActivity
      && !state.hasDeveloperOverlay
      && (state.matchedAppMarker || state.nonEmptyTextCount >= 3)
    ) {
      await fsp.writeFile(stateTimelinePath, `${states.join("\n")}\n`, "utf8");
      return {
        lastTopActivity,
        lastUiXml,
        outcome: "app_ready",
        states,
      };
    }

    await wait(pollIntervalMs);
  }

  await fsp.writeFile(stateTimelinePath, `${states.join("\n")}\n`, "utf8");
  return {
    lastTopActivity,
    lastUiXml,
    outcome: "timeout",
    states,
  };
};

const captureArtifacts = async (serial, uiXmlOverride) => {
  const screenshotBuffer = await runBufferCommand("adb", ["-s", serial, "exec-out", "screencap", "-p"]);
  await fsp.writeFile(screenshotPath, screenshotBuffer);

  const uiDump = uiXmlOverride ?? await dumpUiXml(serial);
  await fsp.writeFile(uiDumpPath, uiDump, "utf8");

  const { stdout: logcat } = await runCommand("adb", ["-s", serial, "logcat", "-d"]);
  await fsp.writeFile(logcatPath, `${logcat}\n`, "utf8");

  const filteredLines = logcat
    .split(/\r?\n/)
    .filter((line) => /(com\.sosync\.mobile|DevLauncher|Expo|ReactNative|Firebase|auth|firestore|functions)/i.test(line));
  await fsp.writeFile(filteredLogcatPath, `${filteredLines.join("\n")}\n`, "utf8");

  return {
    filteredLogcatPath,
    logcatPath,
    screenshotPath,
    uiDumpPath,
  };
};

const launchDevelopmentBuild = async (serial, port) => {
  const devClientUrl = `exp+sosync://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`;

  await runCommand("adb", ["-s", serial, "logcat", "-c"]);
  await runCommand("adb", ["-s", serial, "reverse", `tcp:${port}`, `tcp:${port}`]);
  await runCommand("adb", ["-s", serial, "shell", "am", "force-stop", appId]);
  await runCommand("adb", ["-s", serial, "shell", "am", "start", "-n", launchActivity]);
  await wait(2_000);
  await runCommand("adb", [
    "-s",
    serial,
    "shell",
    "am",
    "start",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    devClientUrl,
    appId,
  ]);
  await wait(8_000);
};

const main = async () => {
  await fsp.mkdir(artifactDir, { recursive: true });

  const serial = await resolveDeviceSerial();
  const port = await findAvailablePort();
  const metroPid = await startMetroServer(port);
  const metroReady = await waitForPort(port, 60_000);

  if (!metroReady) {
    const metroLog = await fsp.readFile(metroLogPath, "utf8").catch(() => "");
    throw new Error(
      `Metro did not start on port ${port} within 60 seconds.\nLog file: ${metroLogPath}\n${metroLog}`,
    );
  }

  await launchDevelopmentBuild(serial, port);
  const appState = await waitForAppUi(serial);
  const artifacts = await captureArtifacts(serial, appState.lastUiXml);

  console.log(`Android emulator QA artifacts: ${artifactDir}`);
  console.log(`Metro log: ${metroLogPath}`);
  console.log(`Metro PID: ${metroPid}`);
  console.log(`ADB serial: ${serial}`);
  console.log(`Metro port: ${port}`);
  console.log(`Top activity: ${appState.lastTopActivity || "unknown"}`);
  console.log(`State timeline: ${stateTimelinePath}`);

  if (appState.outcome !== "app_ready") {
    const failureReason = {
      launcher_fallback: "SOSync returned to the Android launcher before showing the app UI.",
      timeout: "SOSync did not reach a recognizable app screen before the QA timeout.",
    }[appState.outcome] ?? "SOSync did not reach a recognizable app screen.";

    throw new Error(
      [
        failureReason,
        `Screenshot: ${artifacts.screenshotPath}`,
        `UI dump: ${artifacts.uiDumpPath}`,
        `Logcat: ${artifacts.logcatPath}`,
        `Filtered logcat: ${artifacts.filteredLogcatPath}`,
        `State timeline: ${stateTimelinePath}`,
      ].join("\n"),
    );
  }

  console.log(`Screenshot: ${artifacts.screenshotPath}`);
  console.log(`UI dump: ${artifacts.uiDumpPath}`);
  console.log(`Filtered logcat: ${artifacts.filteredLogcatPath}`);
  console.log(`State timeline: ${stateTimelinePath}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
