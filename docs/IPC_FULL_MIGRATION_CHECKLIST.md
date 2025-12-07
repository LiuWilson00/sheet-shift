# IPC 完整遷移清單

本文件追蹤從舊 IPC 架構完全遷移到新的類型安全 IPC 架構的進度。

**🎉 遷移已完成！** (2025-12-07)

---

## 遷移步驟總覽

### 第一階段：Renderer 端切換到新 API ✅ 完成

| # | 檔案 | 舊 API | 新 API | 狀態 |
|---|------|--------|--------|------|
| 1 | `layout/index.tsx` | `appStatusBridge.appStartInit()` | `ipcApi.app.init()` | ✅ |
| 2 | `layout/index.tsx` | `settingBridge.getSystemSettingSheetNames()` | `ipcApi.settingsV2.getSheetNames()` | ✅ |
| 3 | `contexts/sheet-settings-dialog-context/index.tsx` | `settingBridge.sendSettingSheet()` | `ipcApi.settingsV2.saveSheet()` | ✅ |
| 4 | `contexts/sheet-settings-dialog-context/index.tsx` | `appStatusBridge.appStartInit()` | `ipcApi.app.init()` | ✅ |
| 5 | `contexts/sheet-settings-dialog-context/index.tsx` | `settingBridge.getSettingSheet()` | `ipcApi.settingsV2.getSheet()` | ✅ |
| 6 | `contexts/sheet-settings-dialog-context/index.tsx` | `settingBridge.importSettingSheet()` | `ipcApi.settingsV2.importSheet()` | ✅ |
| 7 | `pages/home/index.tsx` | `excelBridge.sendSelectExcelFile()` | `ipcApi.excel.selectFile()` | ✅ |
| 8 | `pages/home/index.tsx` | `excelBridge.sendExportDefaultSheet()` | `ipcApi.excel.exportDefault()` | ✅ |
| 9 | `pages/home/index.tsx` | `excelBridge.sendExportDefaultSheetWithWeightProcess()` | `ipcApi.excel.exportDefaultWithWeight()` | ✅ |
| 10 | `pages/home/index.tsx` | `excelBridge.sendExportShopeeSheet()` | `ipcApi.excel.exportShopee()` | ✅ |
| 11 | `pages/home/index.tsx` | `excelBridge.sendExportPegasusSheet()` | `ipcApi.excel.exportPegasus()` | ✅ |
| 12 | `pages/home/index.tsx` | `excelBridge.sendExportShopeeSheetNew()` | `ipcApi.excel.exportShopeeNew()` | ✅ |
| 13 | `pages/home/index.tsx` | `excelBridge.sendGetWrongData()` | `ipcApi.excel.getWrongData()` | ✅ |
| 14 | `contexts/settings-dialog-context/indext.tsx` | `settingBridge.sendSetting()` | `ipcApi.settingsV2.save()` | ✅ |
| 15 | `contexts/settings-dialog-context/indext.tsx` | `settingBridge.getSetting()` | `ipcApi.settingsV2.get()` | ✅ |
| 16 | `pages/home/components/data-debugging-dialog/index.tsx` | `excelBridge.sendGetClassifyPrdouctName()` | `ipcApi.excel.classifyProductName()` | ✅ |
| 17 | `pages/home/components/data-debugging-dialog/index.tsx` | `excelBridge.sendGetProductMap()` | `ipcApi.excel.getProductMap()` | ✅ |
| 18 | `pages/home/components/data-debugging-dialog/index.tsx` | `excelBridge.sendAddNewProductMap()` | `ipcApi.excel.addProductMap()` | ✅ |
| 19 | `contexts/auth-dialog-context/index.tsx` | `authBridge.sendLogin()` | `ipcApi.auth.login()` | ✅ |
| 20 | `components/TestNewIPC.tsx` | `settingBridge.getSetting()` | `ipcApi.settingsV2.get()` | ✅ |

> 注意：`debugBridge.listenForDebugMessages()` 保留，因為是事件推送模式

---

### 第二階段：移除舊的 Main Process Handlers ✅ 完成

