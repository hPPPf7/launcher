# Launcher AGENT

## 專案定位

- `launcher` 是 HanBurger 平台的桌面啟動器，技術棧是 `Electron + Next.js`。
- 目標是讓使用者在單一桌面入口中選擇與管理不同專案，而不是把所有功能都塞進 launcher 本體。
- 目前此 repo 只有一個已接入 app。
- 任何描述都必須以目前程式內容為準，不要把尚未完成的多 app 生態系寫成既成事實。

## 目前已實作

### 安裝入口

- `/` 首頁是下載頁，主按鈕直接指向 GitHub Releases 的 Windows 安裝檔。
- 桌面模式頁面在 `/desktop`。
- Electron 封裝後會載入本機靜態頁，開發模式載入 `http://127.0.0.1:3000/desktop`。

### 平台殼層

- 左側 rail 目前可顯示 app 入口、安裝數量與線上/離線狀態。
- 目前 `src/lib/desktopApps.js` 只有一個 app 定義。
- 未安裝狀態下可看到 app preview。
- 所謂「Install this app」目前不是下載獨立桌面包，而是把 app id 寫入本機安裝清單。
- 安裝後若在線上，launcher 會用 `iframe` 載入 `siteUrl`。
- 目前接入 app 的內容來源是外部網站 URL。

### 本機資料

- Electron main 會建立 HanBurger 根目錄，預設在：
  - `Documents\\HanBurger`
  - 若有 `HANBURGER_HOME` 環境變數則改用該路徑
- 目前已建立的主要資料位置包含：
  - `platform/settings.json`
  - `platform/installed-apps.json`
  - `platform/window-state.json`
  - `apps/watch/...`
  - `logs/`
  - `temp/`
- preload 目前暴露：
  - `window.launcherRuntime.rootPath`
  - `getInstalledApps()`
  - `setInstalledApps(appIds)`

### 自動更新

- 正式封裝版已接 `electron-updater`。
- `build.publish` 目前指向 GitHub repo `hPPPf7/launcher`。

## 產品方向

- launcher 的角色是平台入口、安裝管理與專案切換，不應承擔每個 app 的完整商業邏輯。
- launcher 的主要適用場景是桌面端，不是手機端。
- 長期方向可支援多個專案，例如 `watch`、`calendar` 與未來其他 app。
- 長期方向可支援多個專案與多種 app 類型。
- 可支援兩種 app 類型：
  - 網址型 app：透過外部站點或內嵌頁面啟動
  - 本機型 app：由 launcher 下載、更新、啟動本機桌面模組
- 目前只有一個已接入項目，而且屬於網址型接入。

## 手機策略

- 手機端通常不應再做一層 launcher。
- iOS / Android 本身已有系統層 app launcher，產品上再包一層平台啟動器的價值很低。
- 手機端較適合讓每個專案各自獨立下載、安裝、更新與通知。
- 不要預設桌面端的 launcher 架構可以直接搬到手機。

## 實作邊界

- 目前不能宣稱 launcher 已具備真正的 app 套件下載與安裝器能力。
- 目前不能宣稱尚未接入的 app 已被 launcher 支援，除非 registry、UI 與實際啟動流程都完成。
- 目前不能宣稱 launcher 已能管理任意 app 的版本、依賴、安裝目錄或更新通道。
- 若只是把 app 記錄到 `installed-apps.json`，文案上應稱為 `add to launcher`、`enable in launcher` 或等價說法，比 `install` 更準確。

## App Registry 規則

- 所有可接入 app 都應由單一 registry 管理，例如 `src/lib/desktopApps.js`。
- 每個 app 至少應定義：
  - `id`
  - `name`
  - `description`
  - `siteUrl` 或本機啟動資訊
  - 功能摘要
  - 可用狀態
- 若日後同時支援網址型與本機型 app，registry 必須明確標示型別，避免 UI 和安裝流程混淆。

## 本機資料與可搬移性

- launcher 本身已經有明確的資料根目錄概念，後續功能應延續這個設計，不要分散到難以追蹤的位置。
- 若未來由 launcher 管理 `calendar` 等本機 app，也應讓使用者能從 launcher 看見：
  - 平台資料根目錄
  - 各 app 子資料夾
  - 快取與正式資料的差異
- 若 app 需要換機搬移，至少要能清楚指出資料所在位置，必要時提供開啟資料夾與匯出能力。

## 平台責任分界

- `launcher` 負責入口、狀態管理、安裝註冊、更新協調與資料目錄可見性。
- 各 app 應各自負責自己的產品功能、資料模型、同步、通知與商業邏輯。
- 不要把 app 內部邏輯硬寫進 launcher；launcher 應維持平台層角色。

## 程式修改原則

- 新增 app 前先更新 registry，再補 UI、安裝流程與啟動方式。
- 若要從網址型 app 走向真正下載安裝，先定義：
  - 套件來源
  - 安裝目錄
  - 版本檢查
  - 更新策略
  - 卸載策略
- 若保留 `iframe` 載入外部站點，必須注意 CSP、登入狀態、跨站行為與離線體驗。
- 若某個 app 實際上只能開外部網站，應誠實呈現，不要假裝是完整本機 app。

## 驗證

常用檢查：

```bash
npm run lint
```

若新增 app 接入或本機安裝能力，至少驗證：

- `installed-apps.json` 內容正確
- app 切換不會壞掉
- 線上/離線狀態呈現正確
- `rootPath` 可被 UI 顯示與使用
- 更新流程不會誤觸或覆蓋其他 app 資料
