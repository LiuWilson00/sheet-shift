# IMPLEMENTATION_PLAN：使用者權限管理

> 功能代號：`user-permission-management`
> 對應規格：[`FEATURE_SPEC.md`](./FEATURE_SPEC.md)
> 建立日期：2026-06-02

依專案規格驅動開發順序：型別 → UI Demo → IPC 契約 → Handlers → Renderer API → 商業邏輯 → UI 整合。

---

## 階段總覽

| 階段 | 名稱 | 重點 |
|------|------|------|
| Phase 0 | Google Sheet 前置 | 在「用戶資訊」表新增 `role`、`permissions` 欄；Eason/admin 設為 admin |
| Phase 1 | 型別與共用常數 | `permission.types.ts`、擴充 `UsersSheet` |
| Phase 2 | 權限工具函式 | 解析/序列化/判定（純函式，先寫測試） |
| Phase 3 | IPC 契約 | 改 `auth.login` 回傳、加 `users` 群組 |
| Phase 4 | 後端 Handlers | `auth-handlers-v2` 調整、`user-handlers-v2` 新增、`writeUsersSheet` |
| Phase 5 | Renderer API | `ipc-api.ts` 加 `users`、調整 auth 型別 |
| Phase 6 | 匯出按鈕重構（方案 A） | `EXPORT_CONFIG` 設定陣列 + 權限過濾 |
| Phase 7 | AuthContext 擴充 | 暴露 `role`、`permissions`、`canSeeExport` |
| Phase 8 | Admin 使用者管理 UI | `UserManagementDialog` + Header 入口 |
| Phase 9 | 測試 | 單元測試 + E2E |

---

## Phase 0：Google Sheet 前置（手動）

- 在「用戶資訊」工作表第一列（標頭）`password` 之後新增兩欄：`role`、`permissions`。
- 將 `Eason`、`admin` 兩列的 `role` 填 `admin`。
- 其他使用者 `role`、`permissions` 留空（＝ user + 全部可見）。

> 此步驟由使用者於 Google Sheet 操作；程式端的讀寫已能相容（標頭名稱即為物件 key）。

---

## Phase 1：型別與共用常數

**新檔 `src/shared/permission.types.ts`** — 依 FEATURE_SPEC §3.2 定義
`ExportPermissionKey`、`UserRole`、`EXPORT_PERMISSION_ITEMS`、`AppUser`、`UserRecord`。

**修改 `src/main/utils/google-sheets.tool/index.interface.ts`** — `UsersSheet` 加 `role?`、`permissions?`（見 §3.2）。

---

## Phase 2：權限工具函式（先寫測試 / TDD）

**新檔 `src/shared/permission.util.ts`**

```typescript
import {
  AppUser,
  ExportPermissionKey,
  EXPORT_PERMISSION_ITEMS,
  UserRecord,
} from './permission.types';
import type { UsersSheet } from '../main/utils/google-sheets.tool/index.interface';

const VALID_KEYS = new Set(EXPORT_PERMISSION_ITEMS.map((i) => i.key));

/** 正規化角色 */
export function normalizeRole(role?: string): 'admin' | 'user' {
  return (role ?? '').trim().toLowerCase() === 'admin' ? 'admin' : 'user';
}

/** 解析逗號分隔權限字串 → 陣列或 null（空白＝全部可見） */
export function parsePermissions(
  raw?: string,
): ExportPermissionKey[] | null {
  if (!raw || !raw.trim()) return null;
  const keys = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => VALID_KEYS.has(s as ExportPermissionKey));
  return keys as ExportPermissionKey[];
}

/** 序列化權限陣列 → 字串（null → ''） */
export function serializePermissions(
  permissions: ExportPermissionKey[] | null,
): string {
  return permissions ? permissions.join(',') : '';
}

/** Sheet 列 → 應用層 AppUser（不含密碼） */
export function toAppUser(row: UsersSheet): AppUser {
  return {
    name: row.name,
    account: row.account,
    role: normalizeRole(row.role),
    permissions: parsePermissions(row.permissions),
  };
}

/** Sheet 列 → 完整 UserRecord（含密碼，供 admin 管理） */
export function toUserRecord(row: UsersSheet): UserRecord {
  return { ...toAppUser(row), password: row.password };
}

/** UserRecord → Sheet 列（固定 key 順序，確保標頭穩定） */
export function toUsersSheet(user: UserRecord): UsersSheet {
  return {
    name: user.name,
    account: user.account,
    password: user.password,
    role: user.role === 'admin' ? 'admin' : '',
    permissions: serializePermissions(user.permissions),
  };
}

/** 權限判定：該使用者是否可見某匯出按鈕 */
export function canSeeExport(
  user: Pick<AppUser, 'role' | 'permissions'>,
  key: ExportPermissionKey,
): boolean {
  if (user.role === 'admin') return true;
  if (user.permissions === null) return true;
  return user.permissions.includes(key);
}
```

