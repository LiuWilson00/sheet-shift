# FEATURE_SPEC：使用者權限管理（按鈕權限 + Admin 使用者管理）

> 功能代號：`user-permission-management`
> 建立日期：2026-06-02
> 狀態：規格撰寫中（待使用者審核）

---

## 1. 需求總覽

目前應用程式只要登入成功，所有使用者看到的匯出按鈕完全相同。隨著功能增加，需要：

1. **按鈕權限控制**：針對每個使用者，控制其在首頁「匯出格式」區塊**能看到哪些匯出按鈕**。
2. **角色（Role）概念**：新增 `admin` 角色。`Eason` 與 `admin` 兩個帳號預設為 admin。
3. **Admin 使用者管理 UI**：admin 可在 UI 上自由：
   - 檢視所有使用者
   - 新增使用者
   - 修改使用者（姓名、密碼、角色、按鈕權限）
   - 刪除使用者
   - 編輯每個使用者可見的匯出按鈕
4. 所有變更**直接寫回 Google Sheets「用戶資訊」表**。

### 核心規則

| 規則 | 說明 |
|------|------|
| **權限欄位 NULL（空白）** | 該使用者看得到**全部**匯出按鈕 |
| **權限欄位有值** | 只看得到列出的按鈕（逗號分隔的 button key） |
| **admin 角色** | 不論權限欄位內容，**一律看到全部匯出按鈕**（因為要管理） |
| **控制範圍** | 僅限首頁「匯出格式」區塊的 6 個按鈕，不含連線/系統設定等管理性按鈕 |

---

## 2. 角色與權限模型

### 2.1 角色（Role）

| Role 值 | 說明 |
|---------|------|
| `admin` | 管理員。看得到全部匯出按鈕，且看得到「使用者管理」入口 |
| `user` | 一般使用者（**空白也視為 `user`**） |

- 預設 admin 帳號：`Eason`、`admin`（在「用戶資訊」表的 `role` 欄位填 `admin`）。
- 帳號比對採大小寫**不敏感**的精準比對（避免 `eason` / `Eason` 落差）。

### 2.2 受控的匯出按鈕（Permission Keys）

權限 key 與首頁匯出按鈕一一對應，作為**單一事實來源**定義於 `src/shared/permission.types.ts`：

| Permission Key | 按鈕標題 | 對應動作 |
|----------------|---------|---------|
| `exportTaipeiBay` | 台北港格式 | `ipcApi.excel.exportTaipeiBay` |
| `exportKaohsiungChaofeng` | 高雄超峰格式 | `ipcApi.excel.exportKaohsiungChaofeng` |
| `exportShopee` | 蝦皮2轉 | `ipcApi.excel.exportShopee` |
| `exportShopeeNew` | 沛寶速派蝦皮格式 | `ipcApi.excel.exportShopeeNew` |
| `exportPegasus` | 天馬格式 | `ipcApi.excel.exportPegasus` |
| `manifestNumber` | 分艙編號 | 開啟分艙編號帶入對話框 |

### 2.3 權限判定邏輯（偽代碼）

```
function canSeeExport(user, buttonKey):
    if user.role == 'admin':
        return true                      # admin 一律可見
    if user.permissions == null:         # 空白 = 全部可見
        return true
    return buttonKey in user.permissions # 否則只看列表內的
```

---

## 3. 資料結構

### 3.1 Google Sheets「用戶資訊」表欄位

在現有 3 欄之後**新增 2 欄**（標頭為英文，與既有 `name/account/password` 一致）：

| 欄位（標頭） | 說明 | 範例 |
|------|------|------|
| `name` | 使用者姓名（既有） | `王小明` |
| `account` | 登入帳號（既有） | `john` |
| `password` | 密碼（既有，純文字） | `1234` |
| `role` | 角色，`admin` 或空白 | `admin` |
| `permissions` | 逗號分隔的可見按鈕 key；**空白＝全部可見** | `exportShopee,exportPegasus` |

> ⚠️ 欄位順序很重要：寫回時 `updateSheetData` 會以 JS 物件 key 的順序產生標頭列，必須固定為 `name, account, password, role, permissions`，與表頭一致（見 §7 注意事項）。

### 3.2 TypeScript 介面

**`src/main/utils/google-sheets.tool/index.interface.ts`** — 擴充既有 `UsersSheet`（仍為 Sheet 原始字串格式）：

