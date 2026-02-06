# 客戶 QA 回報 - 開發規格

> 來源文件：`QA.md`
> 轉換日期：2026-02-06
> 狀態：待確認

---

## QA-001：高雄超峰 - 淨重/毛重值相同問題 + 淨重需減 0.01

### 問題描述
高雄超峰格式輸出時，淨重與毛重欄位顯示相同的值，用戶要求淨重需要比毛重少 0.01。

### 截圖分析
從截圖可見：
- 淨重(kg) 和毛重(kg) 欄位顯示完全相同的值（如 0.67/0.67、1.28/1.28、0.341/0.341）
- 用戶標註紅字「反了 然後淨重要-0.01」
- 「反了」可能指：目前淨重=毛重，但應該是淨重<毛重

### 技術規格

**影響檔案**：
- `src/main/modules/excel-hanlders/services/data-controller.service.ts` - `processExcelDataKaohsiungChaofeng()`

**修改邏輯**：
```typescript
// 在 distributeGrossWeight() 之後新增處理
const dataWithWeightAdjustment = dataWithDistributedWeight.map((row) => {
  const grossWeight = Number(row[ExcelColumnKeys.GrossWeight]) || 0;
  return {
    ...row,
    // 淨重 = 毛重 - 0.01
    [ExcelColumnKeys.NetWeight]: Math.max(0, +(grossWeight - 0.01).toFixed(2)),
  };
});
```

**驗收條件**：
- [ ] 淨重 = 毛重 - 0.01（保留兩位小數）
- [ ] 淨重最小值為 0（不可為負數）
- [ ] 毛重欄位保持原有的均攤邏輯

---

## QA-002：高雄超峰 - R 欄位（加總金額）顯示「總金額加總」

### 問題描述
高雄超峰格式 R 欄位（標題為「加總金額」）需要顯示訂單的總金額加總值。

### 截圖分析
從截圖可見：
- 欄位順序：...O(交易條代碼)、P(單價幣代碼)、Q(單價)、**Q(原始金額)**、**R(加總金額)** ← 紅圈標註、S(總件數)、T(件數單位)...
- R 欄標題是「加總金額」
- 用戶標註「總金額加總」
- 數據範例：
  - 第一行：原始金額=110, 加總金額=110
  - 第二行：原始金額=28, 加總金額=253.8（看起來是累加）
  - 第三行：原始金額=39, 加總金額=空

### 技術規格

**狀態**：✅ 按照現有邏輯即可（用戶確認）

**R 欄位對應**：
- Excel R 欄 = column 18
- 對應 `ExcelColumnKeys.ProcessedAmount`（加總金額）

**計算邏輯**：
同一訂單（ShippingOrderNumber 相同）的所有項目 TotalAmount 加總，寫入第一行的 ProcessedAmount

現有實作已符合需求，無需修改。

---

## QA-003：台北港格式 - 總金額加總需平分回單價

### 問題描述
台北港格式的金額處理：總金額加總後，需要「平分回單價」欄位。

### 截圖分析
從截圖可見（表頭順序）：
- ...淨重(kg)、毛重(kg)、數量、數量單位、交易條件代碼、單價幣代碼、**單價**、**總金額**、**總金額加總**、總件數(箱數)...

第 12 行數據（黃色高亮）：
- 數量：25 PCE
- 單價：17
- 總金額：425
- 總金額加總：2094（紅圈標註）
- 總件數：1

用戶標註紅字：「總金額取堆 但還未平分回單價，金額對不上」

**問題分析**：
- 目前：單價(17) × 數量(25) = 425（總金額正確）
- 但「總金額加總」是 2094（這是整個訂單所有項目的總和）
- 用戶要求：應該把 2094 平分回去更新「單價」欄位
- 例如：新單價 = 2094 / 25 = 83.76

### 技術規格

**狀態**：✅ 參考現有金額處理邏輯實作（用戶確認）

**影響檔案**：
- `src/main/modules/excel-hanlders/services/data-controller.service.ts` - `applyTaipeiBaySpecialRules()`
- `src/main/modules/excel-hanlders/services/data-process.service.ts` - 參考 `calculateOriginalAmountAndUnitPrice()`

**計算邏輯**：
參考現有的金額處理邏輯（`data-process.service.ts` L294-305）：
```typescript
// 現有邏輯：根據原始總金額和數量計算新單價
function calculateOriginalAmountAndUnitPrice(
  originalTotalAmount: number,
  quantity: number,
  setting: DefaultPriceSetting,
): number {
  const [minRate, maxRate] = setting.ADJUSTMENT_RATE;
  const rate = minRate + Math.random() * (maxRate - minRate);
  const newTotalAmount = Math.round(originalTotalAmount * rate);
  const newUnitPrice = Math.ceil(newTotalAmount / quantity);
  return newUnitPrice;
}
```

**預期修改**：
在 `applyTaipeiBaySpecialRules()` 中，對於符合特殊條件的訂單：
1. 取得訂單的「總金額加總」(ProcessedAmount)
2. 平分到訂單內每個項目的「單價」欄位
3. 同步更新「總金額」= 新單價 × 數量

