# QA-20260210 修正規格書

## 總覽

| # | 問題 | 類型 | 嚴重度 | 修改檔案 |
|---|------|------|--------|----------|
| 1 | 台北港格式 - 總金額回攤不正確 | Bug | 高 | `data-controller.service.ts` |
| 2 | 問題件沒有被標紅 | Bug | 高 | `problem-items.service.ts` |
| 3 | 高雄超峰 - 淨重沒有均攤 | Bug | 高 | `data-controller.service.ts` |
| 4 | 艙單編號 - 匯出檔案 XML 錯誤 | Bug | 中 | `excel-handlers-v2/index.ts` |
| 5 | 艙單編號 - 忽略編號 0 checkbox | 新功能 | 低 | `manifest-number-handlers-v2/index.ts`, `ManifestApplyDialog.tsx`, `manifest-number.types.ts` |

---

## 1. 台北港格式 - 總金額回攤不正確

### 現象

特殊訂單（毛重 ≥ 40 且 總件數 = 1）的金額回攤後，各品項 TotalAmount 加總 ≠ ProcessedAmount。

截圖顯示：用戶選取 2 個品項加總為 2080，但 ProcessedAmount 可能不等於此值。

### 根因分析

**位置**：`data-controller.service.ts:294-306` (`applyTaipeiBaySpecialRules`)

```typescript
// 目前的做法：統一單價 = ceil(金額 / 總數量)
const newUnitPrice = Math.ceil(currentProcessedAmount / totalQuantity);
for (let j = currentOrderStartIndex; j < i; j++) {
  const quantity = Number(data[j][ExcelColumnKeys.Quantity]) || 1;
  data[j][ExcelColumnKeys.UnitPrice] = newUnitPrice;
  data[j][ExcelColumnKeys.TotalAmount] = newUnitPrice * quantity;  // ❌
}
```

**問題**：`Math.ceil()` 無條件進位導致各品項 `UnitPrice × Quantity` 加總 > `ProcessedAmount`。

**範例**：
- ProcessedAmount = 2051, 3 個品項 qty = [3, 2, 5], totalQty = 10
- newUnitPrice = ceil(2051/10) = **206**
- TotalAmount = [618, 412, 1030] → 加總 = **2060** ≠ 2051

**正確做法參考**：`summarizeAndUpdateGroupedData` (data-process.service.ts:550-563) 在預設格式中是**先算各品項 TotalAmount，再將加總寫回 ProcessedAmount**，保證一致。

### 修正方案

使用**餘數分配法**確保加總精確等於目標金額：

```typescript
// 1. 計算基礎單價（無條件捨去）
const baseUnitPrice = Math.floor(currentProcessedAmount / totalQuantity);
// 2. 計算餘數
const remainder = currentProcessedAmount - baseUnitPrice * totalQuantity;
// 3. 前 remainder 個數量單位的單價 +1，確保加總精確
let distributed = 0;
for (let j = currentOrderStartIndex; j < i; j++) {
  const quantity = Number(data[j][ExcelColumnKeys.Quantity]) || 1;
  let itemTotal = 0;
  for (let q = 0; q < quantity; q++) {
    itemTotal += distributed < remainder ? baseUnitPrice + 1 : baseUnitPrice;
    distributed++;
  }
  data[j][ExcelColumnKeys.UnitPrice] = Math.ceil(itemTotal / quantity);
  data[j][ExcelColumnKeys.TotalAmount] = itemTotal;
}
```

**驗證**：所有品項 TotalAmount 加總必定 = `currentProcessedAmount`。

### 修改檔案

| 檔案 | 函式 | 行數 |
|------|------|------|
| `src/main/modules/excel-hanlders/services/data-controller.service.ts` | `applyTaipeiBaySpecialRules` | ~288-307 |

---

## 2. 問題件沒有被標紅

### 現象

匯出的 Excel 檔案中，問題件清單上的貨物名稱沒有被標記紅色背景。

問題件清單：電子煙、仿冒品、毒品、槍械零件、管制藥品

### 根因分析

