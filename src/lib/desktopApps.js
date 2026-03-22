export const desktopApps = [
  {
    id: "watch",
    name: "Watch",
    shortName: "W",
    status: "ready",
    description: "Movie, TV, anime, friend sync, and watch history.",
    tagline: "Connected external app",
    siteUrl: "https://watch.han-burger.com",
    features: [
      "Syncs through the Watch web service",
      "Can be installed from the launcher",
      "Keeps launcher and app ownership separate"
    ],
    cacheSummary: "Launcher stays local; Watch remains a web-connected app.",
  },
];

export function getDesktopApp(appId) {
  return desktopApps.find((app) => app.id === appId) ?? null;
}
