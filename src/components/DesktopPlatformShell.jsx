"use client";

import { useEffect, useMemo, useState } from "react";
import { desktopApps, getDesktopApp } from "@/lib/desktopApps";

const STORAGE_KEY = "launcher-installed-apps";

function readInstalledApps() {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? JSON.parse(raw) : [];

  return desktopApps
    .map((app) => app.id)
    .filter((id) => Array.isArray(parsed) && parsed.includes(id));
}

function writeInstalledApps(installedIds) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(installedIds));
  window.dispatchEvent(new Event("launcher-installed-apps-changed"));
}

async function readInstalledAppsFromRuntime() {
  if (typeof window === "undefined") return [];
  if (window.launcherRuntime?.getInstalledApps) {
    try {
      const installedIds = await window.launcherRuntime.getInstalledApps();
      return desktopApps
        .map((app) => app.id)
        .filter((id) => Array.isArray(installedIds) && installedIds.includes(id));
    } catch {
      return readInstalledApps();
    }
  }
  return readInstalledApps();
}

async function writeInstalledAppsToRuntime(installedIds) {
  if (typeof window === "undefined") return installedIds;
  if (window.launcherRuntime?.setInstalledApps) {
    try {
      const nextInstalledIds = await window.launcherRuntime.setInstalledApps(installedIds);
      window.dispatchEvent(new Event("launcher-installed-apps-changed"));
      return Array.isArray(nextInstalledIds) ? nextInstalledIds : installedIds;
    } catch {
      writeInstalledApps(installedIds);
      return installedIds;
    }
  }

  writeInstalledApps(installedIds);
  return installedIds;
}

function RailButton({ label, active, onClick, installed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rail-button ${active ? "is-active" : ""} ${installed ? "is-installed" : ""}`}
      title={label}
      aria-label={label}
    >
      <span>{label.slice(0, 1).toUpperCase()}</span>
    </button>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="info-card">
      <p className="info-label">{label}</p>
      <p className="info-value">{value}</p>
    </div>
  );
}

export default function DesktopPlatformShell() {
  const [installedIds, setInstalledIds] = useState(readInstalledApps);
  const [activeAppId, setActiveAppId] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof window === "undefined" ? true : window.navigator.onLine
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncInstalledApps = async () => {
      const nextInstalledIds = await readInstalledAppsFromRuntime();
      setInstalledIds(nextInstalledIds);
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    void syncInstalledApps();
    window.addEventListener("launcher-installed-apps-changed", syncInstalledApps);
    window.addEventListener("storage", syncInstalledApps);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("launcher-installed-apps-changed", syncInstalledApps);
      window.removeEventListener("storage", syncInstalledApps);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const activeApp = activeAppId ? getDesktopApp(activeAppId) : null;
  const isInstalled = activeApp ? installedIds.includes(activeApp.id) : false;
  const installedApps = useMemo(
    () => desktopApps.filter((app) => installedIds.includes(app.id)),
    [installedIds]
  );

  const installApp = (appId) => {
    if (installedIds.includes(appId)) {
      setActiveAppId(appId);
      return;
    }

    void writeInstalledAppsToRuntime([...installedIds, appId]).then((nextInstalledIds) => {
      setInstalledIds(nextInstalledIds);
    });
    setActiveAppId(appId);
  };

  const removeApp = (appId) => {
    const remaining = installedIds.filter((id) => id !== appId);
    void writeInstalledAppsToRuntime(remaining).then((nextInstalledIds) => {
      setInstalledIds(nextInstalledIds);
    });
    if (activeAppId === appId) {
      setActiveAppId(null);
    }
  };

  return (
    <div className="launcher-root">
      <aside className="launcher-rail">
        <button
          type="button"
          onClick={() => setActiveAppId(null)}
          className={`rail-home ${activeApp === null ? "is-active" : ""}`}
          aria-label="Platform home"
          title="Platform home"
        >
          DP
        </button>

        <div className="rail-stack">
          {desktopApps.map((app) => (
            <RailButton
              key={app.id}
              label={app.name}
              active={activeApp?.id === app.id}
              installed={installedIds.includes(app.id)}
              onClick={() => setActiveAppId(app.id)}
            />
          ))}
        </div>

        <div className="rail-meta">
          <div className="rail-pill">{isOnline ? "ON" : "OFF"}</div>
          <div className="rail-pill">{installedApps.length}</div>
        </div>
      </aside>

      <section className="launcher-content">
        {activeApp === null ? (
          <div className="center-stage">
            <div className="panel">
              <p className="eyebrow">Desktop platform</p>
              <h1>Platform home</h1>
              <p className="lede">
                This launcher is now a separate project from Watch. Apps stay independent, and the platform only connects to them.
              </p>
              <div className="stats-grid">
                <InfoCard label="Installed apps" value={String(installedApps.length)} />
                <InfoCard label="Connection" value={isOnline ? "Online" : "Offline"} />
                <InfoCard label="First app" value="Watch via watch.han-burger.com" />
              </div>
            </div>
          </div>
        ) : !isInstalled ? (
          <div className="center-stage">
            <div className="panel">
              <p className="eyebrow">App preview</p>
              <h1>{activeApp.name}</h1>
              <p className="lede">
                {activeApp.description} You should see this page immediately after clicking
                the Watch button on the left rail.
              </p>
              <div className="button-row">
                <button type="button" className="primary-button" onClick={() => installApp(activeApp.id)}>
                  Install this app
                </button>
                <a className="secondary-button" href={activeApp.siteUrl} target="_blank" rel="noreferrer">
                  Open website
                </a>
              </div>
              <div className="split-grid">
                <div className="list-panel">
                  <p className="eyebrow">What you get</p>
                  <div className="list-stack">
                    {activeApp.features.map((feature) => (
                      <div key={feature} className="list-item">{feature}</div>
                    ))}
                  </div>
                </div>
                <div className="list-panel compact-gap">
                  <InfoCard
                    label="Connection"
                    value={isOnline ? "Launcher can reach cloud-connected apps." : "Launcher is offline and external apps may be unavailable."}
                  />
                  <InfoCard label="App target" value={activeApp.siteUrl} />
                  <InfoCard label="Architecture" value="Launcher and Watch are separate repos connected by URL." />
                </div>
              </div>
            </div>
          </div>
        ) : !isOnline ? (
          <div className="center-stage">
            <div className="panel narrow-panel">
              <h1>Offline</h1>
              <p className="lede">
                The launcher can still open, but Watch depends on a live service. Reconnect to load the app content.
              </p>
              <button type="button" className="secondary-button button-only" onClick={() => removeApp(activeApp.id)}>
                Remove from launcher
              </button>
            </div>
          </div>
        ) : (
          <div className="installed-view">
            <iframe
              key={activeApp.id}
              src={activeApp.siteUrl}
              title={`${activeApp.name} app`}
              className="full-app-frame"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )}
      </section>
    </div>
  );
}
