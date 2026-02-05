# 海運表單系統修改 - 開發進度清單

**版本**: 1.0
**建立日期**: 2026-02-04
**狀態**: 開發中

---

## 開發流程

```
┌─────────────────────────────────────────────────────────────────────┐
│  規格驅動開發 (Spec-Driven Development)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐         │
│   │  SPEC   │ -> │  DEV    │ -> │  TEST   │ -> │ UPDATE  │         │
│   │ 撰寫規格 │    │  開發   │    │  測試   │    │ Checklist│        │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘         │
│        │              │              │              │               │
│        v              v              v              v               │
│   FEATURE_SPEC   實作程式碼      E2E 測試     更新此文件             │
│   IMPL_PLAN                                                         │
│                                                                      │
│   ◄─────────────────── 迭代循環 ───────────────────►                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 第一階段：UI Demo & 體驗優化

### 1.1 CSS 變數系統

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 建立 CSS 變數檔案 | `src/renderer/styles/variables.css` | ✅ 已完成 |
| 2 | 引入到主入口 | `src/renderer/index.tsx` | ✅ 已完成 |

### 1.2 型別定義

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 建立艙單編號相關型別 | `src/renderer/types/manifest-number.ts` | ✅ 已完成 |
| 2 | 建立收貨人資訊型別 | `src/shared/recipient-info.types.ts` | ✅ 已完成 |
| 3 | 建立問題件型別 | `src/shared/problem-item.types.ts` | ✅ 已完成 |
| 4 | 建立艙單編號共用型別 | `src/shared/manifest-number.types.ts` | ✅ 已完成 |

### 1.3 ExportCard 組件

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 建立 ExportCard 組件 | `src/renderer/components/export-card/index.tsx` | ✅ 已完成 |
| 2 | 建立 ExportCard 樣式 | `src/renderer/components/export-card/style.css` | ✅ 已完成 |

### 1.4 艙單編號 Dialog

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 建立 Dialog 入口 | `src/renderer/components/manifest-number-dialog/index.tsx` | ✅ 已完成 |
| 2 | 建立設定 Dialog | `src/renderer/components/manifest-number-dialog/components/ManifestConfigDialog.tsx` | ✅ 已完成 |
| 3 | 建立帶入 Dialog | `src/renderer/components/manifest-number-dialog/components/ManifestApplyDialog.tsx` | ✅ 已完成 |
| 4 | 建立 SegmentEditor | `src/renderer/components/manifest-number-dialog/components/SegmentEditor.tsx` | ✅ 已完成 |
| 5 | 建立 SegmentItem | `src/renderer/components/manifest-number-dialog/components/SegmentItem.tsx` | ✅ 已完成 |
| 6 | 建立 BlacklistEditor | `src/renderer/components/manifest-number-dialog/components/BlacklistEditor.tsx` | ✅ 已完成 |
| 7 | 建立 NumberPreview | `src/renderer/components/manifest-number-dialog/components/NumberPreview.tsx` | ✅ 已完成 |
| 8 | 建立 Dialog 樣式 | `src/renderer/components/manifest-number-dialog/style.css` | ✅ 已完成 |
| 9 | 新增交易代碼欄位 | `ManifestApplyDialog.tsx` | ✅ 已完成 |

### 1.5 頁面重構

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 重構 Home 頁面 UI | `src/renderer/pages/home/index.tsx` | ⬜ 待開發 |
| 2 | 更新 Home 頁面樣式 | `src/renderer/pages/home/style.css` | ⬜ 待開發 |
| 3 | 優化 Header | `src/renderer/layout/index.tsx` | ⬜ 待開發 |
| 4 | 更新 Header 樣式 | `src/renderer/layout/style.css` | ⬜ 待開發 |

### 1.6 第一階段測試

| # | 測試項目 | 狀態 |
|---|----------|------|
| 1 | ExportCard 組件渲染正確 | ⬜ 待測試 |
| 2 | 艙單編號設定 Dialog 可開啟/關閉 | ⬜ 待測試 |
| 3 | 艙單編號設定 Dialog 區段編輯功能 | ⬜ 待測試 |
| 4 | 艙單編號設定 Dialog 黑名單編輯功能 | ⬜ 待測試 |
| 5 | 艙單編號設定 Dialog 預覽顯示正確 | ⬜ 待測試 |
| 6 | 艙單編號帶入 Dialog 可開啟/關閉 | ⬜ 待測試 |
| 7 | 艙單編號帶入 Dialog 交易代碼欄位 | ⬜ 待測試 |
| 8 | Home 頁面新 UI 佈局正確 | ⬜ 待測試 |

---

## 第二階段：基礎設施

### 2.1 Google Sheets 資料表

| # | 任務 | 說明 | 狀態 |
|---|------|------|------|
| 1 | 新增「收貨人資訊」表 | 欄位：統一編號、英文名稱、電話、海關註記 | ⬜ 待建立（請參考 GOOGLE_SHEETS_SETUP.md） |
| 2 | 新增「問題件」表 | 欄位：貨物名稱 | ⬜ 待建立（請參考 GOOGLE_SHEETS_SETUP.md） |
| 3 | 新增「艙單編號設定」表 | 欄位：設定名稱、格式定義、黑名單規則、當前編號、時間戳記 | ⬜ 待建立（請參考 GOOGLE_SHEETS_SETUP.md） |

### 2.2 SheetRangeName 更新

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 新增 RecipientInfo | `src/main/utils/google-sheets.tool/index.const.ts` | ✅ 已完成 |
| 2 | 新增 ProblemItems | `src/main/utils/google-sheets.tool/index.const.ts` | ✅ 已完成 |
| 3 | 新增 ManifestNumberConfig | `src/main/utils/google-sheets.tool/index.const.ts` | ✅ 已完成 |
| 4 | 更新 SHEET_RANGES 陣列 | `src/main/utils/google-sheets.tool/index.const.ts` | ✅ 已完成 |

### 2.3 DataStore 實例

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 新增 recipientInfoSheet | `src/main/utils/google-sheets.tool/index.ts` | ✅ 已完成 |
| 2 | 新增 problemItemsSheet | `src/main/utils/google-sheets.tool/index.ts` | ✅ 已完成 |
| 3 | 新增 manifestNumberConfigSheet | `src/main/utils/google-sheets.tool/index.ts` | ✅ 已完成 |
| 4 | 更新 initGoogleSheetData() | `src/main/utils/google-sheets.tool/index.ts` | ✅ 已完成 |

### 2.4 IPC 契約

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 新增 recipientInfo 契約 | `src/shared/ipc-contracts.ts` | ✅ 已完成 |
| 2 | 新增 problemItems 契約 | `src/shared/ipc-contracts.ts` | ✅ 已完成 |
| 3 | 新增 manifestNumber 契約 | `src/shared/ipc-contracts.ts` | ✅ 已完成 |

### 2.5 IPC Handlers

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 建立 recipient-info-handlers-v2 | `src/main/modules/recipient-info-handlers-v2/index.ts` | ✅ 已完成 |
| 2 | 建立 problem-items-handlers-v2 | `src/main/modules/problem-items-handlers-v2/index.ts` | ✅ 已完成 |
| 3 | 建立 manifest-number-handlers-v2 | `src/main/modules/manifest-number-handlers-v2/index.ts` | ✅ 已完成 |
| 4 | 在 main.ts 註冊 handlers | `src/main/main.ts` | ✅ 已完成 |

### 2.6 Renderer API

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 新增 recipientInfo API | `src/renderer/api/ipc-api.ts` | ✅ 已完成 |
| 2 | 新增 problemItems API | `src/renderer/api/ipc-api.ts` | ✅ 已完成 |
| 3 | 新增 manifestNumber API | `src/renderer/api/ipc-api.ts` | ✅ 已完成 |

### 2.7 第二階段測試

| # | 測試項目 | 狀態 |
|---|----------|------|
| 1 | Google Sheets 連線正常 | ⬜ 待測試 |
| 2 | 收貨人資訊 CRUD 功能 | ⬜ 待測試 |
| 3 | 問題件 CRUD 功能 | ⬜ 待測試 |
| 4 | 艙單編號設定 CRUD 功能 | ⬜ 待測試 |
| 5 | IPC 通訊正常 | ⬜ 待測試 |

---

## 第三階段：商業邏輯整合

### 3.1 收貨人資訊功能

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 實作資料比對邏輯 | `src/main/modules/excel-hanlders/services/recipient-info.service.ts` | ✅ 已完成 |
| 2 | 實作自動新增邏輯 | `src/main/modules/excel-hanlders/services/recipient-info.service.ts` | ✅ 已完成 |
| 3 | 實作紅色標記邏輯 | `src/main/modules/excel-hanlders/services/excel-io.service.ts` | ✅ 已完成 |

### 3.2 問題件功能

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 實作完全匹配比對 | `src/main/modules/excel-hanlders/services/problem-items.service.ts` | ✅ 已完成 |
| 2 | 實作紅色標記邏輯 | `src/main/modules/excel-hanlders/services/excel-io.service.ts` | ✅ 已完成 |

### 3.3 背景色優先級系統

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 定義優先級常數 | `src/main/modules/excel-hanlders/index.const.ts` | ✅ 已完成 |
| 2 | 實作 rowFillColor + getBestStyle 函數 | `src/main/modules/excel-hanlders/services/excel-io.service.ts` | ✅ 已完成 |
| 3 | 整合到 addJsonToExcelTemplate | `src/main/modules/excel-hanlders/services/excel-io.service.ts` | ✅ 已完成 |

### 3.4 台北港格式

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 新增台北港匯出函數 | `src/main/modules/excel-hanlders/services/data-controller.service.ts` | ✅ 已完成 |
| 2 | 實作特殊條件處理 (毛重≥40kg & 件數=1) | `src/main/modules/excel-hanlders/services/data-controller.service.ts` | ✅ 已完成 |
| 3 | 實作黃色背景標記 | `src/main/modules/excel-hanlders/services/excel-io.service.ts` | ✅ 已完成 |
| 4 | 整合收貨人資訊/問題件功能 | `src/main/modules/excel-hanlders/services/data-controller.service.ts` | ✅ 已完成 |
| 5 | 新增 IPC 契約 + Handler | `src/shared/ipc-contracts.ts` + `excel-handlers-v2/index.ts` | ✅ 已完成 |
| 6 | 新增 Renderer API | `src/renderer/api/ipc-api.ts` | ✅ 已完成 |

### 3.5 高雄超峰格式

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 建立新匯出函數 | `src/main/modules/excel-hanlders/services/data-controller.service.ts` | ✅ 已完成 |
| 2 | 實作地址自動帶入 | `src/main/modules/excel-hanlders/services/data-controller.service.ts` | ✅ 已完成 |
| 3 | 實作毛重均攤邏輯 | `src/main/modules/excel-hanlders/services/data-controller.service.ts` | ✅ 已完成 |
| 4 | 整合收貨人資訊/問題件功能 | `src/main/modules/excel-hanlders/services/data-controller.service.ts` | ✅ 已完成 |
| 5 | 新增 IPC 契約 + Handler | `src/shared/ipc-contracts.ts` + `excel-handlers-v2/index.ts` | ✅ 已完成 |
| 6 | 新增 Renderer API | `src/renderer/api/ipc-api.ts` | ✅ 已完成 |

### 3.6 艙單編號產生器

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 建立 ManifestNumberGenerator 類別 | `src/main/modules/manifest-number-handlers-v2/index.ts` | ✅ 已完成（內嵌於 handler） |
| 2 | 實作 getFirst() 方法 | `src/main/modules/manifest-number-handlers-v2/index.ts` | ✅ 已完成 |
| 3 | 實作 increment() 方法 | `src/main/modules/manifest-number-handlers-v2/index.ts` | ✅ 已完成 |
| 4 | 實作 isBlacklisted() 方法 | `src/main/modules/manifest-number-handlers-v2/index.ts` | ✅ 已完成 |
| 5 | 實作 next() 方法 | `src/main/modules/manifest-number-handlers-v2/index.ts` | ✅ 已完成 |
| 6 | 實作 generate() 方法 | `src/main/modules/manifest-number-handlers-v2/index.ts` | ✅ 已完成 |
| 7 | 實作 validate() 方法 | `src/main/modules/manifest-number-handlers-v2/index.ts` | ✅ 已完成 |

### 3.7 交易代碼功能

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 在帶入編號時接收交易代碼參數 | `ManifestApplyDialog.tsx` | ✅ 已完成（Phase 1 已加 UI） |
| 2 | 實作寫入 AG 欄位邏輯 | `src/main/modules/excel-hanlders/services/excel-io.service.ts` | ✅ 已完成 |

### 3.8 UI 整合

| # | 任務 | 檔案 | 狀態 |
|---|------|------|------|
| 1 | 連接艙單編號設定 Dialog 到 API | `src/renderer/pages/home/index.tsx` | ✅ 已完成 |
| 2 | 連接艙單編號帶入 Dialog 到 API | `src/renderer/components/manifest-number-dialog/components/ManifestApplyDialog.tsx` | ✅ 已完成 |
| 3 | 連接匯出按鈕到新 API | `src/renderer/pages/home/index.tsx` | ✅ 已完成 |

### 3.9 第三階段測試

| # | 測試項目 | 狀態 |
|---|----------|------|
| 1 | 收貨人資訊自動帶入 | ⬜ 待測試 |
| 2 | 海關註記紅色標記 | ⬜ 待測試 |
| 3 | 問題件紅色標記 | ⬜ 待測試 |
| 4 | 背景色優先級正確 | ⬜ 待測試 |
| 5 | 台北港格式特殊條件處理 | ⬜ 待測試 |
| 6 | 高雄超峰格式毛重均攤 | ⬜ 待測試 |
| 7 | 高雄超峰格式地址帶入 | ⬜ 待測試 |
| 8 | 艙單編號產生正確 | ⬜ 待測試 |
| 9 | 艙單編號黑名單跳過 | ⬜ 待測試 |
| 10 | 交易代碼帶入 AG 欄位 | ⬜ 待測試 |

---

## 第四階段：測試與完善

### 4.1 單元測試

| # | 測試檔案 | 狀態 |
|---|----------|------|
| 1 | `manifest-number-generator.test.ts` | ⬜ 待開發 |
| 2 | `recipient-info.service.test.ts` | ⬜ 待開發 |
| 3 | `problem-items.service.test.ts` | ⬜ 待開發 |

### 4.2 E2E 測試

| # | 測試場景 | 狀態 |
|---|----------|------|
| 1 | 完整匯出流程 - 台北港格式 | ⬜ 待開發 |
| 2 | 完整匯出流程 - 高雄超峰格式 | ⬜ 待開發 |
| 3 | 艙單編號設定與帶入完整流程 | ⬜ 待開發 |
| 4 | 收貨人資訊自動新增流程 | ⬜ 待開發 |

### 4.3 文件更新

| # | 文件 | 狀態 |
|---|------|------|
| 1 | 更新 CLAUDE.md | ⬜ 待更新 |
| 2 | 更新 README.md | ⬜ 待更新 |
| 3 | 更新 FEATURE_SPEC.md 狀態 | ⬜ 待更新 |

---

## 狀態圖例

| 符號 | 意義 |
|------|------|
| ⬜ | 待開發/待測試 |
| 🔄 | 開發中/測試中 |
| ✅ | 已完成 |
| ⚠️ | 有問題/需修改 |
| ❌ | 已取消/不需要 |

---

## 更新記錄

| 日期 | 更新內容 |
|------|----------|
| 2026-02-04 | 初版建立 |
| 2026-02-04 | Phase 1 UI 組件確認完成（已存在）；新增交易代碼欄位到 ManifestApplyDialog |
| 2026-02-04 | Phase 2 基礎設施完成：SheetRangeName、DataStore、IPC 契約、Handlers、Renderer API |
| 2026-02-05 | Phase 3 商業邏輯完成：收貨人資訊比對/自動新增、問題件完全匹配、背景色優先級系統、台北港格式（含特殊條件）、高雄超峰格式（含地址帶入+毛重均攤）、IPC 契約 + Handlers + Renderer API |
| 2026-02-05 | Phase 3.7+3.8 完成：交易代碼寫入 AG 欄位（column 33）、UI 整合（ManifestConfigDialog/ManifestApplyDialog 連接 API、匯出按鈕更新為台北港/高雄超峰格式） |
