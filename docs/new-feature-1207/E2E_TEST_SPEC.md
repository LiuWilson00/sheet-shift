# E2E 測試規範

**版本**: 1.0
**建立日期**: 2026-02-04

---

## 測試架構概覽

```
┌─────────────────────────────────────────────────────────────────────┐
│                          測試層級                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │   單元測試    │    │   整合測試    │    │   E2E 測試   │         │
│   │  Unit Tests  │    │ Integration  │    │  End-to-End  │         │
│   └──────────────┘    └──────────────┘    └──────────────┘         │
│          │                   │                   │                  │
│          ▼                   ▼                   ▼                  │
│   - 資料處理函數      - IPC Handler      - 完整匯出流程             │
│   - 工具函數          - 服務整合          - UI 交互                  │
│   - 純邏輯測試        - Mock 外部依賴     - 真實環境                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 一、單元測試

### 1.1 資料處理函數測試

**檔案位置**: `src/main/modules/excel-hanlders/services/__tests__/data-process.test.ts`

#### 1.1.1 dataPreDebuggingProcess

| 測試案例 | 輸入 | 預期輸出 |
|----------|------|----------|
| 正常資料 | 完整的 SheetData[] | 填充後的資料 + index |
| 空訂單號 | 部分訂單號為空 | 空值被上一個值填充 |
| 空陣列 | [] | [] |

#### 1.1.2 deleteNullProductNameData

| 測試案例 | 輸入 | 預期輸出 |
|----------|------|----------|
| 正常資料 | 含有產品名稱的資料 | 原資料不變 |
| 空產品名 | 部分產品名稱為空 | 過濾掉空產品名的列 |
| 全空 | 所有產品名稱為空 | [] |

#### 1.1.3 groupExcelData

| 測試案例 | 輸入 | 預期輸出 |
|----------|------|----------|
| 同訂單同產品 | 3筆相同訂單和產品 | 合併為1筆，數量加總 |
| 不同訂單 | 3筆不同訂單 | 保持3筆 |
| 重量計算 | 淨重 1+2+3 kg | 淨重 6 - NET_WEIGHT_INTERVAL |

#### 1.1.4 mappingRealProductName

| 測試案例 | 輸入 | 預期輸出 |
|----------|------|----------|
| 有對應 | 產品名在對應表中 | RealProductName 和 ProductClassNumber 有值 |
| 無對應 | 產品名不在對應表中 | RealProductName 和 ProductClassNumber 為空 |
| 部分對應 | 混合情況 | 對應的有值，未對應的為空 |

#### 1.1.5 summarizeAndUpdateGroupedData

| 測試案例 | 輸入 | 預期輸出 |
|----------|------|----------|
| 單件計價 | 箱數=1 | ProcessedAmount 在 OPE_PIECE 範圍 |
| 雙件計價 | 箱數=2 | ProcessedAmount 在 TWO_PIECE 範圍 |
| 多件計價 | 箱數≥3 | ProcessedAmount 在 THREE_OR_MORE_PIECES 範圍 |

#### 1.1.6 processRecipientDetails

| 測試案例 | 輸入 | 預期輸出 |
|----------|------|----------|
| 啟用隨機地址 | disableRandomAddress=false | 收件人資訊被填充 |
| 禁用隨機地址 | disableRandomAddress=true | 收件人資訊不變 |

---

### 1.2 工具函數測試

**檔案位置**: `src/main/utils/__tests__/`

#### 1.2.1 fillDownColumn

| 測試案例 | 輸入 | 預期輸出 |
|----------|------|----------|
| 正常填充 | ['A', '', '', 'B', ''] | ['A', 'A', 'A', 'B', 'B'] |
| 首個為空 | ['', 'A', ''] | ['', 'A', 'A'] |

#### 1.2.2 unitTranslate

| 測試案例 | 輸入 | 預期輸出 |
|----------|------|----------|
| 小於限制 | quantity=10, limit=12 | { newQuantity: 10, newUnit: 'PCE' } |
| 超過限制 | quantity=15, limit=12 | { newQuantity: 2, newUnit: 'DOZ' } |

#### 1.2.3 formatRecipientPhone

| 測試案例 | 輸入 | 預期輸出 |
|----------|------|----------|
| 國際格式 | '+886912345678' | '0912345678' |
| 本地格式 | '0912345678' | '0912345678' |
| 帶空格 | '0912 345 678' | '0912345678' |

---

## 二、整合測試

### 2.1 IPC Handler 測試

**檔案位置**: `src/main/modules/__tests__/ipc-handlers.test.ts`

#### 2.1.1 Excel Handlers

| Handler | 測試方法 | 預期結果 |
|---------|----------|----------|
| `excel.selectFile` | Mock dialog | 返回檔案路徑 |
| `excel.exportDefault` | 使用測試檔案 | 返回處理後的 SheetData[] |
| `excel.exportShopee` | 使用測試檔案 | 返回 Shopee 格式資料 |
| `excel.getWrongData` | 使用測試檔案 | 返回未對應資料 |
| `excel.getProductMap` | Mock Google Sheets | 返回產品對應表 |

#### 2.1.2 Settings Handlers

| Handler | 測試方法 | 預期結果 |
|---------|----------|----------|
| `settingsV2.get` | Mock 設定 | 返回 Settings 物件 |
| `settingsV2.getSheetNames` | Mock 資料 | 返回字串陣列 |

---

## 三、E2E 測試案例

### 3.1 匯出流程測試

#### 測試案例 E2E-001: 預設格式匯出

**前置條件**:
- 測試檔案: `test-data/資料測試.xlsx`
- Google Sheets 連線正常（或使用 Mock）

**執行步驟**:
1. 呼叫 `processExcelData(filePath)`
2. 驗證返回資料結構

**驗證項目**:
```typescript
// 驗證必要欄位存在
expect(result[0]).toHaveProperty('分提單號');
expect(result[0]).toHaveProperty('貨物名稱');
expect(result[0]).toHaveProperty('正確品名');
expect(result[0]).toHaveProperty('貨品分類編號');

