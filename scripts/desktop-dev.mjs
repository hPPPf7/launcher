import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const desktopPath = "/desktop";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function getUrl(port) {
  return `http://${host}:${port}`;
}

function waitForServer(url, timeoutMs = 120000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      console.log(`[desktop:dev] checking ${url}`);
      const request = http.get(url, (response) => {
        response.resume();
        console.log(`[desktop:dev] server ready: ${url}`);
        resolve();
      });

      request.setTimeout(3000, () => {
        request.destroy(new Error("REQUEST_TIMEOUT"));
      });

      request.on("error", (error) => {
        if (Date.now() - start >= timeoutMs) {
          reject(
            new Error(
              `Timed out waiting for ${url}${error instanceof Error ? `: ${error.message}` : ""}`
            )
          );
          return;
        }
        setTimeout(tryOnce, 1000);
      });
    };

    tryOnce();
  });
}

function getAvailablePort(startPort = 3000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.unref();
    server.on("error", (error) => {
      if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
        resolve(getAvailablePort(startPort + 1));
        return;
      }
      reject(error);
    });

    server.listen(startPort, () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
          return;
        }
        reject(new Error("PORT_RESOLUTION_FAILED"));
      });
    });
  });
}

function getNetstatCommand() {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/c", "netstat -ano -p tcp"],
    };
  }

  return {
    command: "sh",
    args: ["-lc", "lsof -nP -iTCP -sTCP:LISTEN"],
  };
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr || `Command failed: ${command} ${args.join(" ")}`));
    });
  });
}

async function findListeningPid(port) {
  if (process.platform !== "win32") {
    return null;
  }

  const { command, args } = getNetstatCommand();
  const { stdout } = await runCommand(command, args);
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!line.includes(`:${port}`)) continue;
    if (!line.includes("LISTENING")) continue;
    const parts = line.split(/\s+/);
    const pid = parts.at(-1);
    if (pid && /^\d+$/.test(pid)) {
      return Number(pid);
    }
  }

  return null;
}

async function getWindowsProcessCommandLine(pid) {
  const escaped = `$p = Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\"; if ($p) { $p.CommandLine }`;
  const { stdout } = await runCommand("powershell", ["-NoProfile", "-Command", escaped]);
  return stdout.trim();
}

async function findReusableLauncherPort(startPort = 3000, endPort = 3010) {
  if (process.platform !== "win32") {
    return null;
  }

  for (let port = startPort; port <= endPort; port += 1) {
    const pid = await findListeningPid(port);
    if (!pid) continue;

    const commandLine = await getWindowsProcessCommandLine(pid).catch(() => "");
    if (
      commandLine.includes("next") &&
      commandLine.includes(projectRoot)
    ) {
      return { port, pid };
    }
  }

  return null;
}

function spawnCommand(command, args, extraEnv = {}) {
  if (process.platform === "win32") {
    const isCmdFile =
      command.endsWith(".cmd") || command.endsWith(".bat") || command === "npm";

    if (isCmdFile) {
      return spawn("cmd.exe", ["/c", command, ...args], {
        stdio: "inherit",
        shell: false,
        env: {
          ...process.env,
          ...extraEnv,
        },
      });
    }
  }

  return spawn(command, args, {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
}

const electronBin =
  process.platform === "win32"
    ? path.join(projectRoot, "node_modules", ".bin", "electron.cmd")
    : path.join(projectRoot, "node_modules", ".bin", "electron");

const reusable = await findReusableLauncherPort();
const port = reusable ? reusable.port : await getAvailablePort(3000);
const baseUrl = getUrl(port);
const rendererUrl = `${baseUrl}${desktopPath}`;

console.log(`[desktop:dev] using port ${port}`);

let nextDev = null;
let electronProcess = null;

if (reusable) {
  console.log(`[desktop:dev] reusing existing launcher dev server (PID ${reusable.pid})`);
} else {
  console.log("[desktop:dev] starting next dev server");
  nextDev = spawnCommand("npm", ["run", "dev"], {
    PORT: String(port),
    HOSTNAME: host,
  });

  nextDev.on("exit", (code) => {
    if (electronProcess && !electronProcess.killed) {
      electronProcess.kill();
    }
    process.exit(code ?? 0);
  });
}

const shutdown = () => {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  if (nextDev && !nextDev.killed) {
    nextDev.kill();
  }
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

await waitForServer(baseUrl);

console.log("[desktop:dev] launching electron");
electronProcess = spawnCommand(electronBin, [".", "--trace-warnings"], {
  ELECTRON_RENDERER_URL: rendererUrl,
});

electronProcess.on("exit", () => {
  console.log("[desktop:dev] electron exited");
  if (nextDev && !nextDev.killed) {
    nextDev.kill();
  }
});
