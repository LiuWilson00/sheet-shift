# 客戶 QA 回報（第二輪）- 開發規格

> 來源文件：`docs/new-feature-1207/client-qa-20260209/QA.md`
> 轉換日期：2026-02-09
> 狀態：待確認
> 前置：本輪 QA 與上一輪（`client-qa-20260201`）修改有關聯

---

## QA2-001：高雄超峰 - 匯出檔案損壞 + 艙單編號欄位錯位

### 問題描述

高雄超峰格式匯出後的檔案存在兩個問題：
1. **檔案損壞**：用 Excel 開啟時彈出「我們發現部分內容有問題」的修復提示
2. **交易代碼欄位錯位**：交易代碼應寫入 AG 欄位，但出現在 AC 欄位

### 截圖分析

**截圖 1（檔案損壞提示）**：
- 檔案名稱：`亂超峰326-manifest-1770452530809.xlsx`
- Microsoft Excel 提示：「我們發現部分內容有問題。您要我們盡可能嘗試復原嗎？」
- 此為 ExcelJS 產出的檔案格式有問題

**截圖 2（欄位錯位）**：
- 可見列：X, Y, Z, AA, AB, AC, AD, AE
- AA 欄（艙單號碼）：第一行有值，後續行為空（此為正確行為 - 每組第一行放艙單編號）
- AC 欄（標記）：第一行顯示 "A001"（交易代碼），後續行顯示 "N/M"（標記值）
- 紅圈標註 AA 和 AC 的異常

### Excel 範例檔分析

用戶提供了兩個 Excel 檔案，以下為 Node.js 分析結果：

**模板欄位映射差異（關鍵發現）**：

| 欄位 | Shopee 模板位置 | Default 模板位置 | 用戶檔案實際位置 |
|------|---------------|----------------|----------------|
| 單價 | Col 15 (O) | Col 15 (O) | Col 14 (N) |
| 總金額加總 | Col 18 (R) | Col 17 (Q) | Col 15 (O) |
| 收貨人英文名稱 | Col 27 (AA) | Col 26 (Z) | Col 24 (X) |
| 艙單號碼 | Col 30 (AD) | Col 29 (AC) | Col 27 (AA) |
| 標記 | Col 32 (AF) | Col 31 (AE) | Col 29 (AC) |
| 交易代碼目標 | - | - | AG (Col 33) |

**轉換後檔案（亂超峰326-轉完.xlsx）分析**：
```
Row 4: Col 27(AA)=AA01(艙單號), Col 29(AC)=N/M(標記), Col 33(AG)=A001(交易代碼)
Row 5: Col 29(AC)=N/M, Col 33(AG)=A001
Row 9: Col 27(AA)=AA02(艙單號), Col 29(AC)=N/M, Col 33(AG)=A001
```

- ExcelJS 層面：交易代碼確實寫在 Col 33 (AG)
- 但用戶原始檔案的模板只定義到 Col 32 (AF)
- Col 33 (AG) 無表頭定義 → 寫入超出模板範圍的欄位導致損壞

### 根因分析

1. **檔案損壞**：`TRANSACTION_CODE_COLUMN_INDEX = 33` 寫入的位置超出用戶模板的定義範圍（用戶模板只有 32 欄）。`copyTemplateWorksheetToNewExcelByWorkSheet()` 使用 `Object.assign(newCell, cell)` 複製 cell，超出範圍的欄位可能導致格式異常
2. **欄位錯位**：Excel 修復損壞檔案時，可能將超出範圍的資料移位，導致交易代碼出現在 AC 而非 AG

### 用戶期望行為

根據用戶補充說明：
- **AA 欄位（艙單號碼）**：每一組的第一格放入艙單編號
- **AG 欄位（交易代碼）**：同一組所有行放入相同的編號

### 技術規格

**影響檔案**：
- `src/main/modules/excel-hanlders/index.const.ts` - `TRANSACTION_CODE_COLUMN_INDEX`
- `src/main/modules/excel-hanlders/services/excel-io.service.ts` - `addJsonToExcelTemplate()`

**修改方案**：