// 驗證數字型別
expect(typeof result[0]['淨重(kg)']).toBe('number');
expect(typeof result[0]['數量']).toBe('number');

// 驗證加總計算
// (根據測試資料預期值)
```

#### 測試案例 E2E-002: Shopee 格式匯出

**前置條件**:
- 測試檔案: `test-data/蝦皮原始-2.xlsx`

**執行步驟**:
1. 呼叫 `processExcelDataShopee(filePath)`
2. 驗證返回資料結構

**驗證項目**:
```typescript
// 驗證電話格式已處理
result.forEach(row => {
  expect(row['收貨人電話']).not.toMatch(/^\+886/);
});

// 驗證地址括號已移除
result.forEach(row => {
  expect(row['收貨人英文地址']).not.toMatch(/[\(（][^）\)]*[\)）]/);
});
```

#### 測試案例 E2E-003: Shopee New 格式匯出

**前置條件**:
- 測試檔案: `test-data/蝦皮原始-2.xlsx`

**執行步驟**:
1. 呼叫 `processExcelDataShopeeNew(filePath)`
2. 驗證返回資料結構

**驗證項目**:
- 與 E2E-002 相同
- 額外驗證金額高亮邏輯（>2000）

---

### 3.2 新功能測試案例

#### 測試案例 E2E-004: 台北港格式 - 特殊條件處理

**前置條件**:
- 測試資料包含: 毛重 ≥ 40kg 且件數 = 1 的項目

**驗證項目**:
```typescript
// 找出符合條件的項目
const specialItems = result.filter(row =>
  row['毛重(kg)'] >= 40 && row['總件數(箱數)'] === 1
);

// 驗證金額在 2000-2100 範圍
specialItems.forEach(item => {
  expect(item['加總金額']).toBeGreaterThanOrEqual(2000);
  expect(item['加總金額']).toBeLessThanOrEqual(2100);
});
```

#### 測試案例 E2E-005: 高雄超峰格式 - 毛重均攤

**前置條件**:
- 測試資料包含: 同一訂單有多個項目

**驗證項目**:
```typescript
// 按訂單分組
const orderGroups = groupBy(result, '分提單號');

