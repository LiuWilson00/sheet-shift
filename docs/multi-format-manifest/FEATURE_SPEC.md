# 艙單編號多組格式設定

## 問題描述

目前每個艙單編號設定（如「台北港J001-J999」）僅支援**一組格式定義**。當編號用完（如 Z999 之後要跑 AA01），用戶需要手動新增另一組設定並切換，缺乏自動銜接機制。

## 解決方案概述

將「一個設定 = 一組格式」改為「一個設定 = 多組格式（FormatGroup）」，支援：
- 一個設定名稱下包含**多組格式/黑名單**（有序列表）
- 當前一組用完時**自動跳到下一組**繼續編號
- 全部用完後**循環回第一組**
- 記錄**當前在第幾組**以及**當前編號**

> **注意**：功能尚未上線，不需考慮向下相容。現有設定可全部刪除重建。

---

## 資料結構設計

### 新結構（直接取代現行結構）

```typescript
/** 單一格式群組 */
interface FormatGroup {
  /** 格式定義 */
  format: ManifestNumberFormat;
  /** 黑名單規則 */
  blacklist: BlacklistRule;
}

/** 當前編號進度 */
interface CurrentProgress {
  /** 當前使用的格式群組索引 (0-based) */
  groupIndex: number;
  /** 當前編號 */
  number: string;
}

interface ManifestNumberConfig {
  settingName: string;
  formatGroups: FormatGroup[];         // 多組格式（有序）
  currentProgress?: CurrentProgress;   // 當前進度
  createdAt?: string;
  updatedAt?: string;
}
```

Google Sheets 欄位（直接使用新格式）：
| 設定名稱 | 格式定義 | 黑名單規則 | 當前編號 | 建立時間 | 更新時間 |
|---------|---------|-----------|---------|---------|---------|
| 台北港 | `[{"segments":[...]}, {"segments":[...]}]` | `[{"ranges":[],"singles":[]}, {"ranges":[],"singles":[]}]` | `{"groupIndex":0,"number":"J001"}` | ... | ... |

- `格式定義`：`ManifestNumberFormat[]` 的 JSON 陣列
- `黑名單規則`：`BlacklistRule[]` 的 JSON 陣列（與格式定義一一對應）
- `當前編號`：`CurrentProgress` 的 JSON 物件

---

## 後端邏輯

### 編號產生流程

```
輸入：configName, count, startFrom?, startGroupIndex?, skipZeroNumbers?

1. 讀取設定 → formatGroups[], currentProgress
2. 決定起始點：
   - 有 startFrom → 使用 startGroupIndex（預設 0）+ startFrom
   - 否則用 currentProgress
   - 都沒有 → groupIndex=0, number=第一組的初始值

3. 產生迴圈（直到產生 count 個）：
   a. 在當前 group 中嘗試 getNextValidNumber()
   b. 如果返回 null（當前組已用完）：
      - groupIndex = (groupIndex + 1) % formatGroups.length
      - 如果回到起始 groupIndex → 全部循環完畢，拋出錯誤
      - 用新 group 的 generateFirstNumber() 作為起始
      - 繼續嘗試
   c. 收集有效編號

4. 返回 { numbers, endAt: number, endGroupIndex: number, skipped }
```

### 關鍵修改

**`toManifestNumberConfig`**：
- 讀取格式定義：`JSON.parse(row.格式定義)` → `ManifestNumberFormat[]`
- 讀取黑名單規則：`JSON.parse(row.黑名單規則)` → `BlacklistRule[]`
- 組合為 `formatGroups: FormatGroup[]`
- 讀取當前編號：`JSON.parse(row.當前編號)` → `CurrentProgress`

**`toSheetFormat`**：
- 寫入格式定義：`JSON.stringify(config.formatGroups.map(g => g.format))`
- 寫入黑名單規則：`JSON.stringify(config.formatGroups.map(g => g.blacklist))`
- 寫入當前編號：`JSON.stringify(config.currentProgress)`

**`generate` handler**：
- 產生過程中遇到 `incrementNumber` 返回 null 時，跳到下一組
- `endAt` 回傳字串，另外回傳 `endGroupIndex`
- 檢測循環：如果繞回起始 groupIndex 且依然無法產生，拋出錯誤

**`updateCurrentNumber` handler**：
- 參數改為接收 `CurrentProgress` 格式（groupIndex + number）
- 寫入 Google Sheets 時序列化為 JSON

**`validate` handler**：
- 接收 `groupIndex` 參數，驗證該群組的格式

---

## 前端設計

### ManifestConfigDialog 修改

**新版**：
```
設定名稱: [___________]

── 格式群組 1 ──────────── [✕ 刪除]
  ── 編號格式設定 ──
    [SegmentEditor]
    [NumberPreview]
  ── 黑名單設定 ──
    [BlacklistEditor]

── 格式群組 2 ──────────── [✕ 刪除]
  ── 編號格式設定 ──
    [SegmentEditor]
    [NumberPreview]
  ── 黑名單設定 ──
    [BlacklistEditor]

[+ 新增格式群組]

目前進度:
  使用群組: [下拉選擇: 群組1 / 群組2]
  目前編號: [___________]  (根據所選群組驗證格式)
```

**要點**：
- 格式群組用可摺疊的區塊，標題顯示群組序號和格式摘要
- 至少保留一組（不可刪除最後一組）
- 新增群組時帶入預設格式
- 「目前進度」的群組選擇會影響編號的格式驗證
- Dialog 需加大或加入捲動以容納多組

