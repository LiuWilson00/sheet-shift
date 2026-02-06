# Code Review - new-feature-1207

> 審查日期：2026-02-05
> 審查範圍：Phase 1-3 全部 9 項功能實作
> 對照規格：`FEATURE_SPEC.md`、`IMPLEMENTATION_PLAN.md`

---

## 問題分級

| 等級 | 說明 |
|------|------|
| 🔴 Critical | 會導致錯誤結果或程式崩潰，必須修復 |
| ⚠️ Important | 功能偏差或潛在風險，建議優先修復 |
| 💡 Nice to Have | 程式碼品質改善，可排入後續迭代 |

---

## 🔴 Critical

### CR-001：艙單編號 generate 會產生重複號碼

**檔案**：`src/main/modules/manifest-number-handlers-v2/index.ts` (約 L393-418)

**問題描述**：
`generate` handler 會將 `startFrom`（即 `currentNumber`）本身也納入產出結果。當第一次產生 5 個號碼後 `currentNumber` 被更新為最後一個號碼（例如 `A005`），下一次呼叫時 `A005` 又會被當作第一個號碼輸出，造成重複。

**問題程式碼**：
```typescript
const startNumber =
  input.startFrom ||
  config.currentNumber ||
  generateFirstNumber(config.format);

const numbers: string[] = [];
let current = startNumber;

// 第一個編號 — 直接 push startFrom 本身
if (!isBlacklisted(current, config.blacklist)) {
  numbers.push(current);  // ← 問題在此：應先 increment 再 push
} else {
  // ...
}
```

**預期行為**：
- 若 `currentNumber = "A005"`，下次產生 5 個應從 `A006` 開始
- `startFrom` 代表「上次用到的最後一個」，應從下一個開始

**建議修復**：
在 push 第一個號碼前先呼叫 `incrementNumber()` 或 `getNextValidNumber()`：
```typescript
// 起始編號應是 startNumber 的下一個（startNumber 是上次最後使用的）
let current = startNumber;
const first = getNextValidNumber(current, config.format, config.blacklist);
if (!first) throw new IpcError(...);
current = first.number;
allSkipped.push(...first.skipped);
numbers.push(current);
```

---

## ⚠️ Important

### ~~CR-002：ExcelJS `row.fill` 可能無法正確套用整行顏色~~ ✅ 已驗證無問題

**檔案**：`src/main/modules/excel-hanlders/services/excel-io.service.ts` (L199-212)

**驗證結果**：經實際測試（使用真實 template + 逐 cell 複製流程），`row.fill` 在當前 ExcelJS 版本中運作完全正常：
- `row.fill` 正確傳播到所有 cell（含空 cell）✅
- 能覆蓋既有 cell-level fill ✅
- 寫入/讀回後 fill 保留 ✅
- `copyTemplateWorksheetToNewExcelByWorkSheet` 逐 cell `Object.assign` 複製後 fill 保留 ✅
- `row.fill` 甚至比 `eachCell` 方式更好，因為會覆蓋到空 cell

**結論**：此問題為誤報，現有實作正確，不需修改。

---

### CR-003：`addNewRecipientsToSheet` 靜默吞掉錯誤 — ✅ 已修復

**檔案**：`src/main/modules/excel-hanlders/services/recipient-info.service.ts` (約 L151-153)

**問題描述**：
`catch` 區塊沒有任何 log 或錯誤回報，Google Sheets API 失敗時無法診斷問題。

**問題程式碼**：
```typescript
try {
  // Google Sheets 更新邏輯...
  return success;
} catch {
  return false;  // ← 完全吞掉錯誤，無 log
}
```

**建議修復**：
```typescript
} catch (error) {
  logger.error('新增收貨人至 Google Sheets 失敗', error);
  return false;
}
```

---

### CR-004：ManifestConfigDialog 切換設定時表單狀態不更新 — ✅ 已修復

**檔案**：`src/renderer/components/manifest-number-dialog/components/ManifestConfigDialog.tsx` (L25-36, L86-89)

**問題描述**：
`useState` 只在元件首次 mount 時讀取 `existingConfig` 初始值。若 Dialog 未卸載就切換到不同設定的 `existingConfig`，表單仍顯示舊的資料。

**問題程式碼**：
```typescript
const [settingName, setSettingName] = useState(
  existingConfig?.settingName || '',
);
const [segments, setSegments] = useState<FormatSegment[]>(
  existingConfig?.format.segments || DEFAULT_CONFIG.format.segments,
);
// ...

const handleClose = useCallback(() => {
  setErrors({});  // ← 只清 errors，不重置表單
  onClose();
}, [onClose]);
```