方案 A（推薦）：動態搜尋欄位位置
```typescript
// 在 addJsonToExcelTemplate() 中，根據表頭動態找到交易代碼的目標欄位
// 搜尋 row 2 或 row 3 的表頭名稱 "申報繳納稅款註記"
function findTransactionCodeColumn(worksheet: Worksheet): number {
  const headerRow = worksheet.getRow(3);
  let targetCol = TRANSACTION_CODE_COLUMN_INDEX; // 預設值

  headerRow.eachCell((cell, colNumber) => {
    const value = cell.value?.toString().trim();
    if (value === '申報繳納稅款註記') {
      targetCol = colNumber;
    }
  });

  return targetCol;
}
```

方案 B：根據 columnOrder 動態計算
```typescript
// 使用 columnOrder 的最大 columnIndex + 偏移量
const maxColumnIndex = Math.max(...columnOrder.map(c => c.columnIndex));
const transactionCodeColumn = maxColumnIndex + 1;
```

**驗收條件**：
- [ ] 匯出的 Excel 檔案不會出現損壞提示
- [ ] 交易代碼寫入正確的 AG 欄位（或模板中「申報繳納稅款註記」欄位）
- [ ] 艙單編號在 AA 欄位每組第一行正確顯示
- [ ] 所有格式（台北港、高雄超峰、蝦皮等）的交易代碼位置都正確

---

## QA2-002：高雄超峰 - 毛重不應向下均攤

### 問題描述

上一輪 QA-001 修正了淨重計算（淨重 = 毛重 - 0.01），淨重現在正確了，但用戶回報**毛重不能向下均攤**。

### 與上輪 QA 的關聯

- **上輪 QA-001**：修正淨重 = 毛重 - 0.01 ✅
- **本輪問題**：`distributeGrossWeight()` 函式將毛重均攤到同一訂單的所有項目，用戶不需要此行為

### 用戶期望行為

- 毛重保持原始值（只在訂單第一行有值，後續行為空）
- 淨重 = 毛重 - 0.01（只對有毛重值的行計算）

### Excel 範例驗證

從原始檔案分析：
```
Row 4 [FL608091744]: Net=10.24, Gross=26.4   ← 第一行有毛重
Row 5 []:            Net=2.65,  Gross=空      ← 子項無毛重
Row 6 []:            Net=3.03,  Gross=空      ← 子項無毛重
Row 7 []:            Net=3.09,  Gross=空      ← 子項無毛重
Row 8 []:            Net=7.34,  Gross=空      ← 子項無毛重
Row 9 [FL608091745]: Net=3.31,  Gross=15.5    ← 新訂單第一行有毛重
```

用戶期望：毛重維持此模式不變，不要均攤。

### 技術規格

**影響檔案**：
- `src/main/modules/excel-hanlders/services/data-controller.service.ts` - `processExcelDataKaohsiungChaofeng()`

**修改邏輯**：
```typescript
// 移除毛重均攤步驟
// 原本：
// const dataWithDistributedWeight = distributeGrossWeight(dataWithAddress);

// 改為：直接使用 dataWithAddress（不做均攤）
const dataWithDistributedWeight = dataWithAddress;

// 淨重計算只對有毛重值的行生效
const dataWithNetWeight = dataWithDistributedWeight.map((row) => {
  const grossWeight = Number(row[ExcelColumnKeys.GrossWeight]) || 0;
  if (grossWeight === 0) return row; // 無毛重值的行不處理
  return {
    ...row,
    [ExcelColumnKeys.NetWeight]: Math.max(0, +(grossWeight - 0.01).toFixed(2)),
  };
});
```

**驗收條件**：
- [ ] 毛重保持原始值（不均攤）
- [ ] 只有訂單第一行有毛重值
- [ ] 淨重 = 毛重 - 0.01（只對有毛重值的行計算）
- [ ] 無毛重的子項行，淨重也維持原始值不修改

---

## QA2-003：台北港格式 - 總金額加總未正確均攤回單價（多項目訂單）

### 問題描述

上一輪 QA-003 實作了「總金額加總平分回單價」邏輯，但計算方式有誤：
- 目前：每個項目各自計算 `單價 = 總金額加總 / 該項目數量`
- 正確：總金額加總應按所有項目的**總數量**均攤

### 與上輪 QA 的關聯

