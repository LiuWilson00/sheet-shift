# 海運表單系統修改 - 功能規格書

**版本**: 1.0
**日期**: 2025-12-07
**狀態**: 待開發

---

## 目錄

1. [需求總覽](#1-需求總覽)
2. [Google Sheets 資料表需求](#2-google-sheets-資料表需求)
3. [功能一：按鈕 UI 修改](#3-功能一按鈕-ui-修改)
4. [功能二：收貨人統一編號自動帶入](#4-功能二收貨人統一編號自動帶入)
5. [功能三：問題件標記功能](#5-功能三問題件標記功能)
6. [功能四：台北港格式按鈕](#6-功能四台北港格式按鈕)
7. [功能五：高雄超峰按鈕](#7-功能五高雄超峰按鈕)
8. [功能六：自動分艙單號功能](#8-功能六自動分艙單號功能)
9. [實作計畫](#9-實作計畫)
10. [技術細節](#10-技術細節)

---

## 1. 需求總覽

### 1.1 功能清單

| # | 功能名稱 | 優先級 | 複雜度 | 預估影響範圍 |
|---|---------|--------|--------|-------------|
| 1 | 按鈕 UI 修改 | 高 | 低 | 前端 |
| 2 | 收貨人統一編號自動帶入 | 高 | 中 | 前端 + 後端 + Google Sheets |
| 3 | 問題件標記功能 | 中 | 低 | 前端 + 後端 + Google Sheets |
| 4 | 台北港格式按鈕 | 高 | 中 | 前端 + 後端 |
| 5 | 高雄超峰按鈕 | 高 | 高 | 前端 + 後端 |
| 6 | 自動分艙單號功能 | 高 | 高 | 前端 + 後端 + Google Sheets |

### 1.2 背景顏色優先級規則

```
紅色（最高優先）: 海關註記 / 問題件
黃色（中優先）: 台北港特殊條件（毛重≥40kg & 總件數=1）
其他背景色: 一般標記
```

---

## 2. Google Sheets 資料表需求

### 2.1 需要新增的資料表

#### 2.1.1 收貨人資訊表 `收貨人資訊`

| 欄位名稱 | 資料類型 | 必填 | 說明 |
|---------|---------|------|------|
| 收貨人統一編號 | string | 是 | 主鍵，用於匹配 |
| 收貨人英文名稱 | string | 否 | 收貨人名稱 |
| 收貨人電話 | string | 否 | 收貨人聯絡電話 |
| 海關註記 | string | 否 | 有值表示有註記，匯出時標紅 |

**範例資料**:
```
| 收貨人統一編號 | 收貨人英文名稱 | 收貨人電話 | 海關註記 |
|--------------|---------------|-----------|---------|
| A123456789   | WANG XIAO MING| 0912345678| 注意     |
| B987654321   | LIN MEI LI    | 0923456789|         |
```

#### 2.1.2 問題件表 `問題件`

| 欄位名稱 | 資料類型 | 必填 | 說明 |
|---------|---------|------|------|
| 貨物名稱 | string | 是 | 需完全匹配的貨物名稱 |

**範例資料**:
```
| 貨物名稱 |
|---------|
| 電子煙   |
| 仿冒品   |
```

#### 2.1.3 艙單編號設定表 `艙單編號設定`

| 欄位名稱 | 資料類型 | 必填 | 說明 |
|---------|---------|------|------|
| 設定名稱 | string | 是 | 設定的唯一識別名稱 |
| 格式定義 | string | 是 | JSON 格式的編號規則 |
| 黑名單規則 | string | 否 | JSON 格式的排除規則 |
| 當前編號 | string | 否 | 上次使用的最後編號 |
| 建立時間 | string | 否 | 建立時間戳記 |
| 更新時間 | string | 否 | 最後更新時間戳記 |

**格式定義 JSON 結構**:
```json
{
  "segments": [
    { "type": "alpha", "length": 3 },
    { "type": "numeric", "length": 2 }
  ]
}
```

**黑名單規則 JSON 結構**:
```json
{
  "ranges": [
    { "start": "A005", "end": "B006" }
  ],
  "singles": ["A123", "B456"]
}
```

### 2.2 需要修改 SheetRangeName

```typescript
// src/main/utils/google-sheets.tool/index.const.ts
export enum SheetRangeName {
  // ... 現有的
  TariffCodeSheet = '稅則表',
  Address = '地址',
  SystemSetting = '系統設定',
  template = 'Template',
  SystemProductMap = 'system_product_map',
  Users = '用戶資訊',

  // 新增的
  RecipientInfo = '收貨人資訊',      // 功能二
  ProblemItems = '問題件',           // 功能三
  ManifestNumberConfig = '艙單編號設定', // 功能六
}
```

---

## 3. 功能一：按鈕 UI 修改

### 3.1 需求描述

重新整理匯出按鈕的配置，使其更清晰易用。

### 3.2 按鈕配置變更

| 原按鈕名稱 | 新按鈕名稱 | 動作 |
|-----------|-----------|------|
| 匯出成預設格式 | 台北港格式 | 調用 exportTaipeiBay() |
| 匯出成預設格式(重量進行處裡) | （移除或合併） | - |
| 匯出成蝦皮格式 | （保留） | 不變 |
| 匯出成蝦皮格式(new) | （保留） | 不變 |
| 匯出成天馬格式 | （保留） | 不變 |
| （新增） | 高雄超峰格式 | 調用 exportKaohsiungChaofeng() |

### 3.3 UI 變更

```tsx
// 新的按鈕組配置
<div className="file-selected-group-button">
  <button className="export-button" onClick={exportTaipeiBay}>
    台北港格式
  </button>
  <button className="export-button" onClick={exportKaohsiungChaofeng}>
    高雄超峰格式
  </button>
  <button className="export-button" onClick={exportShopeeFormat}>
    蝦皮格式
  </button>
  <button className="export-button" onClick={exportShopeeFormatNew}>
    蝦皮格式(new)
  </button>
  <button className="export-button" onClick={exportPegasusSheet}>
    天馬格式
  </button>
</div>
```

---

## 4. 功能二：收貨人統一編號自動帶入

### 4.1 需求描述

根據收貨人統一編號自動帶入相關資訊，並標記有海關註記的項目。

### 4.2 處理流程

```
1. 讀取 Excel 資料
2. 從 Google Sheets 取得「收貨人資訊」表
3. 對每筆資料：
   a. 用「收貨人統一編號」欄位去比對收貨人資訊表
   b. 如果找到匹配：
      - 更新收貨人英文名稱（如果線上有值）
      - 更新收貨人電話（如果線上有值）
      - 如果有海關註記 → 標記為紅色
   c. 如果找不到：
      - 將新的收貨人資訊新增到 Google Sheets
4. 匯出時套用紅色背景到有海關註記的 cell
```

### 4.3 資料結構

```typescript
// 新增介面
interface RecipientInfo {
  收貨人統一編號: string;
  收貨人英文名稱: string;
  收貨人電話: string;
  海關註記: string;
}

// DataStore 新增
const recipientInfoSheet = new DataStore<RecipientInfo[]>();
```

### 4.4 標記規則

- **觸發條件**: 收貨人資訊表中該統一編號的「海關註記」欄位有任何值
- **標記方式**: 該筆資料的「收貨人統一編號」cell 加上紅色背景 (#FF0000)
- **優先級**: 最高（不被其他顏色覆蓋）

---

## 5. 功能三：問題件標記功能

### 5.1 需求描述

根據問題件清單自動標記匹配的貨物。

### 5.2 處理流程

```
1. 從 Google Sheets 取得「問題件」表
2. 對每筆 Excel 資料：
   a. 取得「貨物名稱」欄位值
   b. 與問題件清單進行完全匹配比對
   c. 如果匹配 → 標記為紅色
```

### 5.3 資料結構

```typescript
interface ProblemItem {
  貨物名稱: string;
}

const problemItemsSheet = new DataStore<ProblemItem[]>();
```

### 5.4 標記規則

- **觸發條件**: 貨物名稱與問題件清單中的任一項完全一致（exact match）
- **標記方式**: 整列加上紅色背景 (#FF0000)
- **優先級**: 最高（與海關註記同級）

---

## 6. 功能四：台北港格式按鈕

### 6.1 需求描述

修改原「預設格式」為「台北港格式」，並增加特殊處理邏輯。

### 6.2 處理流程

基於現有 `processExcelData()` 的流程，新增以下邏輯：

```
1. 執行現有的資料處理流程
2. 合併資料後，對每筆資料檢查：
   if (毛重 >= 40 && 總件數 === 1) {
     - 金額調整為隨機值 2000-2100
     - 整列加上黃色背景
   }
3. 套用收貨人資訊帶入（功能二）
4. 套用問題件標記（功能三）
5. 匯出 Excel
```

### 6.3 特殊條件

| 條件 | 處理 |
|------|------|
| 毛重 ≥ 40kg AND 總件數 = 1 | 金額 = random(2000, 2100)，整列黃色背景 |

### 6.4 背景色優先級

```
1. 紅色（海關註記/問題件）- 最高
2. 黃色（毛重≥40kg & 總件數=1）- 次高
3. 其他現有標記
```

---

## 7. 功能五：高雄超峰按鈕

### 7.1 需求描述

基於「蝦皮格式(new)」修改，加入額外處理邏輯。

### 7.2 處理流程

```
1. 基於 processExcelDataShopeeNew() 的流程
2. 新增以下處理：
   a. 地址自動帶入到「收貨人英文地址」欄位（參考預設格式的地址處理）
   b. 毛重均攤：同一「貨物編號」的項目平均分配毛重
   c. 金額調整：
      - 總金額 < 100 → 隨機調整為 100-180
      - 總金額 > 5000 → 隨機調整為 2001-2500
3. 套用收貨人資訊帶入（功能二）
4. 套用問題件標記（功能三）
5. 匯出 Excel
```

### 7.3 毛重均攤邏輯

```typescript
// 虛擬碼
function distributeGrossWeight(data: SheetData[]): SheetData[] {
  // 按貨物編號分組
  const groups = groupBy(data, '分提單號');

  for (const [orderId, items] of groups) {
    // 取得該訂單的總毛重（取第一筆的毛重值）
    const totalGrossWeight = items[0].毛重;
    const itemCount = items.length;

    // 平均分配
    const weightPerItem = totalGrossWeight / itemCount;

    items.forEach(item => {
      item.毛重 = weightPerItem;
    });
  }

  return data;
}
```

**範例**:
```
原始資料：訂單A 有 5 個項目，總毛重 5kg
處理後：每個項目毛重 = 5kg / 5 = 1kg
```

### 7.4 金額調整規則

| 條件 | 處理 |
|------|------|
| 總金額 < 100 | random(100, 180) |
| 總金額 > 5000 | random(2001, 2500) |
| 100 ≤ 總金額 ≤ 5000 | 保持不變 |

---

## 8. 功能六：自動分艙單號功能

### 8.1 需求描述

提供靈活的艙單編號自動產生功能，支援自定義格式和黑名單。

### 8.2 艙單編號格式設計

#### 8.2.1 格式定義

艙單編號由多個「區段」(Segment) 組成，每個區段可以是：

| 類型 | 說明 | 範例 |
|------|------|------|
| alpha | 英文字母 A-Z | AAA (length=3) |
| numeric | 數字 0-9 | 00 (length=2) |

**格式組合範例**:
- `英文3位 + 數字2位` = AAA00 → AAA01 → ... → ZZZ99
- `數字2位 + 英文2位` = 00AA → 00AB → ... → 99ZZ
- `英文1位 + 數字3位 + 英文1位` = A000A → A000B → ... → Z999Z

#### 8.2.2 編號遞增規則

```
最右邊的區段先遞增，滿了進位到左邊區段

範例（英文3位 + 數字2位）:
AAA00 → AAA01 → ... → AAA99 → AAB00 → AAB01 → ... → ZZZ99
```

### 8.3 黑名單機制

#### 8.3.1 區間排除

```typescript
interface BlacklistRange {
  start: string;  // 起始編號（含）
  end: string;    // 結束編號（含）
}

// 範例：排除 A005 到 B006
{ start: "A005", end: "B006" }
```

#### 8.3.2 單個排除

```typescript
// 直接指定要排除的編號
singles: ["A123", "B456", "C789"]
```

### 8.4 UI 設計

#### 8.4.1 艙單編號設定 Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  艙單編號設定                                          [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  設定名稱: [___________________]                             │
│                                                              │
│  ── 格式定義 ──────────────────────────────────────────────  │
│                                                              │
│  [+ 新增區段]                                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 區段 1:  (●) 英文  ( ) 數字    位數: [3]  [↑] [↓] [X] │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 區段 2:  ( ) 英文  (●) 數字    位數: [2]  [↑] [↓] [X] │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  預覽: AAA00 → AAA01 → ... → ZZZ99                          │
│  總數量: 17,576,000 個編號                                   │
│                                                              │
│  ── 黑名單設定 ──────────────────────────────────────────── │
│                                                              │
│  區間排除:                                                   │
│  [+ 新增區間]                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 從 [A005____] 到 [B006____]                       [X]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  單個排除:                                                   │
│  [+ 新增單個]                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [A123____] [X]  [B456____] [X]                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                              [儲存設定]  [取消]              │
└─────────────────────────────────────────────────────────────┘
```

#### 8.4.2 艙單編號帶入 Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  帶入艙單編號                                          [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  選擇設定: [▼ 設定A (AAA00格式)              ]              │
│                                                              │
│  起始編號: [AAA00_____]                                      │
│  ⚠️ 留空則從第一個開始                                       │
│                                                              │
│  ── 本次使用資訊 ──────────────────────────────────────────  │
│  需要編號數量: 150 個                                        │
│  起始: AAA00                                                 │
│  結束: AAB49 (預估)                                          │
│                                                              │
│  ── 黑名單檢查 ──────────────────────────────────────────── │
│  ⚠️ 將跳過以下編號：                                         │
│  - A005 ~ B006 (區間排除)                                    │
│  - A123, B456 (單個排除)                                     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                              [帶入編號]  [取消]              │
└─────────────────────────────────────────────────────────────┘
```

### 8.5 資料結構

```typescript
// 區段類型
type SegmentType = 'alpha' | 'numeric';

// 區段定義
interface FormatSegment {
  type: SegmentType;
  length: number;  // 1-5
}

// 格式定義
interface ManifestNumberFormat {
  segments: FormatSegment[];
}

// 黑名單規則
interface BlacklistRule {
  ranges: Array<{ start: string; end: string }>;
  singles: string[];
}

// 完整設定
interface ManifestNumberConfig {
  settingName: string;
  format: ManifestNumberFormat;
  blacklist: BlacklistRule;
  currentNumber?: string;  // 上次使用的最後編號
  createdAt?: string;
  updatedAt?: string;
}
```

### 8.6 編號產生演算法

```typescript
class ManifestNumberGenerator {
  private format: ManifestNumberFormat;
  private blacklist: BlacklistRule;

  constructor(config: ManifestNumberConfig) {
    this.format = config.format;
    this.blacklist = config.blacklist;
  }

  /**
   * 產生下一個編號
   * @param current 當前編號（可選，預設從頭開始）
   * @returns 下一個有效編號
   */
  next(current?: string): string {
    let nextNumber = current ? this.increment(current) : this.getFirst();

    // 跳過黑名單
    while (this.isBlacklisted(nextNumber)) {
      nextNumber = this.increment(nextNumber);
    }

    return nextNumber;
  }

  /**
   * 批量產生編號
   * @param count 需要的數量
   * @param startFrom 起始編號（可選）
   * @returns 編號陣列
   */
  generate(count: number, startFrom?: string): string[] {
    const numbers: string[] = [];
    let current = startFrom;

    for (let i = 0; i < count; i++) {
      current = this.next(current);
      numbers.push(current);
    }

    return numbers;
  }

  /**
   * 驗證編號格式
   */
  validate(number: string): boolean {
    // 實作格式驗證邏輯
  }

  private getFirst(): string {
    // 產生第一個編號（如 AAA00）
  }

  private increment(number: string): string {
    // 遞增編號邏輯
  }

  private isBlacklisted(number: string): boolean {
    // 檢查是否在黑名單中
  }
}
```

### 8.7 IPC API 設計

```typescript
// ipc-contracts.ts 新增
export const ipcContracts = {
  // ... 現有的

  manifestNumber: {
    // 取得所有設定
    getConfigs: createContract<void, ManifestNumberConfig[]>(
      'manifest-number/get-configs'
    ),

    // 儲存設定
    saveConfig: createContract<ManifestNumberConfig, boolean>(
      'manifest-number/save-config'
    ),

    // 刪除設定
    deleteConfig: createContract<{ settingName: string }, boolean>(
      'manifest-number/delete-config'
    ),

    // 預覽編號（不實際寫入）
    preview: createContract<{
      configName: string;
      count: number;
      startFrom?: string;
    }, {
      numbers: string[];
      endAt: string;
    }>('manifest-number/preview'),

    // 驗證起始編號
    validate: createContract<{
      configName: string;
      startNumber: string;
    }, {
      isValid: boolean;
      error?: string;
    }>('manifest-number/validate'),
  },
};
```

---

## 9. 實作計畫

### 9.1 開發階段

#### 階段一：基礎設施（1-2天）

1. **Google Sheets 資料表新增**
   - 新增「收貨人資訊」表
   - 新增「問題件」表
   - 新增「艙單編號設定」表
   - 更新 `SheetRangeName` enum
   - 更新 `SHEET_RANGES` 陣列

2. **資料存取層**
   - 新增 DataStore 實例
   - 更新 `initGoogleSheetData()` 載入新表
   - 新增相關的 CRUD 函數

#### 階段二：收貨人資訊與問題件（1-2天）

1. **收貨人資訊功能**
   - 實作資料比對邏輯
   - 實作自動新增邏輯
   - 實作紅色標記邏輯

2. **問題件功能**
   - 實作完全匹配比對
   - 實作紅色標記邏輯

3. **Excel 輸出**
   - 修改 `addJsonToExcelTemplate()` 支援優先級背景色

#### 階段三：台北港格式（1天）

1. 重命名按鈕 UI
2. 實作特殊條件處理邏輯
3. 實作黃色背景標記
4. 整合功能二、三

#### 階段四：高雄超峰格式（1-2天）

1. 基於蝦皮格式(new) 建立新流程
2. 實作地址帶入
3. 實作毛重均攤
4. 實作金額調整
5. 整合功能二、三

#### 階段五：艙單編號功能（2-3天）

1. **後端**
   - 實作 `ManifestNumberGenerator` 類別
   - 實作 IPC handlers
   - 實作設定存取

2. **前端**
   - 實作設定 Dialog UI
   - 實作帶入 Dialog UI
   - 整合到匯出流程

#### 階段六：測試與整合（1-2天）

1. 各功能單元測試
2. 整合測試
3. UI/UX 調整
4. 文件更新

### 9.2 檔案變更清單

#### 新增檔案

```
src/
├── main/
│   ├── modules/
│   │   └── manifest-number-handlers/
│   │       └── index.ts
│   └── utils/
│       └── manifest-number-generator.ts
├── renderer/
│   ├── components/
│   │   └── manifest-number-dialog/
│   │       ├── index.tsx
│   │       ├── config-dialog.tsx
│   │       ├── apply-dialog.tsx
│   │       └── style.css
│   └── contexts/
│       └── manifest-number-context/
│           └── index.tsx
└── shared/
    └── manifest-number.types.ts
```

#### 修改檔案

```
src/
├── main/
│   ├── main.ts                          # 註冊新 handlers
│   ├── utils/
│   │   └── google-sheets.tool/
│   │       ├── index.ts                 # 新增 DataStore
│   │       ├── index.const.ts           # 新增 SheetRangeName
│   │       └── index.interface.ts       # 新增介面
│   └── modules/
│       └── excel-hanlders/
│           └── services/
│               ├── data-controller.service.ts  # 新增匯出函數
│               ├── excel-io.service.ts         # 優先級背景色
│               └── index.const.ts              # 新增欄位設定
├── renderer/
│   ├── pages/
│   │   └── home/
│   │       └── index.tsx                # 按鈕 UI 修改
│   └── api/
│       └── ipc-api.ts                   # 新增 API
└── shared/
    └── ipc-contracts.ts                 # 新增契約
```

---

## 10. 技術細節

### 10.1 背景色優先級實作

```typescript
// excel-io.service.ts

interface CellStyle {
  backgroundColor?: string;
  priority: number;  // 數字越小優先級越高
}

const STYLE_PRIORITY = {
  CUSTOMS_NOTE: 1,      // 海關註記 - 最高
  PROBLEM_ITEM: 1,      // 問題件 - 最高
  TAIPEI_BAY_SPECIAL: 2, // 台北港特殊條件
  HIGHLIGHT_BOXES: 3,   // 箱數高亮
  HIGHLIGHT_AMOUNT: 3,  // 金額高亮
};

function applyCellStyle(cell: ExcelJS.Cell, styles: CellStyle[]) {
  // 選擇優先級最高的樣式
  const highestPriority = styles.reduce((highest, current) =>
    current.priority < highest.priority ? current : highest
  );

  if (highestPriority.backgroundColor) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: highestPriority.backgroundColor },
    };
  }
}
```

### 10.2 編號遞增演算法

```typescript
function incrementSegment(value: string, type: SegmentType): {
  result: string;
  overflow: boolean;
} {
  if (type === 'numeric') {
    const num = parseInt(value, 10) + 1;
    const max = Math.pow(10, value.length) - 1;

    if (num > max) {
      return { result: '0'.repeat(value.length), overflow: true };
    }
    return { result: num.toString().padStart(value.length, '0'), overflow: false };
  }

  if (type === 'alpha') {
    // A-Z 遞增
    const chars = value.split('');
    let overflow = true;

    for (let i = chars.length - 1; i >= 0 && overflow; i--) {
      const charCode = chars[i].charCodeAt(0);
      if (charCode < 90) { // 'Z' = 90
        chars[i] = String.fromCharCode(charCode + 1);
        overflow = false;
      } else {
        chars[i] = 'A';
      }
    }

    return { result: chars.join(''), overflow };
  }
}
```

### 10.3 黑名單檢查演算法

```typescript
function isInBlacklist(number: string, blacklist: BlacklistRule): boolean {
  // 檢查單個排除
  if (blacklist.singles.includes(number)) {
    return true;
  }

  // 檢查區間排除
  for (const range of blacklist.ranges) {
    if (compareNumbers(number, range.start) >= 0 &&
        compareNumbers(number, range.end) <= 0) {
      return true;
    }
  }

  return false;
}

function compareNumbers(a: string, b: string): number {
  // 字串比較（假設格式相同）
  return a.localeCompare(b);
}
```

---

## 附錄 A：Google Sheets 設定步驟

### A.1 新增收貨人資訊表

1. 開啟 Google Sheets
2. 新增工作表，命名為「收貨人資訊」
3. 在第一列輸入欄位名稱：
   - A1: 收貨人統一編號
   - B1: 收貨人英文名稱
   - C1: 收貨人電話
   - D1: 海關註記

### A.2 新增問題件表

1. 新增工作表，命名為「問題件」
2. 在第一列輸入欄位名稱：
   - A1: 貨物名稱

### A.3 新增艙單編號設定表

1. 新增工作表，命名為「艙單編號設定」
2. 在第一列輸入欄位名稱：
   - A1: 設定名稱
   - B1: 格式定義
   - C1: 黑名單規則
   - D1: 當前編號
   - E1: 建立時間
   - F1: 更新時間

---

## 附錄 B：測試案例

### B.1 收貨人統一編號測試

| 案例 | 輸入 | 預期結果 |
|------|------|---------|
| 匹配有註記 | 統一編號存在且有海關註記 | 紅色背景 |
| 匹配無註記 | 統一編號存在但無海關註記 | 帶入資料，無標記 |
| 新收貨人 | 統一編號不存在 | 新增到 Google Sheets |

### B.2 問題件測試

| 案例 | 輸入 | 預期結果 |
|------|------|---------|
| 完全匹配 | 貨物名稱 = "電子煙" | 紅色背景 |
| 部分匹配 | 貨物名稱 = "電子煙配件" | 無標記 |
| 無匹配 | 貨物名稱 = "手機殼" | 無標記 |

### B.3 台北港格式測試

| 案例 | 毛重 | 總件數 | 預期結果 |
|------|------|--------|---------|
| 符合條件 | 45kg | 1 | 金額2000-2100，黃色 |
| 毛重不足 | 35kg | 1 | 正常處理 |
| 件數多於1 | 45kg | 2 | 正常處理 |

### B.4 艙單編號測試

| 案例 | 格式 | 起始 | 數量 | 預期結果 |
|------|------|------|------|---------|
| 正常遞增 | AAA00 | AAA00 | 3 | AAA00, AAA01, AAA02 |
| 跨區段 | AAA00 | AAA98 | 3 | AAA98, AAA99, AAB00 |
| 跳過黑名單 | AAA00 | AAA04 | 3 | AAA04, AAA07, AAA08 (跳過A005-A006) |
