const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("launcherRuntime", {
  runtime: "electron",
  rootPath: process.env.HANBURGER_ROOT ?? null,
  getInstalledApps: () => ipcRenderer.invoke("platform:get-installed-apps"),
  setInstalledApps: (appIds) =>
    ipcRenderer.invoke("platform:set-installed-apps", appIds),
});
