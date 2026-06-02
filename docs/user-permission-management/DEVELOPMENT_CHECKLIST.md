# DEVELOPMENT_CHECKLIST：使用者權限管理

> 功能代號：`user-permission-management`
> 對應文件：[`FEATURE_SPEC.md`](./FEATURE_SPEC.md)、[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)

狀態符號：⬜ 待開發 / 🔄 進行中 / ✅ 完成 / ⚠️ 有問題 / ❌ 取消

---

## Phase 0：Google Sheet 前置（手動）

| 狀態 | 任務 |
|------|------|
| ⬜ | 「用戶資訊」表新增 `role` 欄 |
| ⬜ | 「用戶資訊」表新增 `permissions` 欄 |
| ⬜ | `Eason`、`admin` 兩列 `role` 設為 `admin` |

> ⚠️ 此階段需由使用者於 Google Sheet 操作後，功能才會實際生效。

## Phase 1：型別與共用常數

| 狀態 | 任務 | 檔案 |
|------|------|------|
| ✅ | 建立權限型別與常數 | `src/shared/permission.types.ts` |
| ✅ | `UsersSheet` 加 `role?`、`permissions?` | `src/main/utils/google-sheets.tool/index.interface.ts` |

## Phase 2：權限工具函式（TDD）

| 狀態 | 任務 | 檔案 |
|------|------|------|
| ✅ | 撰寫測試（§8.1 案例 1–8） | `src/shared/__tests__/permission.util.test.ts` |
| ✅ | `normalizeRole` / `parsePermissions` / `serializePermissions` | `src/shared/permission.util.ts` |
| ✅ | `toAppUser` / `toUserRecord` / `toUsersSheet` | 同上 |
| ✅ | `canSeeExport` | 同上 |
| ✅ | 測試全綠（16 passed） | `npx jest src/shared` |

## Phase 3：IPC 契約

| 狀態 | 任務 | 檔案 |
|------|------|------|
| ✅ | `auth.login` 輸出改 `AppUser \| false` | `src/shared/ipc-contracts.ts` |
| ✅ | 新增 `users.list / save / delete` 契約 | 同上 |

## Phase 4：後端 Handlers

| 狀態 | 任務 | 檔案 |
|------|------|------|
| ✅ | `writeUsersSheet`（clear 後 update，處理空陣列） | `src/main/utils/google-sheets.tool/index.ts` |
| ✅ | login 回傳 `toAppUser(user)` | `src/main/modules/auth-handlers-v2/index.ts` |
| ✅ | `setupUserHandlersV2`（含 assertAdmin） | `src/main/modules/user-handlers-v2/index.ts` |
| ✅ | 註冊 user handlers | `src/main/main.ts` |

## Phase 5：Renderer API

| 狀態 | 任務 | 檔案 |
|------|------|------|
| ✅ | 加 `users` API | `src/renderer/api/ipc-api.ts` |

## Phase 6：匯出按鈕重構（方案 A）

| 狀態 | 任務 | 檔案 |
|------|------|------|
| ✅ | 建立 `exportConfigs` 設定陣列 | `src/renderer/pages/home/index.tsx` |
| ✅ | 依 `canSeeExport` 過濾後 `.map()` 渲染 | 同上 |
| ✅ | `manifestNumber` wrapper（⚙️）特殊處理 | 同上 |
| ✅ | 無可見按鈕時顯示提示 | 同上 + `style.css` |

## Phase 7：AuthContext 擴充

| 狀態 | 任務 | 檔案 |
|------|------|------|
| ✅ | 加 `authUser` / `isAdmin` | `src/renderer/contexts/auth-dialog-context/index.tsx` |
| ✅ | localStorage 改存 `AppUser`、`initAuth` 直接還原 | 同上 |

## Phase 8：Admin 使用者管理 UI

| 狀態 | 任務 | 檔案 |
|------|------|------|
| ✅ | Header「使用者管理」入口（僅 admin） | `src/renderer/layout/index.tsx` |
| ✅ | `UserManagementDialog`：列表 | `src/renderer/components/user-management-dialog/` |
| ✅ | 編輯/新增表單（角色、權限 checkbox、全部可見） | 同上 |
| ✅ | 刪除（含確認） | 同上 |
| ✅ | 串接 `users.list / save / delete` + 刷新 | 同上 |

## Phase 9：測試

| 狀態 | 任務 |
|------|------|
| ✅ | 權限工具單元測試（§8.1，16 passed） |
| ✅ | user handlers 邏輯測試（§8.2 案例 9–14，13 passed；含 admin→空白權限防禦性正規化） |
| ✅ | E2E spec 撰寫（§8.3，`e2e/tests/user-permission.spec.ts`） |
| ✅ | TypeScript 型別檢查通過（僅既有 tokenizer.json 錯誤） |
| ✅ | `npm run build:renderer` / `build:main` 通過（EXIT=0） |
| 🔄 | `npm run lint`：新增檔案已修正可自動修復項；其餘為既有 codebase 既存樣式錯誤（如 label-has-associated-control、function-component-definition，與現有元件一致） |

### E2E 執行狀態（`user-permission.spec.ts`）

| 狀態 | 項目 |
|------|------|
| ✅ | 回歸測試：admin 登入成功 + 已連線（證明 auth.login→AppUser 變更無回歸）— **passed** |
| 🔄 | 案例 15a/15b、管理對話框 CRUD（§8.3）— 目前 **skipped**，等 Phase 0 完成後自動執行 |

> E2E 在 Phase 0（Google Sheet 設定 admin role）完成前會以 `test.skip` 略過權限相關案例，並輸出提示；完成後即完整驗證「使用者管理」入口、對話框 CRUD round-trip、admin 全部 6 按鈕。
> 一般使用者「只看到被授權按鈕」的過濾邏輯由 `permission.util.test.ts` 的 `canSeeExport` 完整涵蓋。

---

## 更新記錄

| 日期 | 內容 |
|------|------|
| 2026-06-02 | 建立規格文件（FEATURE_SPEC / IMPLEMENTATION_PLAN / DEVELOPMENT_CHECKLIST） |
| 2026-06-02 | 完成 Phase 1–8 實作；權限工具 TDD 16 項測試通過；main/renderer build 通過。Phase 0（Google Sheet 欄位）待手動設定；§8.2 handler 測試與 §8.3 E2E 待補。 |
| 2026-06-02 | 補齊 §8.2 user-handlers 單元測試（13 passed，並新增後端 admin→空白權限防禦性正規化）與 §8.3 E2E spec。E2E 回歸測試通過（admin 登入無回歸），權限案例待 Phase 0 後執行。單元測試合計 29 passed。 |