// 驗證毛重均攤
Object.entries(orderGroups).forEach(([orderId, items]) => {
  const totalWeight = items.reduce((sum, item) => sum + item['毛重(kg)'], 0);
  const avgWeight = totalWeight / items.length;

  items.forEach(item => {
    expect(item['毛重(kg)']).toBeCloseTo(avgWeight, 2);
  });
});
```

#### 測試案例 E2E-006: 收貨人資訊自動帶入

**前置條件**:
- Google Sheets 收貨人資訊表有資料
- 測試資料的收貨人統一編號在表中存在

**驗證項目**:
```typescript
// 驗證收貨人資訊已帶入
result.forEach(row => {
  if (row['收貨人統一編號'] === 'A123456789') {
    expect(row['收貨人英文名稱']).toBe('WANG XIAO MING');
    expect(row['收貨人電話']).toBe('0912345678');
  }
});
```

#### 測試案例 E2E-007: 問題件標記

**前置條件**:
- Google Sheets 問題件表包含 '電子煙'
- 測試資料包含貨物名稱 = '電子煙'

**驗證項目**:
```typescript
// 驗證問題件被標記
// (需要檢查輸出 Excel 的儲存格背景色)
```

#### 測試案例 E2E-008: 艙單編號產生

**前置條件**:
- 設定: 英文3位 + 數字2位 (AAA00 格式)
- 黑名單: A005-B006, A123

**驗證項目**:
```typescript
// 驗證編號格式正確
numbers.forEach(num => {
  expect(num).toMatch(/^[A-Z]{3}[0-9]{2}$/);
});

// 驗證黑名單被跳過
expect(numbers).not.toContain('A005');
expect(numbers).not.toContain('A123');
expect(numbers).not.toContain('B006');

// 驗證連續性
// (考慮黑名單跳過)
```

---

## 四、手動驗證清單

### 4.1 視覺驗證

某些功能需要開啟輸出的 Excel 檔案進行視覺驗證。

#### 台北港格式

- [ ] 毛重 ≥ 40kg 且件數 = 1 的列有黃色背景
- [ ] 海關註記的列有紅色背景（最高優先）
- [ ] 問題件的列有紅色背景（最高優先）
- [ ] 紅色背景不被黃色覆蓋

#### 蝦皮格式

- [ ] 金額 > 2000 的列有黃色背景
- [ ] 箱數 > 1 的列有黃色背景

#### 統計工作表

- [ ] 統計數據正確
- [ ] 格式整齊

### 4.2 功能驗證

#### 艙單編號設定 Dialog

- [ ] 可新增區段
- [ ] 可刪除區段
- [ ] 可上下移動區段
- [ ] 預覽正確顯示
- [ ] 總數量計算正確

#### 艙單編號帶入 Dialog

- [ ] 可選擇設定
- [ ] 起始編號驗證正確
- [ ] 交易代碼欄位可輸入
- [ ] 黑名單警告顯示正確

---

## 五、測試資料規範

### 5.1 測試資料結構

```
test-data/
├── 蝦皮原始-2.xlsx        # Shopee 格式真實資料
├── 資料測試.xlsx          # 通用測試資料
├── fixtures/              # 測試用固定資料
│   ├── basic.xlsx         # 基本測試資料
│   ├── edge-cases.xlsx    # 邊界情況
│   └── expected/          # 預期輸出
│       ├── default.json
│       └── shopee.json
└── mocks/                 # Mock 資料
    ├── product-map.json
    ├── settings.json
    └── address.json
```

### 5.2 測試資料要求

| 資料類型 | 要求 |
|----------|------|
| 基本資料 | 至少 10 筆完整資料 |
| 邊界情況 | 空值、特殊字符、極大/極小數值 |
| Shopee 格式 | 包含國際電話號碼、地址括號 |
| 特殊條件 | 毛重 ≥ 40kg、件數 = 1 |

---

## 六、測試執行

### 6.1 命令列

```bash
# 執行所有測試
npm test

# 執行特定測試
npm test -- --testPathPattern="data-process"

# 執行並生成覆蓋率報告
npm test -- --coverage

# 監視模式
npm test -- --watch
```

### 6.2 CI/CD 整合

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test -- --coverage
```

---

## 七、更新記錄

| 日期 | 版本 | 更新內容 |
|------|------|----------|
| 2026-02-04 | 1.0 | 初版建立 |