---

## QA-004：UI 按鈕名稱修改

### 問題描述
「蝦皮格式 - 新版」按鈕需要改名為「沛寶.速派格式」。

### 截圖分析
用戶標註要將右上角的「蝦皮格式 新版」按鈕改為「沛寶.速派格式」。

### 技術規格

**影響檔案**：
- `src/renderer/pages/home/index.tsx`

**修改內容**：
```tsx
// 修改前
<ExportCard
  title="蝦皮格式"
  description="新版"
  icon="🛍️"
  badge="NEW"
  badgeType="success"
  onClick={() => handleExportClick(ipcApi.excel.exportShopeeNew)}
/>

// 修改後
<ExportCard
  title="沛寶.速派格式"
  description="ShopeeNew"
  icon="🛍️"
  badge="NEW"
  badgeType="success"
  onClick={() => handleExportClick(ipcApi.excel.exportShopeeNew)}
/>
```

**驗收條件**：
- [ ] 按鈕標題改為「沛寶.速派格式」
- [ ] 功能不變（仍呼叫 `exportShopeeNew`）

---

## QA-005：天馬格式 - 地址也要套用雲端地址表

### 問題描述
天馬（Pegasus）格式目前設定 `disableRandomAddress: true`，不會從 Google Sheets 地址表隨機取址。用戶要求也要套用雲端地址。

### 技術規格

**影響檔案**：
- `src/main/modules/excel-handlers-v2/index.ts` - `exportPegasus` handler

**修改內容**：
```typescript
// 修改前
const completedData = await processExcelData(currentPath, {
  disableRandomAddress: true,  // ← 關閉隨機地址
  calculateTotalAmountByBoxesDisableThreeOrMore: true,
  usePegasusSetting: true,
});

// 修改後
const completedData = await processExcelData(currentPath, {
  disableRandomAddress: false,  // ← 啟用隨機地址
  calculateTotalAmountByBoxesDisableThreeOrMore: true,
  usePegasusSetting: true,
});
```

**驗收條件**：
- [ ] 天馬格式匯出時，地址欄位會從 Google Sheets 地址表隨機選取
- [ ] 同一訂單的項目地址是否需要一致？（參見 CR-006）

---

## QA-006：欄位標紅行為修正 - 改為單一欄位標色

### 問題描述
目前問題件和收貨人海關註記會整行標紅，用戶要求改為只標記特定欄位。

### 截圖分析

**截圖 1（問題件）**：
- 第 12 行：「貨物名稱」欄位顯示「毒品」，只有這一格標綠色背景
- 第 13 行：「貨物名稱」欄位顯示「汽車配件」，只有這一格標綠色背景
- 其他欄位（分提單號、統一編號、貨品分類號列、品牌、規格、淨重等）都沒有標色

**截圖 2（海關註記）**：
- 第 10 行（底部紅色那行）：「收貨人英文名稱」欄位顯示「高鷹貿易」，標紅色
- 「收貨人電話」欄位也標紅色（022223585）
- 其他行的「收貨人英文名稱」有些標黃色

**用戶期望的行為**：
- **問題件**：只標記「貨物名稱」欄位（column 4）
- **收貨人海關註記**：只標記「收貨人英文名稱」欄位（column 26）
- 不要整行標色

### 技術規格（最小改動方案）

**設計原則**：用最小改動實現，不影響現有功能

**方案：擴展現有 RowStyleInfo 支援 cell-level 樣式**

1. **擴展型別定義**（`index.const.ts`）：
```typescript
/** 行樣式資訊 */
export interface RowStyleInfo {
  /** ARGB 顏色字串 */
  backgroundColor: string;
  /** 優先級數字，越小越高 */
  priority: number;
  /** 可選：指定只標記特定欄位（不指定則標記整行） */
  columnIndex?: number;
}
```

2. **修改 `problem-items.service.ts`**：
```typescript
// 只標記「貨物名稱」欄位 (column 4)
styles.push({
  backgroundColor: STYLE_COLORS.RED,
  priority: STYLE_PRIORITY.PROBLEM_ITEM,
  columnIndex: 4,  // 新增：只標此欄位
});
```

3. **修改 `recipient-info.service.ts`**：
```typescript
// 只標記「收貨人英文名稱」欄位 (column 26)
styles.push({
  backgroundColor: STYLE_COLORS.RED,
  priority: STYLE_PRIORITY.CUSTOMS_NOTE,
  columnIndex: 26,  // 新增：只標此欄位
});
```

4. **修改 `excel-io.service.ts` 的樣式套用邏輯**：
```typescript
// 套用樣式
const bestStyle = getBestStyle(styleCandidates);
if (bestStyle) {
  if (bestStyle.columnIndex !== undefined) {
    // Cell-level 樣式：只標記指定欄位
    const cell = worksheet.getCell(currentRow + 1, bestStyle.columnIndex);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bestStyle.backgroundColor },
    };
  } else {
    // Row-level 樣式：標記整行（現有邏輯）
    const worksheetRow = worksheet.getRow(currentRow + 1);
    rowFillColor(worksheetRow, bestStyle.backgroundColor);
  }
}
```

