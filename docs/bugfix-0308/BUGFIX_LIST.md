# Bugfix 0308 - Bug 與需求清單

> 建立日期：2026-03-08
> 狀態符號：⬜ 待處理 | 🔄 處理中 | ✅ 已完成 | ⚠️ 需確認

---

## Bug 列表

### BUG-1：艙單編號跨組切換失敗（嚴重）

**狀態**：✅ 已完成
**來源**：PDF ③ + 用戶回報截圖
**嚴重程度**：🔴 高（影響核心業務流程）

**問題描述**：

用戶設定兩組艙單編號格式：
- **格式群組 1**：英文 1 位 + 數字 3 位（A000 ~ Z999，共 26,000 個）
- **格式群組 2**：英文 2 位 + 數字 2 位（AA00 ~ ZZ99，共 67,600 個），黑名單排除 AA00 ~ QZ99

當格式群組 1 用完（到達 Z999）後，預期應進入格式群組 2，從 RA00（第一個不在黑名單的編號）開始。

**實際結果**：Z999 之後直接跳回格式群組 1 的 A000/A001，完全沒有進入格式群組 2。

**根因分析**：

位於 `src/main/modules/manifest-number-handlers-v2/index.ts` 的 `getNextValidNumber()` 函數（第 261-289 行）有 **10,000 次迭代上限**：

```typescript
for (let i = 0; i < 10000; i++) {
  next = incrementNumber(next, format);
  if (!next) return null;
  if (!shouldSkipNumber(next, blacklist, skipZeroNumbers, format)) {
    return { number: next, skipped };
  }
  skipped.push(next);
}
return null; // ← 10,000 次後放棄，回傳 null
```

黑名單 AA00 ~ QZ99 涵蓋的編號數量：
- 英文部分 AA ~ QZ = 17 × 26 = 442 組
- 每組 100 個數字 = **44,200 個被排除的編號**

因此 `getNextValidNumber()` 從 AA00 開始嘗試，在 10,000 次迭代後（約到達 DV00 附近）就提前放棄，**錯誤地回報格式群組 2 已用盡**。

接著 `getNextValidNumberAcrossGroups()` 進入「繞回起始組」邏輯（第 368-406 行），重新從格式群組 1 的 A000 開始，造成編號循環。

**影響檔案**：
- `src/main/modules/manifest-number-handlers-v2/index.ts`：`getNextValidNumber()` 函數

**建議修復方案**：

方案 A（推薦）：使用二分搜尋/直接計算跳過黑名單範圍，不依賴逐一遞增。當下一個編號落在某個黑名單範圍內時，直接跳到該範圍的 `end` 值之後的下一個編號。

方案 B：大幅提高迭代上限（如 100,000），但治標不治本，大黑名單仍可能超限。

---

### BUG-2：部分用戶啟動時 DLL 載入失敗

**狀態**：✅ 已完成
**來源**：用戶截圖（`f95c7b7c4d5395e1efe6f3b4fb1d11f2.png`）
**嚴重程度**：🔴 高（App 完全無法啟動）

**問題描述**：

部分用戶開啟應用程式時出現以下錯誤：

```
Uncaught Exception:
Error: node-loader:
Error: A dynamic link library (DLL) initialization routine failed.
C:\Users\winner\Desktop\win-unpacked\...\a3338457668b8c311286046839af6074.node
```

該 `.node` 檔案為 webpack node-loader 打包後的 `onnxruntime_binding.node`（ONNX Runtime 的原生模組）。

**根因分析**：

ONNX Runtime 原生模組 (`onnxruntime_binding.node`) 在載入時需要以下 DLL 依賴：
- `onnxruntime.dll`（~23MB，核心推論引擎）
- `DirectML.dll`（~18MB，GPU 加速）
- `dxcompiler.dll`（~18MB，DirectX 編譯器）
- `dxil.dll`（~1.5MB，DirectX IL 執行環境）