```typescript
export interface UsersSheet {
  name: string;
  account: string;
  password: string;
  /** 角色：'admin' 或空字串（空字串視為一般 user） */
  role?: string;
  /** 逗號分隔的可見匯出按鈕 key；空字串/undefined 視為全部可見 */
  permissions?: string;
}
```

**`src/shared/permission.types.ts`**（新檔，前後端共用的單一事實來源）：

```typescript
/** 受權限控制的匯出按鈕 key */
export type ExportPermissionKey =
  | 'exportTaipeiBay'
  | 'exportKaohsiungChaofeng'
  | 'exportShopee'
  | 'exportShopeeNew'
  | 'exportPegasus'
  | 'manifestNumber';

/** 使用者角色 */
export type UserRole = 'admin' | 'user';

/** 匯出按鈕的權限定義清單（key 與標籤的單一事實來源） */
export const EXPORT_PERMISSION_ITEMS: {
  key: ExportPermissionKey;
  label: string;
}[] = [
  { key: 'exportTaipeiBay', label: '台北港格式' },
  { key: 'exportKaohsiungChaofeng', label: '高雄超峰格式' },
  { key: 'exportShopee', label: '蝦皮2轉' },
  { key: 'exportShopeeNew', label: '沛寶速派蝦皮格式' },
  { key: 'exportPegasus', label: '天馬格式' },
  { key: 'manifestNumber', label: '分艙編號' },
];

/** 應用層的使用者模型（已解析 role 與 permissions） */
export interface AppUser {
  name: string;
  account: string;
  /** 角色（已正規化，空白 → 'user'） */
  role: UserRole;
  /**
   * 可見按鈕 key 陣列；
   * null = 全部可見（對應 Sheet 的空白 permissions）
   */
  permissions: ExportPermissionKey[] | null;
}

/** Admin 使用者管理用的完整紀錄（含密碼） */
export interface UserRecord extends AppUser {
  password: string;
}
```

### 3.3 解析 / 序列化規則

| 方向 | 規則 |
|------|------|
| Sheet → App | `role` 去除空白後若等於 `admin`（不分大小寫）→ `'admin'`，否則 `'user'`；`permissions` 空白 → `null`，否則以 `,` 切割、`trim`、過濾空字串與非法 key |
| App → Sheet | `role`：`'admin'` → `'admin'`，`'user'` → `''`；`permissions`：`null` → `''`，陣列 → `key1,key2` |

---

## 4. UI 設計

### 4.1 首頁匯出按鈕過濾（方案 A：設定驅動）

把目前寫死的 6 個 `<ExportCard>` 重構為設定陣列，依登入者權限 `.filter()` 後 `.map()` 渲染。

```
┌─ 選擇匯出格式 ──────────────────────────────────────┐
│  [🏢 台北港格式]  [🚚 高雄超峰格式]  [🛒 蝦皮2轉]    │   ← admin 或 permissions=null：全部顯示
│  [🛍️ 沛寶速派]    [🐴 天馬格式]      [🔢 分艙編號⚙️] │
└─────────────────────────────────────────────────────┘

一般 user，permissions = "exportShopee,exportPegasus"：
┌─ 選擇匯出格式 ──────────────────────────────────────┐
│  [🛒 蝦皮2轉]  [🐴 天馬格式]                          │   ← 只顯示有權限的
└─────────────────────────────────────────────────────┘
```

- 若過濾後沒有任何按鈕，顯示提示文字「您目前沒有可用的匯出格式，請聯絡管理員」。

### 4.2 Header「使用者管理」入口（僅 admin 可見）

於 `layout/index.tsx` 的 Actions 區塊，在「系統設定」按鈕旁新增「使用者管理」按鈕（👥），`isAuth && role === 'admin'` 時才渲染。

### 4.3 使用者管理對話框（UserManagementDialog）