**建議修復**：
新增 `useEffect` 監聽 `existingConfig` 變化，同步更新表單狀態：
```typescript
useEffect(() => {
  setSettingName(existingConfig?.settingName || '');
  setSegments(existingConfig?.format.segments || DEFAULT_CONFIG.format.segments);
  setBlacklist(existingConfig?.blacklist || DEFAULT_CONFIG.blacklist);
  setCurrentNumber(existingConfig?.currentNumber || '');
  setErrors({});
}, [existingConfig]);
```

---

## 💡 Nice to Have

### CR-005：交易代碼寫入 AG 欄（column 33）為 magic number — ✅ 已修復

**檔案**：`src/main/modules/excel-hanlders/services/excel-io.service.ts` (L189-193)

**問題描述**：
`33` 直接硬編碼在程式中，若 Excel template 欄位調整後此處會靜默寫到錯誤欄位。

**問題程式碼**：
```typescript
if (transactionCode) {
  const agCell: Cell = worksheet.getCell(currentRow + 1, 33);
  agCell.value = transactionCode;
}
```

**建議改善**：
將 column index 定義在 `index.const.ts` 的常數中，例如：
```typescript
export const TRANSACTION_CODE_COLUMN = 33; // AG 欄
```

---

### CR-006：隨機地址以「每行」而非「每筆訂單」為單位指派

**檔案**：`src/main/modules/excel-hanlders/services/data-process.service.ts` (L616-641)

**問題描述**：
`processRecipientDetails()` 對每一行（row）各自取隨機地址。同一筆訂單（同 `ShippingOrderNumber`）的多個品項可能拿到不同地址，在實務上可能不合理。

**問題程式碼**：
```typescript
return data.map((entry) => {
  const address = disableRandomAddress
    ? entry[ExcelColumnKeys.RecipientEnglishAddress]
    : getRandomAddress(addressSheet.get());  // ← 每行獨立隨機
  // ...
});
```

`processExcelDataKaohsiungChaofeng`（data-controller.service.ts L363-372）也有同樣模式。

**建議改善**：
先以 `ShippingOrderNumber` 分組，每組共用同一個隨機地址：
```typescript
// 先建立訂單 → 地址對照表
const orderAddressMap = new Map<string, string>();
data.forEach((entry) => {
  const orderNo = entry[ExcelColumnKeys.ShippingOrderNumber] as string;
  if (!orderAddressMap.has(orderNo)) {
    orderAddressMap.set(orderNo, getRandomAddress(addressData));
  }
});
// 再 map 時使用對照表
```

---

### CR-007：`SheetRangeName` 值與 Google Sheets 工作表名稱強耦合

**檔案**：`src/main/utils/google-sheets.tool/index.const.ts` (L10-23)

**問題描述**：
`SheetRangeName` enum 的值直接對應 Google Sheets 的中文工作表名稱（如 `'收貨人資訊'`、`'問題件'`）。若工作表重新命名，需同步修改 enum 值，且沒有 runtime 驗證機制。

**現況**：此為既有設計模式，`initGoogleSheetData()` 已有過濾不存在工作表的保護，風險可控。記錄供後續考量。

---

## 功能符合度總覽

| # | 功能 | 符合規格 | 備註 |
|---|------|---------|------|
| 1 | 收貨人資訊比對（統編匹配） | ✅ | |
| 2 | 收貨人資訊自動帶入 | ✅ | |
| 3 | 海關註記 → 紅底標記 | ✅ | CR-002 已驗證無問題 |
| 4 | 問題件名稱比對（完全匹配） | ✅ | |
| 5 | 問題件 → 紅底標記 | ✅ | CR-002 已驗證無問題 |
| 6 | 台北灣處理（GrossWeight≥40 & TotalBoxes=1） | ✅ | |
| 7 | 高雄超豐處理（ShopeeNew base + 隨機地址 + 重量分配） | ✅ | 地址指派見 CR-006 |
| 8 | 艙單編號產生（格式定義 + 黑名單跳號） | ✅ | CR-001 已修復 |
| 9 | 交易代碼寫入 AG 欄 | ✅ | 見 CR-005 |

---

## 建議優先順序

1. ~~**CR-001** 🔴 — 修復艙單編號重複產生問題~~ ✅ 已修復
2. ~~**CR-002** ⚠️ — 驗證並修復整行上色邏輯~~ ✅ 已驗證無問題
3. ~~**CR-003** ⚠️ — 加入錯誤 log~~ ✅ 已修復
4. ~~**CR-004** ⚠️ — 修復 Dialog 狀態同步~~ ✅ 已修復
5. ~~**CR-005** 💡 — 抽出 magic number~~ ✅ 已修復
6. **CR-006** 💡 — 改善地址指派邏輯
7. **CR-007** 💡 — 記錄，暫不處理