**位置**：`problem-items.service.ts:44`

```typescript
// 目前使用完全匹配（exact match）
if (problemItemNames.has(productName)) {  // ❌ exact match
```

**問題**：Excel 中的貨物名稱可能是「電子煙彈」「電子煙油」「仿冒品牌包」等，包含問題件關鍵字但不完全相等。`Set.has()` 只做精確比對，不會匹配子字串。

**範例**：
- 問題件清單：`"電子煙"`
- Excel 貨物名稱：`"電子煙彈"` → `has("電子煙彈")` = **false** ❌
- 期望行為：`"電子煙彈"` 包含 `"電子煙"` → 應標紅 ✅

### 修正方案

改為**子字串匹配**（contains）：如果貨物名稱包含任一問題件關鍵字，即標紅。

```typescript
// 改用 includes 子字串匹配
const isMatch = [...problemItemNames].some(
  (keyword) => productName.includes(keyword),
);
if (isMatch) {
  // 標記紅色
}
```

### 修改檔案

| 檔案 | 函式 | 行數 |
|------|------|------|
| `src/main/modules/excel-hanlders/services/problem-items.service.ts` | `checkProblemItems` | ~40-53 |

---

## 3. 高雄超峰 - 淨重沒有均攤

### 現象

用戶描述：淨重沒有攤，然後要 -0.01。

期望行為：將群組的總毛重均分到每個品項，然後每品項 -0.01。

範例：2 品項，群組總毛重 0.39 → 0.39/2 = 0.195 → 每品項淨重 = 0.195 - 0.01 = 0.185

### 根因分析

**位置**：`data-controller.service.ts:419-431`

```typescript
// 目前：對每行個別計算 NetWeight = GrossWeight - 0.01
const dataWithNetWeight = dataWithAddress.map((row) => {
  const grossWeight = Number(row[ExcelColumnKeys.GrossWeight]) || 0;
  if (grossWeight === 0) return row;
  return {
    ...row,
    [ExcelColumnKeys.NetWeight]: Math.max(0, +(grossWeight - 0.01).toFixed(2)),
  };
});
```

**問題**：
1. 此處的資料已經過 `groupExcelDataShopeeNew` + `summarizeAndUpdateGroupedDataShopee` 處理
2. 處理後只有**群組首行**有 GrossWeight（加總值），續行 GrossWeight 為空字串
3. 所以目前的邏輯只會在群組首行設定 NetWeight = GrossWeight - 0.01
4. 其他品項（續行）因為 GrossWeight = 0 被跳過，NetWeight 完全沒有設定

**正確做法**：需要以群組為單位均攤 GrossWeight，然後每品項 -0.01。

### 修正方案

以群組為單位均攤淨重：

```typescript
// 依群組均攤淨重
const dataWithNetWeight = [...dataWithAddress];
let groupStartIndex = -1;

for (let i = 0; i <= dataWithNetWeight.length; i++) {
  const isNewGroup = i < dataWithNetWeight.length &&
    dataWithNetWeight[i][ExcelColumnKeys.ShippingOrderNumber] !== '';
  const isEnd = i === dataWithNetWeight.length;

  // 處理前一個群組
  if ((isNewGroup || isEnd) && groupStartIndex >= 0) {
    const groupGrossWeight = Number(
      dataWithNetWeight[groupStartIndex][ExcelColumnKeys.GrossWeight]
    ) || 0;
    const itemCount = i - groupStartIndex;

    if (groupGrossWeight > 0 && itemCount > 0) {
      // 均攤毛重到每個品項，然後 -0.01
      const perItemWeight = groupGrossWeight / itemCount;
      for (let j = groupStartIndex; j < i; j++) {
        dataWithNetWeight[j] = {
          ...dataWithNetWeight[j],
          [ExcelColumnKeys.NetWeight]: Math.max(
            0,
            +((perItemWeight - 0.01).toFixed(3)),
          ),
        };
      }
    }
  }

  if (isNewGroup) groupStartIndex = i;
}
```

### 修改檔案

