# QA2-002 修正計畫：分艙編號 - 群組行處理錯誤

## 問題描述

`applyManifestNumberToExcel` 的 row 迭代邏輯有誤，導致：

1. **交易代碼只寫入群組首行**（139 行），應該寫入**每一行**（735 行）
2. **艙單號碼只寫入第一個群組**，應該寫入**每個群組的首行**（139 行）

## 根因分析

### 用戶檔案群組結構

```
Row 4:  Col A = "FL608091744" ← 群組首行（有運單號碼）
Row 5:  Col A = null          ← 續行（同訂單的其他商品）
Row 6:  Col A = null          ← 續行
Row 7:  Col A = null          ← 續行
Row 8:  Col A = null          ← 續行
Row 9:  Col A = "FL608091745" ← 下一群組首行
Row 10: Col A = null          ← 續行
...
```

- 群組首行：Col A 有值（139 行）
- 續行：Col A 為空，但 Col B~AF 有資料（596 行）
- 總資料行：735 行

### 目前程式碼的問題

```typescript
// 目前的邏輯：Col 1 為空就 continue → 跳過所有續行
const firstCellValue = row.getCell(1).value;
if (firstCellValue === null || firstCellValue === undefined || firstCellValue === '') {
  continue;  // ❌ 跳過了 596 個續行
}
```

結果：只有 Col A 有值的 139 行被處理，596 個續行全部跳過。

### 預期行為 vs 目前行為

| 欄位 | 寫入對象 | 預期數量 | 目前數量 |
|------|---------|---------|---------|
| 艙單號碼 (Col AA/27) | 每個群組首行 | 139 | 1 |
| 交易代碼 (Col AG/33) | 每一行 | 735 | 139 |

## 修正方案

### 核心修改：改用 Col 2 判斷是否為資料行

參考 `addJsonToExcelTemplate` 的做法（對每一行都寫入交易代碼），改用 Col 2（統一編號欄）判斷是否為資料行：

- **資料行判斷**：Col 2 有值 → 是資料行（包含群組首行和續行）
- **群組首行判斷**：Col 1 有值 → 新訂單群組的第一行

```typescript
for (let rowIndex = startRow; rowIndex <= worksheet.rowCount; rowIndex++) {
  const row = worksheet.getRow(rowIndex);

  // 用 Col 2 判斷是否為資料行（Col 1 只有群組首行有值，不適合判斷）
  const col2Value = row.getCell(2).value;
  if (col2Value === null || col2Value === undefined || col2Value === '') {
    continue; // 真正的空行，跳過
  }

  // Col 1 有值 = 群組首行 → 寫入艙單號碼
  const isGroupStart = row.getCell(1).value !== null &&
                       row.getCell(1).value !== undefined &&
                       row.getCell(1).value !== '';

  if (isGroupStart && numbers?.length && manifestColumn !== null && manifestIndex < numbers.length) {
    row.getCell(manifestColumn).value = numbers[manifestIndex];
    manifestIndex++;
  }

  // 交易代碼寫入每一行
  if (transactionCode) {
    row.getCell(transactionCodeColumn).value = transactionCode;
  }

  rowCount++;
}
```

### 修改範圍

僅修改 `src/main/modules/excel-handlers-v2/index.ts` 的 `applyManifestNumberToExcel` 函式中的迭代邏輯。

## 驗證方式

1. `npm run build:main` — 編譯通過
2. Node.js 腳本驗證：
   - Col AA (27)：139 個群組首行都有艙單號碼
   - Col AG (33)：735 行都有交易代碼
   - Col AC (29)：保持原始 N/M 值不被覆寫