**測試 `src/shared/__tests__/permission.util.test.ts`** — 涵蓋 FEATURE_SPEC §8.1 案例 1–8。

---

## Phase 3：IPC 契約

**修改 `src/shared/ipc-contracts.ts`**

- import `AppUser`、`UserRecord`。
- `auth.login` 輸出改為 `AppUser | false`。
- 新增 `users` 群組（list / save / delete，見 FEATURE_SPEC §5.2）。

---

## Phase 4：後端 Handlers

### 4.1 `writeUsersSheet`（解決尾端殘列）

於 `google-sheets.tool` 新增（或在 user-handler 內實作）：

```typescript
/** 安全寫回使用者表：先清空整個範圍再寫入，避免刪列殘留 */
export async function writeUsersSheet(rows: UsersSheet[]): Promise<boolean> {
  const sheetSetting = googleSheetConnectionSetting.get();
  const gsapi = google.sheets({ version: 'v4', auth: client.get()! });
  // 1) 清空整個工作表範圍
  await gsapi.spreadsheets.values.clear({
    spreadsheetId: sheetSetting.spreadsheet_id,
    range: SheetRangeName.Users,
  });
  // 2) 寫入新資料（updateSheetData 會重建標頭 + 資料）
  return updateSheetData(SheetRangeName.Users, rows);
}
```

> 若 `rows` 為空，仍需寫入標頭列以保留欄位定義（可保留一列標頭或至少不破壞表頭）。實作時注意 `jsonToSheetArray` 對空陣列回傳 `[]`，需特別處理「全部刪除」情境（保底寫入標頭）。

### 4.2 `auth-handlers-v2/index.ts` 調整

- login 成功後改回傳 `toAppUser(user)`（不含密碼）。

### 4.3 新檔 `src/main/modules/user-handlers-v2/index.ts`

```typescript
export function setupUserHandlersV2() {
  // 共用：驗證 operator 為 admin
  const assertAdmin = (operatorAccount: string) => {
    const op = usersSheet
      .get()
      .find(
        (u) =>
          u.account.toLowerCase() === operatorAccount.toLowerCase(),
      );
    if (!op || normalizeRole(op.role) !== 'admin') {
      throw new IpcError('權限不足', 'FORBIDDEN');
    }
  };

  // list
  createHandler(ipcContracts.users.list, async (input) => {
    assertAdmin(input.operatorAccount);
    return usersSheet.get().map(toUserRecord);
  });

  // save（新增/更新）
  createHandler(ipcContracts.users.save, async (input) => {
    assertAdmin(input.operatorAccount);
    const { user } = input;
    if (!user.account?.trim() || !user.name?.trim()) {
      throw new IpcError('帳號與姓名為必填', 'INVALID_INPUT');
    }
    const current = usersSheet.get();
    const idx = current.findIndex(
      (u) => u.account.toLowerCase() === user.account.toLowerCase(),
    );
    const row = toUsersSheet(user);
    const next =
      idx >= 0
        ? current.map((r, i) => (i === idx ? row : r))
        : [...current, row];
    const ok = await writeUsersSheet(next);
    if (!ok) throw new IpcError('寫回 Google Sheets 失敗', 'SAVE_FAILED');
    usersSheet.set(next);
    return true;
  });

  // delete
  createHandler(ipcContracts.users.delete, async (input) => {
    assertAdmin(input.operatorAccount);
    if (input.account.toLowerCase() === input.operatorAccount.toLowerCase()) {
      throw new IpcError('無法刪除自己的帳號', 'DELETE_SELF');
    }
    const current = usersSheet.get();
    const next = current.filter(
      (u) => u.account.toLowerCase() !== input.account.toLowerCase(),
    );
    if (next.length === current.length) return false;
    const ok = await writeUsersSheet(next);
    if (!ok) throw new IpcError('寫回 Google Sheets 失敗', 'DELETE_FAILED');
    usersSheet.set(next);
    return true;
  });
}
```

### 4.4 `src/main/main.ts`

- 在 handler 註冊區（auth handler 附近）加 `setupUserHandlersV2()`。

---

## Phase 5：Renderer API

**修改 `src/renderer/api/ipc-api.ts`**

```typescript
users: {
  list: createClient(ipcContracts.users.list),
  save: createClient(ipcContracts.users.save),
  delete: createClient(ipcContracts.users.delete),
},
```

（`auth.login` 的型別自動隨契約更新為 `AppUser | false`。）

---

## Phase 6：匯出按鈕重構（方案 A）

**修改 `src/renderer/pages/home/index.tsx`**

把寫死的 6 個 `<ExportCard>` 改為設定陣列（key 來自 `ExportPermissionKey`）：

