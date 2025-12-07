# IPC 架構遷移清單

本文件追蹤從舊 IPC 架構（bridge 模式）遷移到新的類型安全 IPC 架構的進度。

## 遷移原則

1. **新舊系統並存**：新 API 使用不同的 channel 名稱（如 `settings-v2/*`），不影響舊系統運作
2. **漸進式遷移**：逐步將 bridge 函數替換為新的 `ipcApi` 調用
3. **完整測試**：每個 API 遷移後需驗證功能正常
4. **保持穩定**：確保原有功能不受影響

---

## 遷移進度總覽

| 模組 | 總計 | 已完成 | 進度 | 備註 |
|------|------|--------|------|------|
| Settings | 6 | 6 | 100% | |
| App Status | 2 | 2 | 100% | |
| Auth | 2 | 2 | 100% | |
| Excel | 10 | 10 | 100% | 1 個死代碼已移除 |
| Debug | 2 | - | - | 開發工具，暫不遷移 |
| **總計** | **20** | **20** | **100%** | 🎉 遷移完成 |

---

## Settings 模組 ✅ 完成

來源檔案：`src/main/context-bridge/setting.bridge.ts`
Handler 檔案：`src/main/modules/settings-handlers-v2/index.ts`

| # | Bridge 函數 | 舊 Channel | 新 API | 狀態 |
|---|-------------|------------|--------|------|
| 1 | `getSetting()` | `GET_SETTINGS` | `ipcApi.settingsV2.get()` | ✅ 完成 |
| 2 | `sendSetting()` | `SAVE_SETTINGS` | `ipcApi.settingsV2.save()` | ✅ 完成 |
| 3 | `getSettingSheet()` | `GET_SETTINGS_SHEET` | `ipcApi.settingsV2.getSheet()` | ✅ 完成 |
| 4 | `sendSettingSheet()` | `SAVE_SETTINGS_SHEET` | `ipcApi.settingsV2.saveSheet()` | ✅ 完成 |
| 5 | `importSettingSheet()` | `IMPORT_SETTINGS_SHEET` | `ipcApi.settingsV2.importSheet()` | ✅ 完成 |
| 6 | `getSystemSettingSheetNames()` | `GET_SYSTEM_SETTINGS_SHEET_NAMES` | `ipcApi.settingsV2.getSheetNames()` | ✅ 完成 |

---

## App Status 模組 ✅ 完成

來源檔案：`src/main/context-bridge/app-status.bridge.ts`
Handler 檔案：`src/main/modules/app-status-handlers-v2/index.ts`

| # | Bridge 函數 | 舊 Channel | 新 API | 狀態 |
|---|-------------|------------|--------|------|
| 1 | `appStartInit()` | `APP_START_INIT` | `ipcApi.app.init()` | ✅ 完成 |
| 2 | `getDataInitialized()` | `GET_DATA_INITIALIZED` | `ipcApi.app.isInitialized()` | ✅ 完成 |

> 注意：`onDataInitialized()` 是死代碼，已註解移除（無任何地方使用）

---

## Auth 模組 ✅ 完成

來源檔案：`src/main/context-bridge/auth.bridge.ts`
Handler 檔案：`src/main/modules/auth-handlers-v2/index.ts`

| # | Bridge 函數 | 舊 Channel | 新 API | 狀態 |
|---|-------------|------------|--------|------|
| 1 | `sendLogin()` | `LOGIN` | `ipcApi.auth.login()` | ✅ 完成 |
| 2 | `sendLogout()` | `LOGOUT` | `ipcApi.auth.logout()` | ✅ 完成 |

---

## Excel 模組 ✅ 完成

來源檔案：`src/main/context-bridge/excel.bridge.ts`
Handler 檔案：`src/main/modules/excel-handlers-v2/index.ts`

