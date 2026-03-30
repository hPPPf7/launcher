# Launcher AGENT

## 專案定位

- `launcher` 是 HanBurger 的桌面平台入口，技術上使用 `Electron + Next.js`。
- 它的主要責任是管理桌面端的登入狀態、已安裝 app 清單、啟動 app，以及之後的桌面 SSO。
- `launcher` 不是唯一登入入口。`watch`、`calendar` 等 app 之後都應保留各自可單獨登入的能力。
- `launcher` 的價值在於桌面整合體驗：使用者登入一次後，可以在桌面端更方便地進入其他 app。

## 目前實作狀態

### 桌面殼層

- `/` 是下載與介紹頁。
- Electron 啟動後會載入 `/desktop`。
- 開發模式下，Electron 視窗會載入 `http://127.0.0.1:3000/desktop`。

### App Registry

- 目前 app 清單由 `src/lib/desktopApps.js` 管理。
- UI 會顯示 app 卡片、預覽資訊與安裝狀態。
- 現有「Install this app」本質上是把 app id 寫入本機設定，並不是完整下載器。
- 已安裝 app 目前主要透過 `iframe` 載入對應的 `siteUrl`。

### 本機資料

- Electron main 會建立 HanBurger 平台資料根目錄，預設在：
  - `Documents\\HanBurger`
- 可用 `HANBURGER_HOME` 覆寫根目錄。
- 目前會管理的本機檔案包含：
  - `platform/settings.json`
  - `platform/installed-apps.json`
  - `platform/window-state.json`
  - `logs/`
  - `temp/`

### Auth 資料庫工具鏈

- `launcher` 已接上和 `watch`、`calendar` 一樣的 Drizzle 工具鏈。
- 環境變數由 `launcher/.env.local` 提供 `DATABASE_URL`。
- 可用指令：
  - `npm run db:generate`
  - `npm run db:migrate`
  - `npm run db:push`
  - `npm run auth:migrate:watch`
- `hanburger-auth` 目前已套用和 `watch` 相容的 auth schema。
- `npm run auth:migrate:watch` 會把 `watch` 的 auth 相關資料搬到 `hanburger-auth`，只處理：
  - `profiles`
  - `auth_user_map`
  - `auth_session_states`
  - `deleted_auth_account_markers`
- 這個遷移不會碰 `watch` 的觀看資料、好友資料或其他業務表。

## Auth 架構方向

- 平台登入來源應集中在 `hanburger-auth`。
- `watch`、`calendar`、`launcher` 都接同一套 auth。
- 每個 app 之後都應保留「自己可以登入」的能力。
- `launcher` 只額外提供桌面端 SSO，不取代 app 自身登入流程。

### `hanburger-auth` 目前表結構

- `profiles`
- `auth_user_map`
- `auth_session_states`
- `deleted_auth_account_markers`
- `login_tickets`

### 為什麼不是另一套全新 auth schema

- `watch` 已經有真實使用中的 Google 登入與舊使用者資料。
- `watch/src/auth.ts` 目前就是透過 `provider + providerAccountId -> user_id` 的映射工作。
- 為了保留既有使用者與既有 `user_id`，`hanburger-auth` 必須與 `watch` 的 auth 結構對齊。
- 這樣之後把 `watch` 的 auth 查詢移到 `hanburger-auth` 時，才不會把舊資料斷掉。

## 與其他 app 的關係

- `watch` 之後仍應可作為純網站獨立登入。
- `calendar` 之後仍應可作為桌面 / 手機 app 獨立登入。
- `launcher` 只處理桌面端整合，不應成為唯一入口。
- 平台級文件可以提到 auth、SSO、app registry；但不要在這裡承擔各 app 的業務規則。

## 手機策略

- `launcher` 主要是桌面方案，不是手機主入口。
- iOS / Android 已經有自己的 app launcher，平台再包一層 launcher 價值不高。
- 手機端較合理的方向是各 app 獨立，例如 `watch`、`calendar` 各自提供自己的登入與使用流程。

## 開發原則

- `launcher` 主要管平台入口、安裝狀態、啟動流程與桌面 SSO。
- 不要把 `watch` 或 `calendar` 的業務資料直接塞進 `launcher`。
- 若未來新增 app，優先先補 app registry 與啟動流程，再談更深的桌面整合。
- 若修改 auth 文件或 schema，必須明確區分：
  - 目前已完成
  - 預計遷移
  - 未來產品方向

## 驗證

常用驗證：

```bash
npm run lint
npm run db:push
```

資料庫相關變更至少確認：

- `drizzle.config.ts` 能正確讀到 `.env.local`
- `db:push` 不會卡在舊 schema 衝突
- `hanburger-auth` 的表結構與 `src/server/db/schema.ts` 一致