```typescript
const EXPORT_CONFIG: {
  key: ExportPermissionKey;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  badgeType?: 'success';
  onClick: () => void;
}[] = [
  { key: 'exportTaipeiBay', title: '台北港格式', description: '標準輸出', icon: '🏢',
    onClick: () => handleExportClick(ipcApi.excel.exportTaipeiBay) },
  { key: 'exportKaohsiungChaofeng', title: '高雄超峰格式', description: '蝦皮新版基礎', icon: '🚚',
    onClick: () => handleExportClick(ipcApi.excel.exportKaohsiungChaofeng) },
  { key: 'exportShopee', title: '蝦皮2轉', description: 'Shopee', icon: '🛒',
    onClick: () => handleExportClick(ipcApi.excel.exportShopee) },
  { key: 'exportShopeeNew', title: '沛寶速派蝦皮格式', description: 'ShopeeNew', icon: '🛍️',
    badge: 'NEW', badgeType: 'success',
    onClick: () => handleExportClick(ipcApi.excel.exportShopeeNew) },
  { key: 'exportPegasus', title: '天馬格式', description: 'Pegasus', icon: '🐴',
    onClick: () => handleExportClick(ipcApi.excel.exportPegasus) },
  { key: 'manifestNumber', title: '分艙編號', description: '僅帶入艙單號', icon: '🔢',
    onClick: handleManifestClick },
];

const visibleExports = EXPORT_CONFIG.filter((c) => canSeeExport(authUser, c.key));
```

- `manifestNumber` 維持其原本的 onClick 邏輯（含 ⚙️ 設定按鈕 wrapper），渲染時對該 key 特別處理 wrapper。
- 過濾後為空 → 顯示提示文字。

---

## Phase 7：AuthContext 擴充

**修改 `src/renderer/contexts/auth-dialog-context/index.tsx`**

- 新增 state：`role: UserRole`、`permissions: ExportPermissionKey[] | null`、`account`。
- `handleConfirm` / `initAuth` 設定上述 state（login 回傳 `AppUser`）。
- localStorage 改存 `AppUser`（不含密碼）；`initAuth` 直接還原。
- 對外暴露 `authUser: AppUser`（給首頁過濾與管理入口判斷用）。

> ⚠️ 相容性：因 `initAuth` 原本用 localStorage 內的 password 重新登入，調整後不再依賴密碼。需移除舊邏輯並改為直接還原 `AppUser`。

---

## Phase 8：Admin 使用者管理 UI

### 8.1 入口（`layout/index.tsx`）

- 取得 `authUser.role`；`role === 'admin'` 時於 Actions 區塊渲染「👥 使用者管理」按鈕，點擊開啟對話框。

### 8.2 `UserManagementDialog`（新組件）

- 位置：`src/renderer/components/user-management-dialog/`（或 `pages/home` 下，與既有 Manifest 對話框一致）。
- 載入：`ipcApi.users.list({ operatorAccount })` → 表格。
- 編輯/新增表單：姓名、帳號（編輯唯讀）、密碼、角色 radio、按鈕 checkbox（含「全部可見」），對應 FEATURE_SPEC §4.3 行為。
- 儲存：`ipcApi.users.save`；刪除：`ipcApi.users.delete`（前置確認對話框）→ 成功後重新 `list` 刷新。
- 共用 `EXPORT_PERMISSION_ITEMS` 產生 checkbox，避免清單不同步。

---

## Phase 9：測試

- 單元：`permission.util.test.ts`（§8.1）、`user-handlers-v2` 邏輯測試（§8.2，必要時抽出純函式測試）。
- E2E：`e2e/` 新增測試，涵蓋 §8.3 案例 15–18（可用既有 `/playwright-e2e` skill）。

---

## 檔案變更清單

| 類型 | 檔案 |
|------|------|
| 新增 | `src/shared/permission.types.ts` |
| 新增 | `src/shared/permission.util.ts` |
| 新增 | `src/shared/__tests__/permission.util.test.ts` |
| 新增 | `src/main/modules/user-handlers-v2/index.ts` |
| 新增 | `src/renderer/components/user-management-dialog/index.tsx`（+ `style.css`） |
| 修改 | `src/main/utils/google-sheets.tool/index.interface.ts`（UsersSheet 加欄位） |
| 修改 | `src/main/utils/google-sheets.tool/index.ts`（`writeUsersSheet`） |
| 修改 | `src/shared/ipc-contracts.ts`（auth.login 型別、users 群組） |
| 修改 | `src/main/modules/auth-handlers-v2/index.ts`（回傳 AppUser） |
| 修改 | `src/main/main.ts`（註冊 user handlers） |
| 修改 | `src/renderer/api/ipc-api.ts`（users API） |
| 修改 | `src/renderer/contexts/auth-dialog-context/index.tsx`（role/permissions/authUser） |
| 修改 | `src/renderer/pages/home/index.tsx`（EXPORT_CONFIG + 過濾） |
| 修改 | `src/renderer/layout/index.tsx`（使用者管理入口） |
| 手動 | Google Sheet「用戶資訊」表新增欄位、設定 admin |