可能原因：
1. **用戶系統缺少 Visual C++ Redistributable** — ONNX Runtime 依賴 VC++ Runtime
2. **用戶系統缺少 DirectX 12 元件** — DirectML.dll 初始化需要 DirectX 12 支援，較舊的 Windows 10 版本可能不支援
3. **打包時 DLL 未正確複製** — `copy-deps.js`（`.erb/scripts/copy-deps.js`）可能在某些環境下未正確執行
4. **DLL 搜尋路徑問題** — `.node` 檔案與 DLL 依賴不在同一目錄

**影響檔案**：
- `.erb/scripts/copy-deps.js`：打包後複製 DLL 的腳本
- `.erb/configs/webpack.config.base.ts`：node-loader 設定
- `src/main/utils/model-run/index.ts`：載入 onnxruntime-node 的入口

**建議修復方案**：

1. 在 App 啟動時加入 try-catch，當 ONNX Runtime 載入失敗時提供友善的錯誤提示（而非彈出原始 JS 錯誤）
2. 考慮將 ONNX Runtime 載入改為延遲載入（lazy loading），只在實際需要分類時才載入
3. 確認打包時 DLL 是否全部正確複製至 `release/build/win-unpacked/resources/app/dist/main/`
4. 考慮在安裝包中捆綁 Visual C++ Redistributable

---

### BUG-3：收貨人資訊 — 雲端反抓覆蓋原始資料

**狀態**：✅ 已完成
**來源**：PDF ④
**嚴重程度**：🟡 中

**問題描述**：

目前 `processRecipientInfo()` 的行為是：
1. 用統一編號從雲端（Google Sheets）快取比對收貨人資訊
2. **匹配到時會自動覆蓋原始 Excel 資料**（帶入英文名稱和電話）
3. 新收貨人會上傳到雲端

用戶反映：不希望雲端資料反向覆蓋原始 Excel 資料。希望改為「**只上傳新收貨人到雲端，但不從雲端拉回覆蓋原始資料的英文名稱和電話**」。

**現行程式邏輯**（`src/main/modules/excel-hanlders/services/recipient-info.service.ts`，第 68-94 行）：

```typescript
if (match) {
  const updatedRow = { ...row };
  // ↓ 這裡會覆蓋原始資料
  if (englishName) {
    updatedRow[ExcelColumnKeys.RecipientEnglishName] = englishName;
  }
  if (phone) {
    updatedRow[ExcelColumnKeys.RecipientPhone] = phone;
  }
  // ... 海關註記標紅仍保留
}
```

**期望行為**：
- ✅ 新收貨人繼續上傳到 Google Sheets
- ✅ 海關註記標紅功能保留（比對仍需執行）
- ❌ 不覆蓋原始 Excel 的收貨人英文名稱
- ❌ 不覆蓋原始 Excel 的收貨人電話

**影響範圍**：此行為影響所有匯出格式（台北港、高雄超峰、蝦皮、沛寶速派、天馬），因為它們都呼叫 `processRecipientInfo()`。

**影響檔案**：
- `src/main/modules/excel-hanlders/services/recipient-info.service.ts`：`processRecipientInfo()` 函數

**建議修復方案**：

移除或條件化英文名稱和電話的覆蓋邏輯，只保留海關註記檢查與新收貨人收集功能。

---

## 功能變更需求

### CHANGE-1：蝦皮格式更名 + 處理邏輯變更

**狀態**：✅ 已完成
**來源**：PDF ①
**類型**：UI 變更 + 邏輯變更

**需求描述**：

1. **UI 更名**：「蝦皮格式」→「**蝦皮2轉**」
2. **處理邏輯變更**：改為套用台北港格式的處理邏輯，但**取消**單件 40kg 以上調整為 2000 up 的規則

**目前狀態**：
- 按鈕位於 `src/renderer/pages/home/index.tsx`（第 509-514 行）
- 標題：`"蝦皮格式"` → 呼叫 `ipcApi.excel.exportShopee`

**變更細節**：
| 項目 | 現行 | 變更後 |
|------|------|--------|
| UI 名稱 | 蝦皮格式 | 蝦皮2轉 |
| 處理函數 | `processExcelDataShopee()` | `processExcelDataTaipeiBay()` 但移除 40kg/2000 規則 |
| 40kg 規則 | N/A（蝦皮格式無此規則） | 不套用（台北港有但需取消） |