| 檔案 | 函式 | 行數 |
|------|------|------|
| `src/main/modules/excel-hanlders/services/data-controller.service.ts` | `processExcelDataKaohsiungChaofeng` | ~419-431 |

---

## 4. 艙單編號 - 匯出檔案 XML 錯誤

### 現象

用戶點擊「分艙編號」匯出的檔案，開啟時顯示：
- `我們發現 XXX 的部分內容有問題`
- 修復後：`/xl/worksheets/sheet9.xml 部分具有 XML 錯誤, HRESULT 0x8000ffff 行 2, 欄 0`

只有分艙編號按鈕有此問題，其他匯出按鈕正常。

### 根因分析

**位置**：`excel-handlers-v2/index.ts:102-224` (`applyManifestNumberToExcel`)

**關鍵差異**：

| 面向 | 其他匯出（正常） | 分艙編號（異常） |
|------|-----------------|-----------------|
| 資料來源 | APP 內建模板（簡單乾淨） | 用戶原始檔案（多 sheet、圖表等） |
| 寫入方式 | 建立新工作表 → `addWorksheet` | 讀取整個 workbook → 修改 → 寫回 |
| 其他 sheets | 不受影響 | ExcelJS 重新序列化可能損壞 XML |

**問題**：用戶檔案可能有 9+ 個工作表、圖表、嵌入物件等。ExcelJS 讀取後重新寫入時，無法完整保留所有內部 XML 結構（如 `sheet9.xml` 的 relationships），導致損壞。

**其他匯出的做法**（`excel-io.service.ts:334-366`）：
```typescript
// 只新增 sheet，不修改用戶原有的 sheets
const targetSheet = _targetWorkbook.addWorksheet(sheetName);
templateWorksheet.eachRow((...) => { /* 複製資料到新 sheet */ });
```

### 修正方案

改為**只操作第一個 worksheet 並複製到新 workbook**，而非讀寫整個用戶檔案：

```typescript
async function applyManifestNumberToExcel(...) {
  // 1. 讀取用戶檔案，只取第一個 worksheet 的資料
  const sourceWorkbook = new Workbook();
  await sourceWorkbook.xlsx.readFile(filePath);
  const sourceWorksheet = sourceWorkbook.worksheets[0];

  // 2. 建立全新的 workbook + worksheet
  const newWorkbook = new Workbook();
  const newWorksheet = newWorkbook.addWorksheet(sourceWorksheet.name);

  // 3. 複製所有資料到新 worksheet
  sourceWorksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const newRow = newWorksheet.getRow(rowNumber);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const newCell = newRow.getCell(colNumber);
      Object.assign(newCell, cell);
    });
    newRow.commit();
  });

  // 4. 在新 worksheet 上修改（艙單號碼 + 交易代碼）
  // ... 既有的修改邏輯 ...

  // 5. 寫入全新的檔案（不包含用戶檔案的其他 sheets）
  await newWorkbook.xlsx.writeFile(newFilePath);
}
```

**注意**：這會導致輸出檔案只有一個 worksheet（不含用戶原檔的其他 sheets）。但分艙編號的目的本來就是產生一個帶入編號的新檔案，不需要保留所有原始 sheets。

### 修改檔案

| 檔案 | 函式 | 行數 |
|------|------|------|
| `src/main/modules/excel-handlers-v2/index.ts` | `applyManifestNumberToExcel` | ~102-224 |

---

## 5. 艙單編號 - 忽略編號 0 checkbox（新功能）

### 需求

用戶希望能忽略所有數字部分為 0 的編號（如 00, 000, 0000），從 01, 001, 0001 開始。

在 ManifestApplyDialog 中加入 checkbox，預設打勾。

### 範例

格式 `XX##`（2 字母 + 2 數字）：
- **啟用**：AA01 → AA02 → ... → AA09 → AA11 → ... → AA19 → AA21 → ...（跳過 AA00, AA10, AA20...）
- **停用**：AA00 → AA01 → AA02 → ... → AA10 → AA11 → ...

