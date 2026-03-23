# Bugfix 0308 - 修復報告

> 建立日期：2026-03-08
> 對應清單：`docs/bugfix-0308/BUGFIX_LIST.md`

---

## 目錄

1. [BUG-1：艙單編號跨組切換失敗](#bug-1艙單編號跨組切換失敗)
2. [BUG-2：部分用戶啟動時 DLL 載入失敗](#bug-2部分用戶啟動時-dll-載入失敗)
3. [BUG-3：收貨人資訊雲端反抓覆蓋原始資料](#bug-3收貨人資訊雲端反抓覆蓋原始資料)
4. [CHANGE-1：蝦皮格式更名 + 處理邏輯變更](#change-1蝦皮格式更名--處理邏輯變更)
5. [CHANGE-2：沛寶速派格式更名](#change-2沛寶速派格式更名)
6. [CHANGE-3：收貨人資訊新增艙提單號欄位](#change-3收貨人資訊新增艙提單號欄位)

---

## BUG-1：艙單編號跨組切換失敗

### 根因

`src/main/modules/manifest-number-handlers-v2/index.ts` 第 272 行，`getNextValidNumber()` 函數有硬編碼的 **10,000 次迭代上限**。當黑名單範圍（如 AA00~QZ99 = 44,200 個編號）超過此上限時，函數錯誤回傳 `null`，使得 `getNextValidNumberAcrossGroups()` 誤判該格式群組已用盡，繞回起始群組造成編號重複。

### 故障鏈路

```
generate() handler（第 559 行）
  → getNextValidNumberAcrossGroups()（第 295 行）
    → 當前組（Group 1）incrementNumber("Z999") 回傳 null → 組已用完
    → 切換至 Group 2，產生初始編號 "AA00"
    → "AA00" 在黑名單中，呼叫 getNextValidNumber("AA00", ...)
      → 逐一遞增 AA01, AA02, ... 全部在黑名單範圍
      → 第 10,000 次迭代後放棄 → 回傳 null ← BUG 根因
    → 誤判 Group 2 已用盡
    → 繞回 Group 1 從 A000 重新開始 ← 編號重複
```

### 修復方案

**策略**：黑名單範圍直跳（Range Skip），取代逐一遞增。

**修改檔案**：`src/main/modules/manifest-number-handlers-v2/index.ts`

**修改函數**：`getNextValidNumber()`（第 261-289 行）

**修改前**：
```typescript
export function getNextValidNumber(
  current: string,
  format: ManifestNumberFormat,
  blacklist: BlacklistRule,
  skipZeroNumbers: boolean = false,
): { number: string; skipped: string[] } | null {
  let next: string | null = current;
  const skipped: string[] = [];

  for (let i = 0; i < 10000; i++) {       // ← 硬編碼上限
    next = incrementNumber(next, format);
    if (!next) return null;
    if (!shouldSkipNumber(next, blacklist, skipZeroNumbers, format)) {
      return { number: next, skipped };
    }
    skipped.push(next);
  }
  return null;                              // ← 錯誤放棄
}
```

**修改後**：
```typescript
export function getNextValidNumber(
  current: string,
  format: ManifestNumberFormat,
  blacklist: BlacklistRule,
  skipZeroNumbers: boolean = false,
): { number: string; skipped: string[] } | null {
  let next: string | null = current;
  const skipped: string[] = [];

  // 安全上限：最多嘗試黑名單範圍數量 + 單一排除數量 + 合理餘量
  const maxAttempts = blacklist.ranges.length + blacklist.singles.length + 100;
  let attempts = 0;

  while (attempts < maxAttempts) {
    next = incrementNumber(next, format);
    if (!next) return null;

    // 檢查是否落在某個黑名單範圍內
    const matchedRange = blacklist.ranges.find(
      (r) => next! >= r.start && next! <= r.end,
    );

    if (matchedRange) {
      // 直接跳到範圍結尾的下一個編號，不逐一遞增
      next = incrementNumber(matchedRange.end, format);
      if (!next) return null;
      attempts++;
      // 跳過後仍需檢查是否在其他黑名單或為零值編號
      if (!shouldSkipNumber(next, blacklist, skipZeroNumbers, format)) {
        return { number: next, skipped };
      }
      skipped.push(next);
    } else if (shouldSkipNumber(next, blacklist, skipZeroNumbers, format)) {
      // 在單一排除或零值編號中，正常遞增
      skipped.push(next);
      attempts++;
    } else {
      // 有效編號
      return { number: next, skipped };
    }
  }

  return null;
}
```

**核心改動**：
1. 當偵測到編號落在黑名單範圍內，直接 `incrementNumber(matchedRange.end, format)` 跳到範圍末尾的下一個
2. 迭代上限改為基於黑名單結構的動態計算，而非硬編碼 10,000
3. 原本 44,200 次迭代 → 現在 1-2 次即可跳過整個範圍

### 效能對比

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| 黑名單 AA00~QZ99 (44,200 筆) | 10,000 次迭代後**失敗** | 1 次跳躍即**成功** |
| 無黑名單 | 1 次迭代 | 1 次迭代（無變化） |
| 多個小範圍黑名單 | 逐一遞增 | 每個範圍 1 次跳躍 |

### 需新增測試案例

檔案：`src/main/modules/manifest-number-handlers-v2/__tests__/manifest-number-generator.test.ts`

```typescript
// 測試：大範圍黑名單跳過
it('should skip large blacklist range via direct jump', () => {
  const format = {
    segments: [
      { type: 'alpha' as const, length: 2 },
      { type: 'numeric' as const, length: 2 },
    ],
  };
  const blacklist = {
    ranges: [{ start: 'AA00', end: 'QZ99' }],
    singles: [],
  };
  const result = getNextValidNumber('AA00', format, blacklist);
  expect(result).not.toBeNull();
  expect(result!.number).toBe('RA00');
});

// 測試：跨組切換 + 大範圍黑名單
it('should transition to next group when current exhausted with large blacklist', () => {
  // Group 1: [alpha:1, numeric:3], 無黑名單
  // Group 2: [alpha:2, numeric:2], 黑名單 AA00~QZ99
  // 從 Group 1 的 Z999 開始，預期跳到 Group 2 的 RA00
});
```

---

## BUG-2：部分用戶啟動時 DLL 載入失敗

### 根因

`src/main/utils/model-run/index.ts` 第 5 行在模組層級同步載入 `onnxruntime-node`：

```typescript
const ort = require('onnxruntime-node');  // ← 模組載入時立即執行，無 try-catch
```

此 `require()` 觸發原生 `.node` 檔案載入，進而載入 `onnxruntime.dll`、`DirectML.dll` 等依賴。若用戶系統缺少 VC++ Runtime 或 DirectX 12 元件，DLL 初始化失敗，導致未捕獲的同步例外，App 完全崩潰。

### 載入鏈路

```
main.ts 第 106 行: setupExcelHandlersV2(mainWindow)
  → excel-handlers-v2/index.ts 第 43 行: import { runClassifier } from '../../utils/model-run'
    → model-run/index.ts 第 5 行: const ort = require('onnxruntime-node')  ← DLL 在此載入
      → onnxruntime_binding.node → onnxruntime.dll + DirectML.dll
        → 失敗 → Uncaught Exception → App 崩潰
```

**關鍵事實**：`runClassifier()` 只在用戶手動觸發產品分類時才會被呼叫（`ipcApi.excel.classifyProductName`），但 DLL 卻在 App 啟動時就載入了。產品分類功能不影響 App 的核心功能（Excel 匯出），不應因此阻止 App 啟動。

### 修復方案

**策略**：延遲載入（Lazy Loading）+ 錯誤邊界（Error Boundary）+ 功能降級（Graceful Degradation）

**修改檔案**：`src/main/utils/model-run/index.ts`

**修改前**：
```typescript
const ort = require('onnxruntime-node');  // 第 5 行：模組層級同步載入

let _session: any = null;

const getSession = async () => {
  if (!_session) {
    _session = await ort.InferenceSession.create(`${RESOURCES_PATH}/model.onnx`);
  }
  return _session;
};

export async function runClassifier(inputText: string): Promise<string> {
  const session = await getSession();
  // ... 推論邏輯
}
```

**修改後**：
```typescript
// 延遲載入：不在模組層級 require
let ort: any = null;
let _session: any = null;
let _loadError: Error | null = null;

/**
 * 延遲載入 ONNX Runtime（僅在首次使用時載入）
 */
function getOrt() {
  if (_loadError) throw _loadError;
  if (!ort) {
    try {
      ort = require('onnxruntime-node');
    } catch (error) {
      _loadError = error as Error;
      logger.error('[ModelRun] ONNX Runtime 載入失敗，產品分類功能將無法使用', error);
      throw _loadError;
    }
  }
  return ort;
}

const getSession = async () => {
  if (!_session) {
    const ortModule = getOrt();
    _session = await ortModule.InferenceSession.create(`${RESOURCES_PATH}/model.onnx`);
  }
  return _session;
};

export async function runClassifier(inputText: string): Promise<string> {
  try {
    const session = await getSession();
    // ... 推論邏輯
  } catch (error) {
    logger.error('[ModelRun] 產品分類失敗', error);
    throw new Error(
      '產品分類功能無法使用。可能原因：系統缺少 Visual C++ Redistributable 或 DirectX 12 元件。'
    );
  }
}

/** 檢查 ONNX Runtime 是否可用（供 renderer 查詢） */
export function isModelAvailable(): boolean {
  if (_loadError) return false;
  try {
    getOrt();
    return true;
  } catch {
    return false;
  }
}
```

**核心改動**：
1. `require('onnxruntime-node')` 從模組層級移到 `getOrt()` 函數內（延遲載入）
2. 載入失敗時記錄錯誤並快取，不影響 App 啟動
3. `runClassifier()` 加入 try-catch，回傳使用者可理解的錯誤訊息
4. 新增 `isModelAvailable()` 供 renderer 端查詢功能狀態

**額外建議**（可選）：
- 在 IPC handler (`excel.classifyProductName`) 層級也加入錯誤處理，回傳友善的錯誤訊息給前端
- 考慮在安裝程式中捆綁 VC++ Redistributable（`VCRedist` 選項在 electron-builder NSIS 設定中）

---

## BUG-3：收貨人資訊雲端反抓覆蓋原始資料

### 根因

`src/main/modules/excel-hanlders/services/recipient-info.service.ts` 第 68-94 行，`processRecipientInfo()` 在比對到雲端收貨人資料後，**無條件覆蓋**原始 Excel 的英文名稱和電話：

```typescript
if (match) {
  const updatedRow = { ...row };
  const englishName = match[RecipientInfoColumnKeys.EnglishName];
  if (englishName) {
    updatedRow[ExcelColumnKeys.RecipientEnglishName] = englishName;  // ← 覆蓋
  }
  const phone = match[RecipientInfoColumnKeys.Phone];
  if (phone) {
    updatedRow[ExcelColumnKeys.RecipientPhone] = phone;              // ← 覆蓋
  }
  // ...
}
```

用戶期望：只上傳新收貨人到雲端，不從雲端拉回覆蓋原始資料。海關註記標紅功能保留。

### 影響範圍

`processRecipientInfo()` 被以下函數呼叫：
- `processExcelDataTaipeiBay()`（`data-controller.service.ts` 第 233 行）
- `processExcelDataKaohsiungChaofeng()`（`data-controller.service.ts` 第 471 行）

### 修復方案

**修改檔案**：`src/main/modules/excel-hanlders/services/recipient-info.service.ts`

**修改位置**：第 68-94 行

**修改前**：
```typescript
if (match) {
  const updatedRow = { ...row };

  const englishName = match[RecipientInfoColumnKeys.EnglishName];
  if (englishName) {
    updatedRow[ExcelColumnKeys.RecipientEnglishName] = englishName;
  }

  const phone = match[RecipientInfoColumnKeys.Phone];
  if (phone) {
    updatedRow[ExcelColumnKeys.RecipientPhone] = phone;
  }

  // 檢查海關註記
  const customsNote = match[RecipientInfoColumnKeys.CustomsNote];
  if (customsNote && customsNote.trim() !== '') {
    // ... 標紅邏輯
  }

  return updatedRow;
}
```

**修改後**：
```typescript
if (match) {
  // 不覆蓋原始資料的英文名稱和電話，只保留海關註記檢查
  const customsNote = match[RecipientInfoColumnKeys.CustomsNote];
  if (customsNote && customsNote.trim() !== '') {
    const styles = rowStyles.get(index) || [];
    styles.push({
      backgroundColor: STYLE_COLORS.RED,
      priority: STYLE_PRIORITY.CUSTOMS_NOTE,
      columnIndex: 26,
    });
    rowStyles.set(index, styles);
  }

  return row;  // ← 回傳原始 row，不做覆蓋
}
```

**核心改動**：
1. 移除英文名稱覆蓋（第 72-75 行）
2. 移除電話覆蓋（第 77-80 行）
3. 保留海關註記標紅功能
4. 保留新收貨人收集上傳功能（第 97-109 行不變）

---

## CHANGE-1：蝦皮格式更名 + 處理邏輯變更

### 需求

- UI 名稱：「蝦皮格式」→「蝦皮2轉」
- 處理邏輯：改為台北港格式，但不套用 40kg/2000 規則

### 修改內容

#### 1. UI 更名

**檔案**：`src/renderer/pages/home/index.tsx`（第 510 行）

```diff
  <ExportCard
-   title="蝦皮格式"
+   title="蝦皮2轉"
    description="Shopee"
    icon="🛒"
    onClick={() => handleExportClick(ipcApi.excel.exportShopee)}
  />
```

#### 2. 後端處理邏輯

**檔案**：`src/main/modules/excel-hanlders/services/data-controller.service.ts`

目前台北港處理流程 `processExcelDataTaipeiBay()`（第 220-254 行）：
1. `processExcelData()` — 基礎資料處理
2. `processRecipientInfo()` — 收貨人比對
3. `checkProblemItems()` — 問題件標記
4. `applyTaipeiBaySpecialRules()` — **40kg/2000 規則**（第 268-360 行）

蝦皮2轉需要步驟 1-3，但**不需要步驟 4**。

**方案**：為蝦皮匯出的 IPC handler 改為呼叫台北港處理流程，但傳入一個選項參數來跳過 40kg 規則。

方式 A — 在 `processExcelDataTaipeiBay()` 加入選項參數：
```typescript
interface TaipeiBayOptions {
  disableWeightRule?: boolean;  // 不套用 40kg/2000 規則
}

export async function processExcelDataTaipeiBay(
  data: SheetData[],
  options?: TaipeiBayOptions,
): Promise<ProcessResultWithStyles> {
  // ... 步驟 1-3 不變

  if (!options?.disableWeightRule) {
    // 步驟 4：40kg/2000 規則（只在未禁用時執行）
    applyTaipeiBaySpecialRules(/* ... */);
  }

  // ...
}
```

方式 B — 新增獨立函數 `processExcelDataShopee2()` 直接組合步驟 1-3，不呼叫步驟 4。

**建議使用方式 A**，較簡潔且不重複程式碼。

#### 3. IPC Handler 調整

**檔案**：`src/main/modules/excel-handlers-v2/index.ts`

在 `exportShopee` handler 中改為呼叫 `processExcelDataTaipeiBay(data, { disableWeightRule: true })`。

---

## CHANGE-2：沛寶速派格式更名

### 修改內容

**檔案**：`src/renderer/pages/home/index.tsx`（第 516 行）

```diff
  <ExportCard
-   title="沛寶.速派格式"
+   title="沛寶速派蝦皮格式"
    description="ShopeeNew"
    icon="🛍️"
    badge="NEW"
    badgeType="success"
    onClick={() => handleExportClick(ipcApi.excel.exportShopeeNew)}
  />
```

僅 UI 文字變更，處理邏輯不變。

---

## CHANGE-3：收貨人資訊新增艙提單號欄位

### 修改內容

#### 1. 型別定義

**檔案**：`src/main/utils/google-sheets.tool/index.interface.ts`（第 38-55 行）

```diff
  export enum RecipientInfoColumnKeys {
+   /** 艙提單號 */
+   ManifestNumber = '艙提單號',
    /** 收貨人統一編號 */
    TaxNumber = '收貨人統一編號',
    /** 收貨人英文名稱 */
    EnglishName = '收貨人英文名稱',
    /** 收貨人電話 */
    Phone = '收貨人電話',
    /** 海關註記 */
    CustomsNote = '海關註記',
  }

  export interface RecipientInfoSheet {
+   [RecipientInfoColumnKeys.ManifestNumber]: string;
    [RecipientInfoColumnKeys.TaxNumber]: string;
    [RecipientInfoColumnKeys.EnglishName]: string;
    [RecipientInfoColumnKeys.Phone]: string;
    [RecipientInfoColumnKeys.CustomsNote]: string;
  }
```

#### 2. 上傳邏輯

**檔案**：`src/main/modules/excel-hanlders/services/recipient-info.service.ts`（第 97-109 行）

收集新收貨人時加入 `ShippingOrderNumber`（即原始 Excel A 欄的分提單號）：

```diff
  newRecipients.push({
+   [RecipientInfoColumnKeys.ManifestNumber]:
+     row[ExcelColumnKeys.ShippingOrderNumber] || '',
    [RecipientInfoColumnKeys.TaxNumber]: taxNumber,
    [RecipientInfoColumnKeys.EnglishName]:
      row[ExcelColumnKeys.RecipientEnglishName] || '',
    [RecipientInfoColumnKeys.Phone]:
      row[ExcelColumnKeys.RecipientPhone] || '',
    [RecipientInfoColumnKeys.CustomsNote]: '',
  });
```

#### 3. Google Sheets 工作表

需在 Google Sheets「收貨人資訊」工作表的第一行標題列新增「艙提單號」欄位（放在最前面，對應 A 欄）。

---

## 修改範圍總覽

| 檔案 | BUG-1 | BUG-2 | BUG-3 | CH-1 | CH-2 | CH-3 |
|------|:-----:|:-----:|:-----:|:----:|:----:|:----:|
| `manifest-number-handlers-v2/index.ts` | ✏️ | | | | | |
| `model-run/index.ts` | | ✏️ | | | | |
| `recipient-info.service.ts` | | | ✏️ | | | ✏️ |
| `google-sheets.tool/index.interface.ts` | | | | | | ✏️ |
| `data-controller.service.ts` | | | | ✏️ | | |
| `excel-handlers-v2/index.ts` | | | | ✏️ | | |
| `pages/home/index.tsx` | | | | ✏️ | ✏️ | |
| `__tests__/manifest-number-generator.test.ts` | ✏️ | | | | | |

### 施工順序建議

```
1. BUG-1  艙單編號跨組切換    （核心邏輯，影響業務）
2. BUG-3  收貨人不覆蓋        （邏輯簡單，搭配 CHANGE-3 一起改）
3. CHANGE-3  新增艙提單號欄位  （與 BUG-3 同一檔案）
4. CHANGE-1  蝦皮2轉邏輯變更   （涉及多檔案）
5. CHANGE-2  沛寶速派更名       （純 UI）
6. BUG-2  DLL 延遲載入         （獨立模組，可平行處理）
```
