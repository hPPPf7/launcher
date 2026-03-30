# 平台登入與桌面 SSO 規格

## 目標

- `watch`、`calendar`、`launcher` 共用同一套平台帳號。
- 每個 app 仍然可以自己獨立登入。
- `launcher` 不是唯一登入入口，它只是桌面端的一次登入整合層。
- 平台最重要的是讓所有 app 共用同一個 `user_id`。

## 目前已決定事項

- Neon project 已拆分為：
  - `hanburger-watch`
  - `hanburger-calendar`
  - `hanburger-auth`
- `watch` 目前已有 Google 登入與既有使用者資料。
- 為保留既有 `watch` 使用者，`hanburger-auth` 必須沿用 `watch` 現有的 auth 映射方式。
- `hanburger-auth` 目前 schema 已對齊 `watch` 的 auth 核心表，不採用另一套全新 `users / google_accounts / sessions` 主體設計。

## auth 的責任

`hanburger-auth` 只回答一件事：

- 你是誰

它負責：

- 使用者 profile
- OAuth 帳號對應到哪個 `user_id`
- session version 狀態
- 被刪除或封鎖的 auth provider 標記
- 給桌面 SSO 用的一次性 `login_tickets`

它不負責：

- `watch` 的觀看資料
- `calendar` 的事件資料
- 各 app 的業務邏輯

## app 的責任

### `watch`

- 保留網站版獨立登入能力。
- 登入成功後，取得平台 `user_id`。
- 用這個 `user_id` 去 `hanburger-watch` 查自己的資料。

### `calendar`

- 保留桌面版 / 手機版獨立登入能力。
- 登入成功後，取得平台 `user_id`。
- 用這個 `user_id` 去 `hanburger-calendar` 查自己的資料。

### `launcher`

- 提供桌面端的登入入口與已登入狀態管理。
- 啟動其他 app 時，可發出桌面 SSO 用的 `login_ticket`。
- 不直接接手 `watch` / `calendar` 的業務資料。

## 共用 `user_id` 的意義

兩個資料庫一起用的方式，不是互相共享表，而是：

- `hanburger-auth` 管 `user_id`
- `hanburger-watch` 用同一個 `user_id` 查 watch 資料
- `hanburger-calendar` 用同一個 `user_id` 查 calendar 資料

例子：

- `hanburger-auth.profiles.id = user-123`
- `hanburger-watch` 的觀看資料 `user_id = user-123`
- `hanburger-calendar` 的事件資料 `user_id = user-123`

這樣資料庫可以分開，但使用者身分仍是同一個人。

## 為什麼要以 `watch` 的 auth 邏輯為準

`watch` 已經在正式使用，因此它才是目前唯一有真實使用者的 auth 來源。

目前 `watch` 主要依賴：

- `profiles`
- `auth_user_map`
- `auth_session_states`
- `deleted_auth_account_markers`

尤其關鍵的是：

- `provider`
- `providerAccountId`
- `user_id`

這組映射不能亂變。只要新的 auth 系統換掉這個映射，`watch` 舊資料就會接不上。

## `hanburger-auth` 目前 schema

- `profiles`
- `auth_user_map`
- `auth_session_states`
- `deleted_auth_account_markers`
- `login_tickets`

其中：

- `profiles.id` 就是平台 `user_id`
- `auth_user_map` 用來保存 OAuth provider 帳號與 `user_id` 的對應
- `login_tickets` 是 `launcher` 未來桌面 SSO 的補充能力

## Google 登入策略

- `watch`、`calendar`、`launcher` 應共用同一套平台 auth 規則。
- Google OAuth 的 `client id` / `client secret` 可以共用，但要補足各 app 的 redirect URI。
- `AUTH_SECRET` 或對應 session secret 不必與每個 app 完全共用；是否共用要依實作決定。

## 登入路徑

### app 自己登入

1. 使用者直接在 `watch` 或 `calendar` 開啟登入。
2. app 走共用 auth 流程。
3. auth 依 `provider + providerAccountId` 找回既有 `user_id`。
4. app 取得登入狀態後，去自己的資料庫查資料。

### launcher 桌面 SSO

1. 使用者先登入 `launcher`。
2. `launcher` 取得平台登入狀態。
3. `launcher` 啟動其他 app 時，向 `hanburger-auth` 申請一次性 `login_ticket`。
4. 目標 app 用 `login_ticket` 換取自己的 app session。
5. app 進入已登入狀態，但背後仍然是同一個平台 `user_id`。

## 實作順序

1. 先把 `hanburger-auth` schema 對齊 `watch` 既有 auth 結構。
2. 把 `watch` 目前 auth 相關資料遷移到 `hanburger-auth`。
3. 讓 `watch` 的 auth 查詢改連 `hanburger-auth`。
4. 讓 `calendar` 接同一套 auth。
5. 最後才做 `launcher` 的桌面 SSO 與 `login_tickets` 消費流程。

## 目前不是什麼

- 目前不是「只有 launcher 才能登入」。
- 目前不是所有 app 共用同一個業務資料庫。
- 目前也不是要立刻把 `watch` 所有資料搬到 `hanburger-auth`。

正確方向是：

- 共用 auth
- 分開 app 資料
- 共用 `user_id`
- `launcher` 只是桌面整合層
