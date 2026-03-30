# Auth Neon Plan

## 目標

`hanburger-auth` 要成為平台共用登入中心，但不能破壞 `watch` 既有使用者資料。

因此這份 auth 設計的核心不是「重新發明一套帳號表」，而是：

- 以 `watch` 目前可運作的 auth 映射為基準
- 把這套映射獨立到 `hanburger-auth`
- 讓 `watch`、`calendar`、`launcher` 之後都接同一套 auth

## 目前已完成

- `hanburger-auth` 已建立。
- `launcher` 已補上 Drizzle toolchain：
  - `drizzle.config.ts`
  - `src/server/db/schema.ts`
  - `npm run db:push`
- `hanburger-auth` 已套用與 `watch` 相容的 auth schema。
- 先前暫時建立的空白表：
  - `users`
  - `google_accounts`
  - `sessions`
  - `login_tickets`
  已移除，避免和正式 schema 衝突。

## 目前 schema

- `profiles`
- `auth_user_map`
- `auth_session_states`
- `deleted_auth_account_markers`
- `login_tickets`

## 各表用途

### `profiles`

- 平台使用者基本資料。
- `profiles.id` 就是平台 `user_id`。

### `auth_user_map`

- 保存 OAuth provider 帳號對應到哪個 `user_id`。
- 目前保留 `watch` 使用的關鍵映射：
  - `provider`
  - `provider_account_id`
  - `user_id`

### `auth_session_states`

- 保存每個使用者的 session version。
- 讓 app 能在 JWT / session 驗證時判斷是否失效。

### `deleted_auth_account_markers`

- 保留已刪除 provider 帳號的標記。
- 避免舊帳號在短時間內被錯誤重綁。

### `login_tickets`

- 給 `launcher` 未來桌面 SSO 使用。
- 不是目前 `watch` 獨立登入的必要條件，而是額外能力。

## 為什麼不以 `users / google_accounts / sessions` 為主

因為那樣會和 `watch` 目前的真實登入邏輯分裂。

`watch/src/auth.ts` 目前依賴的是：

- `provider`
- `providerAccountId`
- `user_id`

只要這組對應被改掉，就可能出現：

- 同一個 Google 帳號被分配新的 `user_id`
- `watch` 原本資料對不到新登入結果

所以第一優先不是重新設計得多漂亮，而是先保住既有使用者。

## 下一步

### 第 1 步

從 `hanburger-watch` 匯出以下 auth 相關資料：

- `profiles`
- `auth_user_map`
- `auth_session_states`
- `deleted_auth_account_markers`

### 第 2 步

把這批資料匯入 `hanburger-auth`。

重點不是搬 `watch` 的業務資料，而是搬 auth 映射資料。

目前 `launcher` 已提供可重複執行的遷移腳本：

```bash
npm run auth:migrate:watch
```

腳本會自動讀：

- `watch/.env.local` 的 `DATABASE_URL`
- `launcher/.env.local` 的 `DATABASE_URL`

並把上述四張 auth 表的資料 upsert 到 `hanburger-auth`。

### 第 3 步

修改 `watch`，讓它的 auth 查詢改連 `hanburger-auth`。

此時要確認：

- 登入後拿到的 `user_id` 與原本相同
- 舊資料仍能查到

### 第 4 步

讓 `calendar` 接同一套 auth。

此時 `calendar` 也應使用同一個平台 `user_id`，但資料仍存在 `hanburger-calendar`。

### 第 5 步

最後才補 `launcher` 的桌面 SSO：

- 建立 `login_ticket`
- app 用 ticket 換 session

## 驗證重點

- `launcher` 的 `db:push` 能穩定對齊 `hanburger-auth`
- `watch` 舊使用者登入後 `user_id` 不變
- `watch` 舊資料可正常讀取
- `calendar` 能用同一個 `user_id` 建立自己的資料
- `launcher` 之後做 SSO 時，不會改變 app 可獨立登入的能力
