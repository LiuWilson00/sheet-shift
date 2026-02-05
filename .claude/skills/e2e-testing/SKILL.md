---
name: e2e-testing
description: E2E 測試助手。用於測試 IPC 介面、Excel 轉換功能、以及驗證輸出規格。當用戶需要測試功能、驗證轉換結果、或執行回歸測試時使用。
argument-hint: "[ipc|excel|spec|all]"
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob
---

# /e2e - E2E 測試助手

執行端對端測試，驗證 IPC 介面和 Excel 轉換功能。

## 使用方式

```
/e2e              # 執行所有測試
/e2e ipc          # 測試 IPC 介面
/e2e excel        # 測試 Excel 轉換
/e2e spec         # 驗證輸出規格
/e2e <file>       # 使用特定檔案測試
```

## 測試資料位置

```
test-data/
├── 蝦皮原始-2.xlsx    # Shopee 格式測試資料
└── 資料測試.xlsx      # 通用測試資料
```

## 執行流程

### 1. IPC 測試 (`/e2e ipc`)

測試所有 V2 IPC Handler 是否正常運作。

**測試項目**：

| IPC 契約 | 測試方法 |
|----------|----------|
| `settingsV2.get` | 呼叫並驗證返回結構 |
| `settingsV2.getSheetNames` | 驗證返回字串陣列 |
| `app.init` | 驗證 Google Sheets 連線 |
| `app.isInitialized` | 驗證返回布林值 |
| `excel.getProductMap` | 驗證產品對應表結構 |

**執行方式**：
```bash
npm test -- --testPathPattern="ipc-handlers"
```

### 2. Excel 轉換測試 (`/e2e excel`)

測試 Excel 檔案處理邏輯。

**測試項目**：

| 函數 | 測試內容 |
|------|----------|
| `dataPreDebuggingProcess` | 資料預處理、填充空值 |
| `deleteNullProductNameData` | 過濾空產品名稱 |
| `groupExcelData` | 資料分組邏輯 |
| `summarizeAndUpdateGroupedData` | 加總計算 |
| `mappingRealProductName` | 品名對應 |
| `processRecipientDetails` | 收件人處理 |

**執行方式**：
```bash
npm test -- --testPathPattern="data-process"
```

### 3. 規格驗證測試 (`/e2e spec`)

驗證輸出檔案是否符合規格要求。

**驗證項目**：

| 規格 | 驗證方法 |
|------|----------|
| 欄位完整性 | 檢查所有必要欄位存在 |
| 資料型別 | 驗證數字/字串型別正確 |
| 計算正確性 | 驗證加總、均攤計算 |
| 格式正確性 | 驗證日期、電話格式 |

## 測試類型

### 單元測試

測試單一函數的輸入/輸出。

**位置**: `src/main/modules/excel-hanlders/services/__tests__/`

**執行**:
```bash
npm test -- --testPathPattern="__tests__"
```

### 整合測試

測試完整的 Excel 處理流程。

**測試流程**:
```
讀取測試檔案 → 執行處理函數 → 驗證輸出資料 → 比對預期結果
```

### 手動驗證測試

某些規格需要手動驗證，使用以下清單：

```markdown
## 手動驗證清單

### 台北港格式
- [ ] 毛重 ≥ 40kg 且件數 = 1 的列有黃色背景
- [ ] 金額在 2000-2100 範圍內
- [ ] 海關註記的列有紅色背景

### 高雄超峰格式
- [ ] 毛重正確均攤到各項目
- [ ] 地址正確帶入
- [ ] 收貨人資訊正確帶入

### 蝦皮格式
- [ ] 電話格式正確 (去除 +886)
- [ ] 地址括號內容已移除
- [ ] 身份識別碼正確判斷
```

## 測試輸出

測試結果會輸出到：

```
test-output/
├── test-report.json      # 測試報告
├── coverage/             # 覆蓋率報告
└── snapshots/            # 快照測試結果
```

## 新增測試案例

### 步驟 1: 建立測試檔案

```typescript
// src/main/modules/excel-hanlders/services/__tests__/new-test.test.ts

import { functionToTest } from '../data-process.service';

describe('functionToTest', () => {
  it('should handle normal case', () => {
    const input = { /* 測試輸入 */ };
    const expected = { /* 預期輸出 */ };

    const result = functionToTest(input);

    expect(result).toEqual(expected);
  });

  it('should handle edge case', () => {
    // 邊界情況測試
  });
});
```

### 步驟 2: 新增測試資料

將測試用的 Excel 檔案放到 `test-data/` 目錄。

### 步驟 3: 執行測試

```bash
npm test -- --testPathPattern="new-test"
```

## Mock 策略

### Google Sheets API

```typescript
jest.mock('../../../utils/google-sheets.tool', () => ({
  getProductNameMap: jest.fn(() => [
    { '原始品名': 'test', '正確品名': 'correct', '稅則': 'code' }
  ]),
  getSystemSetting: jest.fn(() => ({
    SYSTEM_SETTING: {
      NET_WEIGHT_INTERVAL: 0.01,
      KPC_NUMBER: 1000,
      UNIT_TRANSLATE_LIMIT: 12,
    },
  })),
}));
```

### Electron Dialog

```typescript
jest.mock('electron', () => ({
  dialog: {
    showOpenDialog: jest.fn().mockResolvedValue({
      canceled: false,
      filePaths: ['test-data/資料測試.xlsx'],
    }),
  },
}));
```

## 常見問題

### Q: 測試時 Google Sheets 連線失敗

**A**: 使用 mock 替代實際 API 呼叫：
```typescript
jest.mock('../../../utils/google-sheets.tool');
```

### Q: 如何測試特定的匯出格式

**A**: 直接呼叫對應的處理函數：
```typescript
import { processExcelDataShopee } from '../data-controller.service';

const result = await processExcelDataShopee('test-data/蝦皮原始-2.xlsx');
```

### Q: 如何驗證輸出檔案的格式

**A**: 使用 ExcelJS 讀取輸出檔案並驗證：
```typescript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile('output.xlsx');
const worksheet = workbook.getWorksheet(1);
// 驗證儲存格內容和格式
```

## 相關文件

- 測試規範: `docs/new-feature-1207/E2E_TEST_SPEC.md`
- IPC 契約: `src/shared/ipc-contracts.ts`
- 資料處理: `src/main/modules/excel-hanlders/services/`