**備註**：只有「蝦皮」這個按鈕需要修改，其他格式不變。

**影響檔案**：
- `src/renderer/pages/home/index.tsx`：ExportCard title 修改
- `src/main/modules/excel-hanlders/services/data-controller.service.ts`：新增或修改處理函數
- `src/main/modules/excel-handlers-v2/index.ts`：對應 IPC handler 調整

---

### CHANGE-2：沛寶速派格式更名

**狀態**：✅ 已完成
**來源**：PDF ②
**類型**：UI 變更

**需求描述**：

「沛寶.速派格式」→「**沛寶速派蝦皮格式**」（僅更名，處理邏輯不變）

**影響檔案**：
- `src/renderer/pages/home/index.tsx`（第 515-522 行）：ExportCard title 修改

---

### CHANGE-3：收貨人資訊資料庫新增「艙提單號」欄位

**狀態**：✅ 已完成
**來源**：PDF ④
**類型**：資料結構擴充

**需求描述**：

在收貨人資訊資料庫（Google Sheets）中新增「**艙提單號**」欄位，上傳新收貨人時，同時抓取原始 Excel 資料的 A 欄（分提單號 `ShippingOrderNumber`）一起上傳。

**目前收貨人資訊結構**（`RecipientInfoColumnKeys`，`index.interface.ts` 第 38-47 行）：

| 欄位 | Key |
|------|-----|
| 收貨人統一編號 | `TaxNumber` |
| 收貨人英文名稱 | `EnglishName` |
| 收貨人電話 | `Phone` |
| 海關註記 | `CustomsNote` |

**變更後結構**：

| 欄位 | Key | 說明 |
|------|-----|------|
| **艙提單號** | **ManifestNumber** | **新增** — 來自原始 Excel A 欄（分提單號） |
| 收貨人統一編號 | `TaxNumber` | 不變 |
| 收貨人英文名稱 | `EnglishName` | 不變 |
| 收貨人電話 | `Phone` | 不變 |
| 海關註記 | `CustomsNote` | 不變 |

**影響檔案**：
- `src/main/utils/google-sheets.tool/index.interface.ts`：`RecipientInfoColumnKeys` 新增欄位
- `src/main/modules/excel-hanlders/services/recipient-info.service.ts`：上傳邏輯新增欄位
- Google Sheets 收貨人資訊工作表：需新增欄位標題

---

## 優先級排序

| 排序 | 編號 | 標題 | 類型 | 嚴重度 |
|------|------|------|------|--------|
| 1 | BUG-1 | 艙單編號跨組切換失敗 | Bug | 🔴 高 |
| 2 | BUG-2 | DLL 載入失敗 | Bug | 🔴 高 |
| 3 | BUG-3 | 收貨人資訊雲端反抓覆蓋 | Bug | 🟡 中 |
| 4 | CHANGE-3 | 收貨人資訊新增艙提單號欄位 | 功能變更 | 🟡 中 |
| 5 | CHANGE-1 | 蝦皮格式更名 + 邏輯變更 | 功能變更 | 🔵 低 |
| 6 | CHANGE-2 | 沛寶速派格式更名 | 功能變更 | 🔵 低 |

---

## 關聯檔案總覽

| 檔案路徑 | 涉及項目 |
|----------|----------|
| `src/main/modules/manifest-number-handlers-v2/index.ts` | BUG-1 |
| `.erb/scripts/copy-deps.js` | BUG-2 |
| `.erb/configs/webpack.config.base.ts` | BUG-2 |
| `src/main/utils/model-run/index.ts` | BUG-2 |
| `src/main/modules/excel-hanlders/services/recipient-info.service.ts` | BUG-3, CHANGE-3 |
| `src/main/utils/google-sheets.tool/index.interface.ts` | CHANGE-3 |
| `src/renderer/pages/home/index.tsx` | CHANGE-1, CHANGE-2 |
| `src/main/modules/excel-hanlders/services/data-controller.service.ts` | CHANGE-1 |
| `src/main/modules/excel-handlers-v2/index.ts` | CHANGE-1 |