- **上輪 QA-003**：實作了 `applyTaipeiBaySpecialRules()` 中金額平分回單價的邏輯
- **本輪問題**：均攤邏輯錯誤 - 每個項目都用自己的數量去除總金額加總，而非用訂單總數量

### 截圖分析

截圖顯示一個台北港格式的訂單（FL608086 組）：

| 行 | 貨物名稱 | 數量 | 單價 | 總金額 | 總金額加總 |
|---|---------|------|------|--------|-----------|
| 項目1 | 毒品 | 25 PCE | **82**（紅圈） | **2050**（紅圈） | **2035**（紅圈） |
| 項目2 | 汽車配件 | 2 PCE | | **1018**（紅圈） | **2036**（紅圈） |

**目前的錯誤計算**：
```
項目1: 單價 = ceil(2035 / 25) = 82,  總金額 = 82 × 25 = 2050  ← 已超過加總值
項目2: 單價 = ceil(2035 / 2) = 1018, 總金額 = 1018 × 2 = 2036 ← 也超過加總值
```
每個項目的總金額都接近或超過 processedAmount，導致訂單真正的「總金額」遠超 2035。

**正確的計算**：
```
訂單總數量 = 25 + 2 = 27
統一單價 = ceil(2035 / 27) = 76
項目1: 總金額 = 76 × 25 = 1900
項目2: 總金額 = 76 × 2 = 152
訂單合計 = 1900 + 152 = 2052 ≈ 2035
```

### 技術規格

**影響檔案**：
- `src/main/modules/excel-hanlders/services/data-controller.service.ts` - `applyTaipeiBaySpecialRules()`

**修改邏輯**：
```typescript
// 處理前一個特殊訂單：平分金額回單價
if ((isNewOrder || isEnd) && currentOrderIsSpecial && currentOrderStartIndex >= 0) {
  // 計算訂單內所有項目的總數量
  let totalQuantity = 0;
  for (let j = currentOrderStartIndex; j < i; j++) {
    totalQuantity += Number(data[j][ExcelColumnKeys.Quantity]) || 1;
  }

  // 統一單價 = 總金額加總 / 訂單總數量
  const newUnitPrice = Math.ceil(currentProcessedAmount / totalQuantity);

  // 更新所有項目
  for (let j = currentOrderStartIndex; j < i; j++) {
    const quantity = Number(data[j][ExcelColumnKeys.Quantity]) || 1;
    data[j] = {
      ...data[j],
      [ExcelColumnKeys.UnitPrice]: newUnitPrice,
      [ExcelColumnKeys.TotalAmount]: newUnitPrice * quantity,
    };
  }
}
```

**驗收條件**：
- [ ] 同一訂單所有項目使用相同的單價
- [ ] 單價 = ceil(總金額加總 / 訂單內所有項目數量之和)
- [ ] 各項目總金額 = 統一單價 × 該項目數量
- [ ] 訂單所有項目的總金額合計應接近「總金額加總」值

---

## 優先順序建議

| 優先級 | 項目 | 難度 | 與上輪關聯 |
|-------|------|------|-----------|
| 🔴 P0 | QA2-001 檔案損壞+欄位錯位 | 較複雜 | 新問題 |
| 🔴 P0 | QA2-002 毛重不應均攤 | 簡單 | 上輪 QA-001 衍生 |
| 🟡 P1 | QA2-003 金額均攤邏輯修正 | 中等 | 上輪 QA-003 修正 |

---

## 上輪 QA 修正結果追蹤

| 上輪項目 | 本輪反饋 | 狀態 |
|---------|---------|------|
| QA-001 淨重 = 毛重 - 0.01 | 淨重正確，但毛重不能均攤 → QA2-002 | ⚠️ 需修正 |
| QA-002 R 欄位 | 無反饋 | ✅ |
| QA-003 台北港金額平分 | 多項目時計算邏輯錯誤 → QA2-003 | ⚠️ 需修正 |
| QA-004 UI 按鈕改名 | 無反饋 | ✅ |
| QA-005 天馬地址 | 無反饋 | ✅ |
| QA-006 欄位標紅 | 無反饋 | ✅ |
| QA-007 獨立分艙按鈕 | 檔案損壞 → QA2-001 | ⚠️ 需修正 |