```
┌─ 使用者管理 ───────────────────────────────────────────────┐
│  [＋ 新增使用者]                                            │
│ ┌────────┬────────┬────────┬──────────────────┬─────────┐  │
│ │ 姓名   │ 帳號   │ 角色   │ 可見匯出按鈕      │ 操作    │  │
│ ├────────┼────────┼────────┼──────────────────┼─────────┤  │
│ │ 管理員 │ admin  │ admin  │ （全部）          │ ✏️ 🗑️   │  │
│ │ Eason  │ Eason  │ admin  │ （全部）          │ ✏️ 🗑️   │  │
│ │ 王小明 │ john   │ user   │ 蝦皮2轉, 天馬格式 │ ✏️ 🗑️   │  │
│ └────────┴────────┴────────┴──────────────────┴─────────┘  │
└────────────────────────────────────────────────────────────┘

點「✏️ 編輯」或「＋ 新增」→ 開啟編輯表單：
┌─ 編輯使用者 ───────────────────────────────┐
│ 姓名:   [____________]                     │
│ 帳號:   [____________]  (新增時可填,編輯時唯讀) │
│ 密碼:   [____________]                     │
│ 角色:   ( ) 一般使用者  ( ) 管理員          │
│ 可見匯出按鈕:                               │
│   [✓] 台北港格式      [✓] 高雄超峰格式       │
│   [✓] 蝦皮2轉         [ ] 沛寶速派蝦皮格式   │
│   [✓] 天馬格式        [ ] 分艙編號          │
│   [ ] 全部可見（清空個別勾選 → 寫入空白）    │
│                            [取消]  [儲存]   │
└─────────────────────────────────────────────┘
```

UI 行為：
- **角色選 admin** 時，按鈕勾選區塊禁用（disabled）並標示「管理員一律可見全部」。
- **「全部可見」** 勾選後等同 `permissions = null`（寫回空白）；勾選個別按鈕則取消「全部可見」。
- 帳號為編輯狀態時唯讀（帳號為主鍵，不允許改）。

---

## 5. IPC API 設計

### 5.1 修改既有契約

`auth.login` 回傳型別由 `UsersSheet | false` 改為 `AppUser | false`（登入成功回傳已解析的使用者，含 role 與 permissions，**不含密碼**）。

```typescript
auth: {
  login: { channel: 'auth-v2/login' }
    as IpcContract<{ account: string; password: string }, AppUser | false>,
  logout: { channel: 'auth-v2/logout' } as IpcContract<void, boolean>,
}
```

> 變更影響：`AuthDialogContext` 存 localStorage 的物件不再含 password。`initAuth()` 改以「重新呼叫一支輕量驗證 / 直接信任本地」方式還原（見 §7）。

### 5.2 新增 `users` 契約群組（Admin 專用）

```typescript
users: {
  /** 取得所有使用者（含密碼，供 admin 管理） */
  list: { channel: 'users-v2/list' }
    as IpcContract<{ operatorAccount: string }, UserRecord[]>,

  /** 新增或更新使用者（以 account 為主鍵判斷） */
  save: { channel: 'users-v2/save' }
    as IpcContract<{ operatorAccount: string; user: UserRecord }, boolean>,

  /** 刪除使用者 */
  delete: { channel: 'users-v2/delete' }
    as IpcContract<{ operatorAccount: string; account: string }, boolean>,
}
```

- 所有 `users` handler 皆於後端驗證 `operatorAccount` 的 role 為 `admin`，否則丟出 `IpcError('FORBIDDEN')`（縱深防禦，不只靠前端隱藏入口）。

### 5.3 後端寫回流程（save / delete）

沿用艙單編號 handler 的「更新快取 + `updateSheetData`」模式：

```
save(user):
  驗證 operator 為 admin
  驗證 user.account 非空、user.name 非空
  讀 usersSheet 快取 → 找 account（不分大小寫）
  存在 → 覆寫該列；不存在 → 新增列
  將 UserRecord 轉為 UsersSheet（序列化 role/permissions），固定 key 順序
  writeUsersSheet(newData)        # 見 §7 刪列處理
  usersSheet.set(newData)         # 更新快取
  return true

delete(account):
  驗證 operator 為 admin
  禁止刪除自己（operatorAccount === account → IpcError）
  讀快取 → 過濾掉該 account
  writeUsersSheet(newData)
  usersSheet.set(newData)
  return true
```

---

## 6. 處理流程（端到端）

```
┌── 登入 ───────────────────────────────────────────────┐
│ 使用者輸入帳密 → auth.login                            │
│ 後端比對 usersSheet → 解析 role/permissions → 回傳 AppUser │
│ AuthContext 存 localStorage、設定 isAuth/role/permissions │
└────────────────────────────────────────────────────────┘
            │
            ▼
┌── 首頁渲染 ────────────────────────────────────────────┐
│ EXPORT_CONFIG.filter(c => canSeeExport(user, c.key)).map(...) │
└────────────────────────────────────────────────────────┘
            │ (role === 'admin')
            ▼
┌── Admin 管理 ──────────────────────────────────────────┐
│ Header「使用者管理」→ UserManagementDialog              │
│ users.list → 表格；編輯/新增/刪除 → users.save/delete    │
│ → 寫回 Google Sheets + 更新快取 → 重新 users.list 刷新   │
└────────────────────────────────────────────────────────┘
```