### ManifestApplyDialog 修改

**設定資訊顯示**：
```
格式群組數: 2 組
當前使用: 群組 1 (英文1位 + 數字3位)
起始編號: J001
```

**自訂起始編號**：
- 新增「起始群組」下拉選擇（預設為當前群組）
- 編號驗證根據所選群組的格式
- 傳入 `startFrom` 時需包含 `startGroupIndex`

---

## 型別修改清單

### `src/shared/manifest-number.types.ts`

```typescript
// 新增
export interface FormatGroup {
  format: ManifestNumberFormat;
  blacklist: BlacklistRule;
}

export interface CurrentProgress {
  groupIndex: number;
  number: string;
}

// 修改 ManifestNumberConfig（直接取代，不保留舊欄位）
export interface ManifestNumberConfig {
  settingName: string;
  formatGroups: FormatGroup[];
  currentProgress?: CurrentProgress;
  createdAt?: string;
  updatedAt?: string;
}

// 修改 ApplyManifestNumberInput
export interface ApplyManifestNumberInput {
  configName: string;
  count: number;
  startFrom?: string;
  startGroupIndex?: number;              // 起始群組索引
  transactionCode?: string;
  skipZeroNumbers?: boolean;
}

// 修改 ApplyManifestNumberOutput
export interface ApplyManifestNumberOutput {
  numbers: string[];
  endAt: string;
  endGroupIndex: number;                 // 結束時的群組索引
  skipped: string[];
}
```

### `src/renderer/types/manifest-number.ts`

- 移除 `format`, `blacklist`, `currentNumber` 相關邏輯
- 改為使用 `FormatGroup[]`, `CurrentProgress`
- `validateNumber` 改為接收 `ManifestNumberFormat`（從指定群組取得）
- `generatePreview` 改為以群組為單位

---

## 檔案修改清單

| 檔案 | 修改範圍 |
|------|---------|
| `src/shared/manifest-number.types.ts` | 新增 FormatGroup, CurrentProgress；移除 format/blacklist/currentNumber |
| `src/renderer/types/manifest-number.ts` | 同步型別，更新工具函數 |
| `src/main/modules/manifest-number-handlers-v2/index.ts` | 重構 generate 邏輯支援多組循環；更新 toManifestNumberConfig / toSheetFormat |
| `src/renderer/components/manifest-number-dialog/components/ManifestConfigDialog.tsx` | 支援多組格式群組 UI |
| `src/renderer/components/manifest-number-dialog/components/ManifestApplyDialog.tsx` | 顯示群組資訊，起始群組選擇 |
| `src/renderer/components/manifest-number-dialog/style.css` | 群組樣式 |
| `src/shared/ipc-contracts.ts` | 更新 input/output 型別 |
| `src/renderer/api/ipc-api.ts` | 無需改動（型別自動推導） |

---

## 實作順序

### Phase 1：型別與資料層

1. 修改 `manifest-number.types.ts`（新增 FormatGroup, CurrentProgress，移除舊欄位）
2. 修改 `ipc-contracts.ts`（更新 input/output 型別）
3. 修改 `manifest-number-handlers-v2/index.ts`：
   - `toManifestNumberConfig` 直接解析新格式
   - `toSheetFormat` 直接序列化新格式
4. 修改 `renderer/types/manifest-number.ts` 同步更新
5. 驗證：編譯通過

### Phase 2：後端多組產生邏輯

1. 重構 `generate` handler 支援多組循環
2. 修改 `updateCurrentNumber` 支援 CurrentProgress
3. 修改 `validate` handler 支援群組索引
4. 驗證：編譯通過

### Phase 3：前端設定 UI

1. 修改 `ManifestConfigDialog` 支援多組格式群組
2. 驗證：可建立/編輯多組格式設定

### Phase 4：前端帶入 UI

1. 修改 `ManifestApplyDialog` 顯示群組資訊
2. 新增起始群組選擇
3. 更新自訂起始編號驗證
4. 驗證：帶入流程完整

### Phase 5：整合測試

1. 多組設定 E2E 測試（跨組產生、循環）
2. Google Sheets 讀寫驗證

---

## 測試案例

### 多組產生

| 案例 | 預期 |
|------|------|
| 群組1 從 Z97 產生 5 個（Z97-Z99 只有 3 個空間） | Z98, Z99, 然後跳到群組2 的起始值繼續 |
| 全部群組都用完 | 循環回群組1 的起始值 |
| 全部群組空間都已滿（極端） | 拋出錯誤「所有格式群組已用盡」 |
| skipZeroNumbers 跨組 | 跨組後在新組依然跳過數值為 0 的編號 |

### UI

| 案例 | 預期 |
|------|------|
| 新增格式群組 | 帶入預設格式，可獨立編輯 |
| 刪除格式群組（僅剩1組） | 禁用刪除按鈕 |
| 切換起始群組 | 編號格式驗證隨之更新 |
| 當前進度顯示 | 正確顯示「群組 N / 共 M 組」|

---

## 風險與注意事項

1. **Google Sheets 欄位不變**：不新增或刪除欄位，僅改變 JSON 內容格式
2. **循環檢測**：必須防止多組全滿時無限迴圈（記錄起始 groupIndex，繞回即停）
3. **自訂起始編號**：需確認用戶選擇的群組索引，驗證該群組的格式
4. **效能**：多組不影響單次產生效能（最多數百個編號）
