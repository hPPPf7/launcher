# 平台登入與 SSO 規格

## 目標

- `launcher` 作為平台登入入口。
- `watch` 與 `calendar` 共用同一個帳號系統。
- 各 app 使用同一個 `user_id`，但資料各自落在自己的資料庫或資料空間。
- 使用者在 `launcher` 登入後，可以直接進入其他 app，而不必每次重登。

## 核心原則

- `user_id` 代表同一個平台使用者。
- `launcher` 管登入入口與 app 啟動，不直接管理各 app 的業務資料。
- `watch` 與 `calendar` 只負責自己的資料。
- Google 登入是登入方式，不代表 `watch` 或 `calendar` 各自要重做帳號系統。
- 後端必須驗證使用者是否有權限存取指定 app。

## 角色分工

### `launcher`

- 平台登入入口。
- 持有平台 access token / refresh token。
- 顯示目前登入使用者。
- 啟動其他 app。
- 啟動 app 時，傳遞登入狀態或一次性登入票證。

### `watch`

- 網站型 app。
- 接受平台發出的 web login ticket。
- 用 ticket 向後端交換網站 session / cookie。
- 只存取 `watch` 自己的資料。

### `calendar`

- 桌面型 app。
- 接受平台發出的 desktop ticket。
- 啟動後向後端交換 app session。
- 只存取 `calendar` 自己的資料。

## 資料庫建議

### `auth`

用途：
- 管使用者是誰
- 管 Google 登入對應
- 管 session
- 管 login ticket

建議表：
- `users`
- `google_accounts`
- `sessions`
- `login_tickets`

### `watch`

用途：
- 只存 `watch` 的業務資料

### `calendar`

用途：
- 只存 `calendar` 的業務資料

## 建議資料表

### `auth.users`

- `id`
- `email`
- `display_name`
- `avatar_url`
- `created_at`
- `updated_at`

### `auth.google_accounts`

- `id`
- `user_id`
- `google_sub`
- `email`
- `created_at`

### `auth.sessions`

- `id`
- `user_id`
- `session_type`
  - `platform`
  - `web`
  - `desktop`
- `refresh_token_hash`
- `device_id`
- `expires_at`
- `created_at`

### `auth.login_tickets`

- `id`
- `user_id`
- `target_app`
  - `watch`
  - `calendar`
- `ticket_type`
  - `web`
  - `desktop`
- `expires_at`
- `used_at`
- `created_at`

## Google 登入流程

1. 使用者在 `launcher` 點 Google 登入。
2. Google OAuth 完成後，auth server 取得 Google 使用者資訊。
3. auth server 以 `google_sub` 查找是否已有平台使用者。
4. 如果沒有，就建立新的 `users` 與 `google_accounts`。
5. 建立平台 session，回傳給 `launcher`。

## SSO 流程

### 從 `launcher` 開啟 `calendar`

1. `launcher` 向 auth server 申請 `desktop` ticket。
2. 指定 target app 為 `calendar`。
3. `launcher` 啟動 `calendar` 並傳 ticket。
4. `calendar` 向 auth server 交換自己的 session。
5. 驗證成功後，`calendar` 取得自己的 app session。

### 從 `launcher` 開啟 `watch`

1. `launcher` 向 auth server 申請 `web` ticket。
2. 指定 target app 為 `watch`。
3. `launcher` 用瀏覽器打開 `watch`，帶上 ticket。
4. `watch` 後端把 ticket 換成 cookie session。
5. 驗證成功後，`watch` 直接登入。

## 授權原則

- 每次 API 請求都從 token / session 還原 `user_id`。
- app 前端不負責最終授權判斷。
- 後端決定該 `user_id` 是否能使用該 app。

## Token / Ticket 規則

### Access Token

- 短效
- 用於呼叫 API

### Refresh Token

- 長效
- 只存安全位置
- 由 `launcher` 持有平台 refresh token

### Login Ticket

- 一次性
- 短效
- 只用於 app 啟動瞬間交換 session

## 為什麼這樣分

- `launcher` 負責登入與啟動
- `auth` 負責身分
- `watch` 負責 watch 資料
- `calendar` 負責 calendar 資料

這樣未來不管是 Neon 分 project，還是之後改成自架，都比較容易搬移與拆分。

## 對目前專案的建議順序

1. 保留現有 `hanburger-watch`
2. 建立 `hanburger-calendar`
3. 等要做共用登入時，再建立 `hanburger-auth`
4. `launcher` 先做登入入口與 app 啟動
5. `watch` / `calendar` 再逐步接 SSO