格式 `XXX##`（3 字母 + 2 數字）：
- **啟用**：AAA01 → AAA02 → ... → AAA09 → AAA11 → ...（跳過 AAA00, AAA10, AAA20...）

### 實作方案

#### Step 1: 更新型別定義

**檔案**：`src/shared/manifest-number.types.ts`

在 `ApplyManifestNumberInput` 新增：
```typescript
export interface ApplyManifestNumberInput {
  configName: string;
  count: number;
  startFrom?: string;
  transactionCode?: string;
  skipZeroNumbers?: boolean;  // 新增
}
```

同步更新 `src/renderer/types/manifest-number.ts`。

#### Step 2: 新增跳過邏輯

**檔案**：`src/main/modules/manifest-number-handlers-v2/index.ts`

新增判斷函式：
```typescript
/** 檢查數字部分是否以 0 結尾（如 AA00, AA10, AAA00） */
export function hasNumericPartEndingWithZero(
  number: string,
  format: ManifestNumberFormat,
): boolean {
  // 解析格式，找到數字段的結尾字元
  let pos = 0;
  for (const seg of format.segments) {
    pos += seg.length;
  }
  // 檢查最後一個字元是否為 '0'
  return number.endsWith('0');
}
```

修改 `getNextValidNumber` 加入 `skipZeroNumbers` 參數。

修改 `generate` handler 傳遞 `skipZeroNumbers`。

#### Step 3: 更新前端 UI

**檔案**：`src/renderer/components/manifest-number-dialog/components/ManifestApplyDialog.tsx`

```typescript
const [skipZeroNumbers, setSkipZeroNumbers] = useState(true); // 預設打勾

// UI: 在交易代碼輸入框下方加入
<div className="apply-dialog__skip-zero">
  <label>
    <input
      type="checkbox"
      checked={skipZeroNumbers}
      onChange={(e) => setSkipZeroNumbers(e.target.checked)}
    />
    忽略編號 0（跳過 00, 10, 20...）
  </label>
</div>

// API 呼叫時傳入
const result = await ipcApi.manifestNumber.generate({
  ...existingParams,
  skipZeroNumbers,
});
```

### 修改檔案

| 檔案 | 修改 |
|------|------|
| `src/shared/manifest-number.types.ts` | `ApplyManifestNumberInput` 新增 `skipZeroNumbers` |
| `src/renderer/types/manifest-number.ts` | 同步更新型別 |
| `src/main/modules/manifest-number-handlers-v2/index.ts` | `getNextValidNumber` + `generate` handler |
| `src/renderer/components/manifest-number-dialog/components/ManifestApplyDialog.tsx` | checkbox UI + API 傳參 |

---

## 修正順序建議

1. **Issue 2（問題件）** — 改動最小，一個 `has` → `some + includes`
2. **Issue 1（總金額回攤）** — 核心邏輯修改，需要驗證數學正確性
3. **Issue 3（淨重均攤）** — 需加入群組遍歷邏輯
4. **Issue 4（XML 錯誤）** — 重構檔案寫入方式
5. **Issue 5（忽略 0）** — 新功能，涉及前後端

## 驗證方式

### Issue 1 驗證
- 匯出台北港格式 → 檢查特殊訂單（黃色標記）的 TotalAmount 加總 = ProcessedAmount

### Issue 2 驗證
- 確保問題件清單已載入（日誌檢查）
- 匯出任一格式 → 搜尋含「電子煙」等關鍵字的貨物 → 確認標紅

### Issue 3 驗證
- 匯出高雄超峰格式 → 檢查同群組品項的 NetWeight 是否均等，且 = (GrossWeight / 品項數) - 0.01

### Issue 4 驗證
- 使用多 sheet 的用戶檔案 → 點擊分艙編號 → 開啟產出檔案不應有 XML 錯誤提示

### Issue 5 驗證
- 開啟分艙編號 Dialog → 確認 checkbox 預設打勾
- 產生編號 → 確認不包含 XX00, XX10, XX20 等尾數為 0 的編號
- 取消打勾 → 確認包含尾數為 0 的編號