| # | 檔案 | 說明 | 狀態 |
|---|------|------|------|
| 1 | `src/main/modules/save-settings-handlers/` | Settings 舊 handlers（整個資料夾已刪除） | ✅ |
| 2 | `src/main/modules/app-status-handlers/` | App Status 舊 handlers（整個資料夾已刪除） | ✅ |
| 3 | `src/main/modules/auth-handlers/` | Auth 舊 handlers（整個資料夾已刪除） | ✅ |
| 4 | `src/main/modules/excel-hanlders/index.ts` | Excel 舊 handlers（index.ts 已刪除，保留 services/） | ✅ |

---

### 第三階段：移除舊的 Context Bridge ✅ 完成

| # | 檔案 | 說明 | 狀態 |
|---|------|------|------|
| 1 | `src/main/context-bridge/setting.bridge.ts` | Settings bridge（已刪除） | ✅ |
| 2 | `src/main/context-bridge/app-status.bridge.ts` | App Status bridge（已刪除） | ✅ |
| 3 | `src/main/context-bridge/auth.bridge.ts` | Auth bridge（已刪除） | ✅ |
| 4 | `src/main/context-bridge/excel.bridge.ts` | Excel bridge（已刪除） | ✅ |
| 5 | `src/main/context-bridge/debug.bridge.ts` | Debug bridge（保留 - 事件推送模式） | ⚠️ 保留 |

---

### 第四階段：更新 Preload 和類型定義 ✅ 完成

| # | 檔案 | 說明 | 狀態 |
|---|------|------|------|
| 1 | `src/main/preload.ts` | 移除舊 bridge 引用，只保留 debugBridge | ✅ |
| 2 | `src/renderer/preload.d.ts` | 類型自動從 preload.ts 導入（無需修改） | ✅ |

---

### 第五階段：清理 main.ts ✅ 完成

| # | 說明 | 狀態 |
|---|------|------|
| 1 | 移除舊 handlers 的 import | ✅ |
| 2 | 移除舊 handlers 的 setup 調用 | ✅ |
| 3 | 保留 V2 命名（未來可考慮重命名） | ✅ |

---

### 第六階段：清理常數和未使用代碼 ✅ 完成

| # | 檔案 | 說明 | 狀態 |
|---|------|------|------|
| 1 | `src/constants/ipc-channels.ts` | 保留（DEBUG_MESSAGE 等仍在使用） | ⚠️ 保留 |
| 2 | TypeScript 編譯檢查 | 無錯誤 | ✅ |
| 3 | ESLint 檢查 | src/ 目錄無錯誤 | ✅ |

---

## 保留的項目

1. **debug.bridge.ts**：事件推送模式，與 V2 架構的請求-響應模式不同
2. **excel-hanlders/services/**：業務邏輯，V2 handlers 依賴這些服務
3. **excel-hanlders/index.const.ts**：常數定義
4. **excel-hanlders/index.interface.ts**：型別定義
5. **logger-handlers**：新架構的一部分
6. **ipc-channels.ts**：仍用於 DEBUG_MESSAGE 等

---

## 已刪除的檔案

### Main 端
- `src/main/modules/save-settings-handlers/` (整個資料夾)
- `src/main/modules/app-status-handlers/` (整個資料夾)
- `src/main/modules/auth-handlers/` (整個資料夾)
- `src/main/modules/excel-hanlders/index.ts`
- `src/main/context-bridge/setting.bridge.ts`
- `src/main/context-bridge/app-status.bridge.ts`
- `src/main/context-bridge/auth.bridge.ts`
- `src/main/context-bridge/excel.bridge.ts`

---

## 更新記錄

| 日期 | 更新內容 |
|------|----------|
| 2025-12-07 | 🎉 完成全部遷移！ |
| 2025-12-07 | 第一階段：完成所有 20 個 Renderer API 切換 |
| 2025-12-07 | 第二階段：刪除所有舊 Main Handlers |
| 2025-12-07 | 第三階段：刪除舊 Context Bridge 檔案 |
| 2025-12-07 | 第四階段：更新 preload.ts |
| 2025-12-07 | 第五階段：清理 main.ts |
| 2025-12-07 | 第六階段：驗證編譯和 lint |