---

## 7. 邊界條件與注意事項

1. **【重要】刪除/減列的尾端殘列問題**
   `updateSheetData` 使用 `spreadsheets.values.update`，只覆寫傳入的列數，**不會清除原本多出來的尾列**。刪除使用者後，舊的最後一列會殘留。
   → 需實作 `writeUsersSheet()`：寫入前先 `spreadsheets.values.clear` 整個「用戶資訊」範圍，或將 `newData` 以空白列補齊到原長度。**規格採「先 clear 再 update」**。

2. **欄位順序**：`updateSheetData` 以第一個物件的 `Object.keys` 順序產生標頭。轉換函式必須以固定順序 `{ name, account, password, role, permissions }` 建構物件，確保標頭穩定。

3. **權限變更的生效時機**：admin 修改某使用者權限時，若該使用者正登入中，**需重新登入才會生效**（權限在登入時載入）。本期不做即時推播；於規格標明，必要時後續再加。

4. **未登入行為**：維持現狀，未登入不顯示任何匯出按鈕（顯示「請先登入」）。

5. **localStorage 還原（initAuth）**：因 login 回傳不再含密碼，`initAuth` 改為：localStorage 直接存 `AppUser`，啟動時直接還原 `isAuth/role/permissions`（不再用密碼重新登入）。若需要重新驗證帳號是否仍存在，可新增一支以 account 查詢的輕量 API（本期視為非必要，列為選配）。

6. **admin 自我保護**：禁止 admin 刪除自己的帳號；建議（選配）至少保留一名 admin，避免鎖死。

7. **非法 permission key**：解析時過濾掉不在 `EXPORT_PERMISSION_ITEMS` 內的 key，避免髒資料影響。

8. **安全性既有限制**：密碼以純文字存於 Sheet 並回傳前端（管理用），此為**既有設計**，本期不變更；僅標註為已知限制。

---

## 8. 測試案例

### 8.1 權限判定（單元測試 `permission.util.test.ts`）

| # | 情境 | 輸入 | 預期 |
|---|------|------|------|
| 1 | admin 一律全部可見 | role=admin, permissions=[] | 6 個按鈕全可見 |
| 2 | permissions=null 全部可見 | role=user, permissions=null | 6 個按鈕全可見 |
| 3 | 部分權限 | role=user, permissions=[exportShopee] | 僅蝦皮2轉可見 |
| 4 | 無任何權限 | role=user, permissions=[] | 0 個按鈕，顯示提示 |
| 5 | 解析空白 role | role='' | 正規化為 'user' |
| 6 | 解析 admin（大小寫/空白） | role=' Admin ' | 正規化為 'admin' |
| 7 | 過濾非法 key | permissions='exportShopee,foo' | 僅 ['exportShopee'] |
| 8 | 序列化 null | permissions=null | 寫回空字串 |

### 8.2 使用者管理 handler（單元測試）

| # | 情境 | 預期 |
|---|------|------|
| 9 | 非 admin 呼叫 list/save/delete | 丟出 FORBIDDEN |
| 10 | save 新帳號 | 新增一列、快取更新、回 true |
| 11 | save 既有帳號 | 覆寫該列、不重複新增 |
| 12 | delete 既有帳號 | 列被移除且**無尾端殘列** |
| 13 | delete 自己 | 丟出錯誤、不刪除 |
| 14 | save 缺 account/name | 丟出 INVALID_INPUT |

### 8.3 E2E（Playwright，手動 + 自動）

| # | 流程 | 預期 |
|---|------|------|
| 15 | admin（Eason）登入 | 看到全部匯出按鈕 + 「使用者管理」入口 |
| 16 | 一般 user 登入（限定權限） | 只看到對應按鈕、無管理入口 |
| 17 | admin 新增/編輯/刪除使用者 | Google Sheet 同步更新、表格刷新 |
| 18 | admin 變更某 user 權限 → 該 user 重新登入 | 按鈕集合隨之變化 |

---

## 9. 不在本期範圍（YAGNI）

- 密碼雜湊 / 加密儲存（沿用既有純文字）。
- 連線設定、系統設定等管理性按鈕的權限控制。
- 權限即時推播（變更後免重新登入）。
- 多種角色（僅 admin / user 兩種）。
- 稽核紀錄（誰改了誰的權限）。