**注意：優先級處理**
- 當同一行有多種樣式時，需要分開處理 cell-level 和 row-level
- Cell-level 樣式（問題件、海關註記）只影響指定欄位
- Row-level 樣式（箱數、金額、台北港）影響整行
- 兩者可以共存

**欄位對應**：
| 情境 | 欄位名稱 | Column Key | Column Index |
|------|---------|------------|--------------|
| 問題件 | 貨物名稱 | `ProductName` | 4 |
| 海關註記 | 收貨人英文名稱 | `RecipientEnglishName` | 26 |

**驗收條件**：
- [ ] 問題件：只有「貨物名稱」欄位（column 4）標紅
- [ ] 海關註記：只有「收貨人英文名稱」欄位（column 26）標紅
- [ ] 其他黃色高亮邏輯（箱數、金額、台北港特殊條件）維持整行標色
- [ ] Cell-level 和 Row-level 樣式可以共存於同一行

---

## QA-007：自動分艙功能 - 需要獨立按鈕

### 問題描述
自動分艙單號功能不能在資料轉換過程中使用（勾選方式），因為：
1. 用戶的工作流程是：匯出 → 再處理 → 最後才分艙
2. 如果在轉換過程勾選，會做兩次轉換導致資料錯誤
3. 分艙功能需要的輸入格式與一開始的原始資料格式不同

### 用戶工作流程
```
原始資料 → [系統轉換] → 匯出檔案 → [用戶手動處理] → 處理後檔案 → [分艙功能] → 最終檔案
```

### 技術規格

**新增功能**：獨立的「分艙編號」按鈕

**UI 修改**：
```tsx
// src/renderer/pages/home/index.tsx
// 在匯出區塊新增獨立按鈕
<ExportCard
  title="分艙編號"
  description="僅帶入艙單號"
  icon="🔢"
  onClick={handleManifestNumberOnly}  // 新的 handler
/>
```

**艙單編號欄位**（參考 FEATURE_SPEC.md 8.7 節）：
- 交易代碼帶入 **AG 欄位**（column 33）
- 根據規格：「將帶入到 AG 欄位」

**輸入檔案格式處理**：
由於用戶手動處理後的檔案可能刪除某些欄位，導致欄位位置變動。需要**動態搜尋欄位**：
```typescript
// 根據表頭名稱動態找到欄位位置
function findColumnByHeader(worksheet: Worksheet, headerName: string): number | null {
  const headerRow = worksheet.getRow(1);  // 或 row 2，取決於 template
  let columnIndex: number | null = null;

  headerRow.eachCell((cell, colNumber) => {
    if (cell.value?.toString().includes(headerName)) {
      columnIndex = colNumber;
    }
  });

  return columnIndex;
}

// 使用方式
const manifestColumn = findColumnByHeader(worksheet, '艙單')
  || findColumnByHeader(worksheet, '分艙')
  || 33;  // 預設 AG 欄
```

**處理邏輯**：
1. 讀取用戶選擇的已處理過的 Excel 檔案
2. **不做任何資料轉換**（品名映射、地址、重量等都不處理）
3. 動態搜尋目標欄位位置
4. 帶入艙單編號到找到的欄位
5. 輸出新檔案

**新增 IPC Handler**：
```typescript
// src/shared/ipc-contracts.ts
manifestNumberOnly: createContract<
  { configName: string; count: number; transactionCode?: string },
  { path: string; isError: boolean; numbers: string[] }
>('excel-v2/manifest-number-only'),
```

**驗收條件**：
- [ ] 新增獨立的「分艙編號」按鈕
- [ ] 點擊後開啟艙單編號設定 Dialog（與現有流程相同）
- [ ] 動態搜尋目標欄位（支援欄位位置變動）
- [ ] 只執行艙單編號帶入，不做其他資料處理
- [ ] 輸出檔案保留原始資料，只新增艙單編號欄位

---

## 優先順序建議

| 優先級 | 項目 | 難度 | 狀態 |
|-------|------|------|------|
| 🔴 P0 | QA-004 UI 按鈕改名 | 簡單 | ⬜ 可直接實作 |
| 🔴 P0 | QA-005 天馬地址 | 簡單 | ⬜ 可直接實作 |
| 🟡 P1 | QA-001 高雄超峰重量 | 中等 | ⬜ 規格已明確 |
| 🟡 P1 | QA-003 台北港金額 | 中等 | ⬜ 參考現有實作 |
| 🟡 P1 | QA-006 欄位標紅 | 中等 | ⬜ 最小改動方案已設計 |
| 🟢 P2 | QA-002 R欄位 | - | ✅ 現有邏輯已符合 |
| 🟢 P2 | QA-007 獨立分艙按鈕 | 複雜 | ⬜ 需動態搜尋欄位 |

---

## 用戶已確認事項

1. ✅ **QA-002**：按照現有邏輯即可
2. ✅ **QA-003**：參考相關金額處理實作
3. ✅ **QA-006**：用最小改動方式，只改問題件和海關註記為單欄位標色
4. ✅ **QA-007**：參考 FEATURE_SPEC.md，動態搜尋欄位位置