| # | Bridge 函數 | 舊 Channel | 新 API | 狀態 |
|---|-------------|------------|--------|------|
| 1 | `sendSelectExcelFile()` | `SELECT_EXCEL_FILE` | `ipcApi.excel.selectFile()` | ✅ 完成 |
| 2 | `sendExportDefaultSheet()` | `EXPORT_DEFAULT_SHEET` | `ipcApi.excel.exportDefault()` | ✅ 完成 |
| 3 | `sendExportDefaultSheetWithWeightProcess()` | `EXPORT_DEFAULT_SHEET_WITH_WEIGHT_PROCESS` | `ipcApi.excel.exportDefaultWithWeight()` | ✅ 完成 |
| 4 | `sendExportShopeeSheet()` | `EXPORT_SHOPEE_SHEET` | `ipcApi.excel.exportShopee()` | ✅ 完成 |
| 5 | `sendExportShopeeSheetNew()` | `EXPORT_SHOPEE_SHEET_NEW` | `ipcApi.excel.exportShopeeNew()` | ✅ 完成 |
| 6 | `sendExportPegasusSheet()` | `EXPORT_PEGASUS_SHEET` | `ipcApi.excel.exportPegasus()` | ✅ 完成 |
| 7 | `sendGetWrongData()` | `GET_WRONG_DATA` | `ipcApi.excel.getWrongData()` | ✅ 完成 |
| 8 | `sendAddNewProductMap()` | `ADD_NEW_PRODUCT_MAP` | `ipcApi.excel.addProductMap()` | ✅ 完成 |
| 9 | `sendGetProductMap()` | `GET_PRODUCT_MAP` | `ipcApi.excel.getProductMap()` | ✅ 完成 |
| 10 | `sendGetClassifyPrdouctName()` | `GET_CLASSIFY_PRODUCT_NAME` | `ipcApi.excel.classifyProductName()` | ✅ 完成 |

> 注意：`onceExcelData()` 是死代碼，已註解移除（無任何地方使用，Main 端也未發送該事件）

---

## Debug 模組 ⚠️ 暫不遷移

來源檔案：`src/main/context-bridge/debug.bridge.ts`

| # | Bridge 函數 | 舊 Channel | 新 API | 狀態 |
|---|-------------|------------|--------|------|
| 1 | `listenForDebugMessages()` | `DEBUG_MESSAGE` | - | ⚠️ 暫不遷移 |
| 2 | `getDebugMessages()` | （本地函數） | - | ⚠️ 暫不遷移 |

> **暫不遷移原因：**
> 1. 此模組為開發除錯工具，用於在 UI 顯示來自 main process 的 debug 訊息
> 2. 這是「事件推送」模式（main → renderer），與 V2 架構的「請求-響應」模式不同
> 3. V2 架構使用 `ipcMain.handle` / `ipcRenderer.invoke`，適用於單次請求
> 4. 事件監聽需要 `ipcRenderer.on` 持續監聽，無法直接用 invoke 替代
> 5. 目前功能運作正常，優先級較低

---

## 實作順序建議

### 第一階段：Settings 模組 ✅ 完成
- [x] `getSetting` / `sendSetting`
- [x] `getSettingSheet` / `sendSettingSheet`
- [x] `importSettingSheet`
- [x] `getSystemSettingSheetNames`

### 第二階段：App Status 模組 ✅ 完成
- [x] `appStartInit`
- [x] `getDataInitialized`

### 第三階段：Auth 模組 ✅ 完成
- [x] `sendLogin`
- [x] `sendLogout`

### 第四階段：Excel 核心功能 ✅ 完成
- [x] `sendSelectExcelFile`
- [x] `sendExportDefaultSheet`
- [x] `sendExportDefaultSheetWithWeightProcess`

### 第五階段：Excel 匯出功能 ✅ 完成
- [x] `sendExportShopeeSheet`
- [x] `sendExportShopeeSheetNew`
- [x] `sendExportPegasusSheet`

### 第六階段：Excel 資料處理 ✅ 完成
- [x] `sendGetWrongData`
- [x] `sendAddNewProductMap`
- [x] `sendGetProductMap`
- [x] `sendGetClassifyPrdouctName`

### 第七階段：事件監聽（已評估完成）
- [x] `onceExcelData` - 死代碼，已註解移除
- [x] `onDataInitialized` - 死代碼，已註解移除
- [x] `listenForDebugMessages` - 開發工具，暫不遷移（已加註解說明）

---

## 更新記錄

| 日期 | 更新內容 |
|------|----------|
| 2025-12-07 | 建立遷移清單，完成 Settings 模組 4 個 API |
| 2025-12-07 | 完成 Settings、App Status、Auth 模組（共 10 個 API，進度 43%） |
| 2025-12-07 | 完成 Excel 模組（10/11 API，進度 87%），僅剩事件監聽待評估 |
| 2025-12-07 | 🎉 遷移完成！評估事件監聽：2 個死代碼已移除、1 個開發工具暫不遷移 |
