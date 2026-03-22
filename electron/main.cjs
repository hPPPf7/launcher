const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const appName = "HanBurger";
app.setName(appName);

function getHanBurgerRoot() {
  const configuredRoot = process.env.HANBURGER_HOME;
  if (configuredRoot) {
    return configuredRoot;
  }

  return path.join(app.getPath("documents"), appName);
}

const isDev = !app.isPackaged;
const devUrl = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:3000/desktop";
const prodUrl = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:3000/desktop";

function getStoragePaths() {
  const root = getHanBurgerRoot();
  const paths = {
    root,
    launcher: path.join(root, "launcher"),
    platform: path.join(root, "platform"),
    platformSettings: path.join(root, "platform", "settings.json"),
    installedApps: path.join(root, "platform", "installed-apps.json"),
    windowState: path.join(root, "platform", "window-state.json"),
    apps: path.join(root, "apps"),
    watchRoot: path.join(root, "apps", "watch"),
    watchSettings: path.join(root, "apps", "watch", "settings.json"),
    watchCache: path.join(root, "apps", "watch", "cache"),
    watchMetadataDb: path.join(root, "apps", "watch", "cache", "metadata.db"),
    watchPosters: path.join(root, "apps", "watch", "cache", "posters"),
    watchSync: path.join(root, "apps", "watch", "sync"),
    watchSyncState: path.join(root, "apps", "watch", "sync", "sync-state.json"),
    watchLogs: path.join(root, "apps", "watch", "logs"),
    temp: path.join(root, "temp"),
    logs: path.join(root, "logs"),
  };

  return paths;
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureJsonFile(filePath, initialData) {
  if (fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
}

function ensureStorageStructure() {
  const storagePaths = getStoragePaths();

  [
    storagePaths.root,
    storagePaths.launcher,
    storagePaths.platform,
    storagePaths.apps,
    storagePaths.watchRoot,
    storagePaths.watchCache,
    storagePaths.watchPosters,
    storagePaths.watchSync,
    storagePaths.watchLogs,
    storagePaths.temp,
    storagePaths.logs,
  ].forEach(ensureDirectory);

  ensureJsonFile(storagePaths.platformSettings, {
    theme: "dark",
    launchTo: "home",
  });
  ensureJsonFile(storagePaths.installedApps, {
    apps: [],
  });
  ensureJsonFile(storagePaths.windowState, {
    width: 1440,
    height: 920,
  });
  ensureJsonFile(storagePaths.watchSettings, {
    launchMode: "external-site",
  });
  ensureJsonFile(storagePaths.watchSyncState, {
    lastSyncedAt: null,
  });

  return storagePaths;
}

function readJsonFile(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function registerIpcHandlers(storagePaths) {
  ipcMain.handle("platform:get-installed-apps", () => {
    const payload = readJsonFile(storagePaths.installedApps, { apps: [] });
    return Array.isArray(payload.apps) ? payload.apps : [];
  });

  ipcMain.handle("platform:set-installed-apps", (_event, appIds) => {
    const nextAppIds = Array.isArray(appIds)
      ? appIds.filter((value) => typeof value === "string")
      : [];

    writeJsonFile(storagePaths.installedApps, {
      apps: nextAppIds,
    });

    return nextAppIds;
  });
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#0b0b0c",
    title: "Launcher",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("[electron] did-fail-load", errorCode, errorDescription);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    console.error("[electron] render-process-gone", details);
  });

  if (isDev) {
    window.webContents.openDevTools({ mode: "detach" });
  }

  window.loadURL(isDev ? devUrl : prodUrl);
}

app.whenReady().then(() => {
  const storagePaths = ensureStorageStructure();
  process.env.HANBURGER_ROOT = storagePaths.root;
  registerIpcHandlers(storagePaths);
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
