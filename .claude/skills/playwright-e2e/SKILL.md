---
name: playwright-e2e
description: Playwright E2E 測試指南。當需要撰寫或執行 Electron 應用 E2E 測試、截圖驗證、UI 自動化測試時使用。
argument-hint: "[run|write|screenshot|help]"
---

# /playwright-e2e - Playwright Electron E2E 測試

使用 `@playwright/test` 的 Electron 模式進行 E2E 測試。
Playwright Electron 模式啟動真實 Electron 程序，完整支援 IPC 通訊。

**重要**：所有 Bash 指令使用 bash 語法（非 cmd.exe）。

## 使用方式

```
/playwright-e2e              # 顯示說明
/playwright-e2e run          # 執行所有 E2E 測試
/playwright-e2e run <file>   # 執行指定測試檔案
/playwright-e2e write <desc> # 撰寫新的測試案例
/playwright-e2e screenshot   # 對目前狀態截圖
/playwright-e2e help         # 顯示可用的選擇器和測試模式
```

---

## 環境前置條件

### 必要條件

1. **@playwright/test** 已安裝（`npm ls @playwright/test`）
2. **建置完成**：`release/app/dist/main/main.js` 存在
3. **設定檔案**：`src/.env/settings.sheet.json` 存在且包含有效的 Google Sheets 憑證
4. **路徑修補**：`e2e/helpers/electron-app.ts` 中的 `patchDevPaths()` 會自動處理

### 關鍵問題：app.isPackaged

直接用 `electron.exe` 執行 production build 時，`app.isPackaged = false`，
導致 preload 和 settings 路徑使用開發模式解析（相對 `release/app/dist/main/`）。
`electron-app.ts` 中的 `patchDevPaths()` 會自動複製必要檔案到正確位置：

- `release/.erb/dll/preload.js` ← 從 `release/app/dist/main/preload.js`
- `release/.env/` ← 從 `src/.env/`

### 設定檔案位置

```
src/.env/settings.sheet.json
```

內容格式：
```json
{
  "client_email": "admin-229@sheet-shift.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "spreadsheet_id": "1k45E2mtr1CuZ09bZHurQgeH8Qq-JogQXNH8jDrYPuOE",
  "isConnected": true
}
```

如果此檔案不存在或內容無效，應用程式啟動時會顯示「尚未設定連線資訊」錯誤。
請確認此檔案存在後再執行測試。

### 測試帳號

| 名稱 | 帳號 | 密碼 |
|------|------|------|
| 管理員 | admin | testtest |

### 測試資料

```
test-data/
├── 蝦皮原始-2.xlsx    # Shopee 格式測試資料
└── 資料測試.xlsx      # 通用測試資料
```

---

## 架構

### Playwright Electron 測試原理

```
Playwright Test Runner
    ↓ _electron.launch()
    ↓ 啟動真實 electron.exe + main.js
    ↓ 取得 ElectronApplication 物件
    ↓ app.firstWindow() → 取得 Page 物件
    ↓ 像操作 browser page 一樣操作 Electron 視窗
```

與瀏覽器模式不同，Electron 模式：
- ✅ 有完整的 preload script 和 contextBridge
- ✅ IPC 通訊正常運作（ipcRenderer.invoke）
- ✅ 可存取 Node.js API
- ✅ 可操作原生對話框（需 mock）

### 測試檔案結構

```
e2e/
├── playwright.config.ts     # Playwright 設定檔
├── helpers/
│   └── electron-app.ts      # 啟動/關閉 Electron 的工具
├── tests/
│   ├── app-launch.spec.ts   # 啟動與連線測試
│   ├── auth.spec.ts         # 登入/登出測試
│   ├── export.spec.ts       # 匯出功能測試
│   └── manifest.spec.ts     # 艙單編號測試
└── screenshots/             # 截圖輸出目錄
```

---

## 核心程式碼模板

### playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 60000,
  retries: 0,
  use: {
    trace: 'on-first-retry',
  },
  // Electron 測試不需要 webServer 設定
  // 不需要 projects/browsers 設定
});
```

### helpers/electron-app.ts

```typescript
import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

const PROJECT_ROOT = 'C:/Users/User/Desktop/projects/sheet-shift';

export async function launchApp(): Promise<{
  app: ElectronApplication;
  page: Page;
}> {
  const app = await electron.launch({
    args: [path.join(PROJECT_ROOT, 'release/app/dist/main/main.js')],
    executablePath: path.join(PROJECT_ROOT, 'node_modules/electron/dist/electron.exe'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });

  // 等待第一個視窗
  const page = await app.firstWindow();

  // 等待應用初始化完成（loading 消失）
  await page.waitForSelector('.loading', { state: 'hidden', timeout: 30000 }).catch(() => {});

  return { app, page };
}

export async function closeApp(app: ElectronApplication): Promise<void> {
  await app.close();
}
```

### 基本測試模板

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp } from '../helpers/electron-app';
import type { ElectronApplication, Page } from '@playwright/test';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(app);
});

test('應用程式成功啟動', async () => {
  // 等待標題出現
  const title = await page.locator('.layout-header__title').textContent();
  expect(title).toBe('Sheet Shift');
});
```

---

## 常用測試模式

### 1. 等待應用初始化

應用啟動後會呼叫 `ipcApi.app.init()` 連線 Google Sheets。
需等待 loading 消失和連線狀態更新：

```typescript
// 等待 loading 結束
await page.waitForSelector('.loading', { state: 'hidden', timeout: 30000 }).catch(() => {});

// 等待連線成功（綠色狀態點）
await page.waitForSelector('.layout-header__status--connected', { timeout: 15000 });
```

如果連線失敗，會彈出對話框：
```typescript
// 處理可能的連線錯誤對話框
const errorDialog = page.locator('.dialog-content');
if (await errorDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
  await page.locator('button.confirm').click(); // 關閉錯誤對話框
}
```

### 2. 登入流程

```typescript
async function login(page: Page, account = 'admin', password = 'testtest') {
  // 點擊「請先登入」按鈕
  await page.locator('.upload-card__btn--login').click();

  // 等待登入對話框
  await page.waitForSelector('.dialog-container.mask');

  // 填入帳號密碼
  await page.locator('input[name="account"]').fill(account);
  await page.locator('input[name="password"]').fill(password);

  // 點擊確認
  await page.locator('button.confirm').click();

  // 等待登入成功（歡迎訊息）
  await page.waitForSelector('.welcome-section__title:has-text("歡迎")');
}
```

### 3. 截圖

```typescript
// 全頁截圖
await page.screenshot({
  path: 'e2e/screenshots/full-page.png',
  fullPage: true,
});

// 指定元素截圖
await page.locator('.export-section').screenshot({
  path: 'e2e/screenshots/export-section.png',
});

// 帶時間戳的截圖
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
await page.screenshot({
  path: `e2e/screenshots/state-${timestamp}.png`,
});
```

### 4. 選擇檔案（Mock 對話框）

Electron 的 `dialog.showOpenDialog` 需要攔截：

```typescript
// 在 Electron main process 中 mock 檔案選擇對話框
await app.evaluate(async ({ dialog }) => {
  // 攔截下一次 showOpenDialog，返回指定檔案
  dialog.showOpenDialog = async () => ({
    canceled: false,
    filePaths: ['C:/Users/User/Desktop/projects/sheet-shift/test-data/資料測試.xlsx'],
  });
}, { dialog: require('electron').dialog });

// 或者用 page.evaluate 透過 IPC 直接觸發
await page.evaluate(async () => {
  // 直接呼叫 IPC API（繞過檔案選擇對話框）
  return window.electron.ipcRenderer.invoke('excel-v2/select-file');
});
```

**更可靠的方式**：使用 `app.evaluate` mock dialog：

```typescript
async function mockFileDialog(app: ElectronApplication, filePath: string) {
  await app.evaluate(
    async ({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [filePath],
      });
    },
    filePath,
  );
}

// 使用
await mockFileDialog(app, 'C:/Users/User/Desktop/projects/sheet-shift/test-data/資料測試.xlsx');
await page.locator('.upload-card__btn:has-text("選擇檔案")').click();
await page.waitForSelector('.file-info-section');
```

### 5. 匯出流程測試

```typescript
test('匯出台北港格式', async () => {
  // 前提：已登入、已選擇檔案

  // 點擊匯出按鈕
  await page.locator('.export-card:has-text("台北港格式")').click();

  // 等待 loading 結束
  await page.waitForSelector('.loading', { state: 'hidden', timeout: 30000 }).catch(() => {});

  // 檢查成功對話框
  await expect(page.locator('.dialog-content')).toContainText('檔案已匯出');

  // 截圖留存
  await page.screenshot({ path: 'e2e/screenshots/export-taipei-bay-result.png' });

  // 關閉對話框
  await page.locator('button.confirm').click();
});
```

### 6. 艙單編號設定測試

```typescript
test('開啟艙單編號設定', async () => {
  // 勾選「自動帶入艙單編號」
  const checkbox = page.locator('.file-info-card__manifest-row input[type="checkbox"]');
  await checkbox.check();

  // 點擊設定按鈕
  await page.locator('.file-info-card__manifest-config').click();

  // 等待設定對話框
  await page.waitForSelector('.manifest-dialog');
  await page.screenshot({ path: 'e2e/screenshots/manifest-config.png' });

  // 關閉
  await page.locator('.manifest-dialog__close').click();
});
```

---

## CSS 選擇器速查表

### Header
```
.layout-header__title                    → "Sheet Shift" 標題
.layout-header__status--connected        → 已連線狀態（綠色）
.layout-header__status--disconnected     → 未連線狀態（紅色）
.layout-header__btn:has-text("連線設定")  → 連線設定按鈕
.layout-header__btn:has-text("系統設定")  → 系統設定按鈕
.layout-header__select                   → 系統設定下拉選單
```

### 首頁（未選檔案）
```
.welcome-section__title                  → 歡迎標題（"歡迎, 管理員" 或 "Sheet Shift"）
.welcome-section__subtitle               → 副標題
.upload-card__btn                        → "選擇檔案" 按鈕
.upload-card__btn--login                 → "請先登入" 按鈕
```

### 首頁（已選檔案）
```
.file-info-card                          → 檔案資訊卡片
.file-info-card__text                    → 檔案路徑文字
.file-info-card__reupload                → "重新選擇" 按鈕
.file-info-card__option                  → 選項 checkbox 容器
.file-info-card__preprocess-btn          → "進行資料前處理" 按鈕
.file-info-card__manifest-row            → 艙單編號選項列
.file-info-card__manifest-config         → "⚙️ 設定" 按鈕
```

### 匯出卡片
```
.export-card                             → 所有匯出按鈕
.export-card:has-text("台北港格式")       → 台北港匯出
.export-card:has-text("高雄超峰格式")     → 高雄超峰匯出
.export-card:has-text("Shopee")          → 蝦皮格式匯出
.export-card:has-text("天馬格式")         → 天馬格式匯出
.export-card__badge--success             → NEW 徽章
```

### 對話框
```
.dialog-container.mask                   → 對話框遮罩層
.dialog-content                          → 對話框內容
.dialog-content h2                       → 對話框標題
.dialog-content-main                     → 對話框主內容區
button.confirm                           → 確認按鈕
.dialog-buttons button:not(.confirm)     → 取消按鈕
```

### 登入對話框
```
input[name="account"]                    → 帳號輸入框
input[name="password"]                   → 密碼輸入框
```

### 艙單編號對話框
```
.manifest-dialog                         → 對話框容器
.manifest-dialog__title                  → 對話框標題
.manifest-dialog__close                  → 關閉按鈕（×）
.manifest-dialog__input                  → 輸入框
.manifest-dialog__btn--primary           → 主要按鈕（儲存/確認帶入）
.manifest-dialog__btn--secondary         → 次要按鈕（取消）
.apply-dialog__select                    → 設定選擇下拉
.apply-dialog__count-input input         → 數量輸入
.apply-dialog__transaction-code input    → 交易代碼輸入
```

### Loading
```
.loading                                 → Loading 遮罩（visible = 載入中）
```

---

## 執行測試

### 執行全部 E2E 測試

```bash
cd "C:/Users/User/Desktop/projects/sheet-shift" && npx playwright test --config=e2e/playwright.config.ts
```

### 執行指定測試

```bash
cd "C:/Users/User/Desktop/projects/sheet-shift" && npx playwright test --config=e2e/playwright.config.ts e2e/tests/auth.spec.ts
```

### 帶 headed 模式（看得到視窗）

Electron 測試預設就是 headed（會顯示視窗），不需要額外設定。

### 除錯模式

```bash
cd "C:/Users/User/Desktop/projects/sheet-shift" && npx playwright test --config=e2e/playwright.config.ts --debug
```

### 截圖輸出

截圖儲存到 `e2e/screenshots/` 目錄。可使用 Read 工具讀取圖片檔案來檢視。

---

## 完整測試範例：啟動 → 登入 → 截圖

```typescript
import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';

const PROJECT_ROOT = 'C:/Users/User/Desktop/projects/sheet-shift';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(PROJECT_ROOT, 'release/app/dist/main/main.js')],
    executablePath: path.join(PROJECT_ROOT, 'node_modules/electron/dist/electron.exe'),
    env: { ...process.env, NODE_ENV: 'production' },
  });
  page = await app.firstWindow();

  // 等待初始化
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
});

test.afterAll(async () => {
  if (app) await app.close();
});

test('啟動成功並顯示 header', async () => {
  const title = await page.locator('.layout-header__title').textContent();
  expect(title).toBe('Sheet Shift');
  await page.screenshot({ path: 'e2e/screenshots/01-launch.png' });
});

test('等待連線完成', async () => {
  // 等待連線 or 錯誤
  const connected = page.locator('.layout-header__status--connected');
  const errorDialog = page.locator('.dialog-content');

  await Promise.race([
    connected.waitFor({ timeout: 15000 }),
    errorDialog.waitFor({ timeout: 15000 }),
  ]).catch(() => {});

  // 如果出現錯誤對話框，關閉它
  if (await errorDialog.isVisible()) {
    await page.screenshot({ path: 'e2e/screenshots/02-connection-error.png' });
    await page.locator('button.confirm').click();
  } else {
    await page.screenshot({ path: 'e2e/screenshots/02-connected.png' });
  }
});

test('登入', async () => {
  // 點擊「請先登入」
  const loginBtn = page.locator('.upload-card__btn--login');
  if (await loginBtn.isVisible()) {
    await loginBtn.click();

    // 填入帳密
    await page.locator('input[name="account"]').fill('admin');
    await page.locator('input[name="password"]').fill('testtest');
    await page.screenshot({ path: 'e2e/screenshots/03-login-form.png' });

    // 確認登入
    await page.locator('button.confirm').click();

    // 等待歡迎訊息
    await expect(page.locator('.welcome-section__title')).toContainText('歡迎', { timeout: 10000 });
  }

  await page.screenshot({ path: 'e2e/screenshots/04-logged-in.png' });
});
```

---

## 撰寫新測試的步驟

1. 確認 `e2e/` 目錄結構存在
2. 確認 `e2e/playwright.config.ts` 和 `e2e/helpers/electron-app.ts` 存在
3. 在 `e2e/tests/` 建立新的 `.spec.ts` 檔案
4. 使用上述模板和選擇器撰寫測試
5. 執行測試並用 Read 工具檢視截圖結果

## 注意事項

- 確保啟動前沒有其他 electron.exe 進程：`taskkill /f /im electron.exe 2>/dev/null`
- 如果 `/electron-env` skill 已啟動 Electron，需先 `/electron-env stop`
- 應用初始化需連線 Google Sheets，首次可能較慢（5-10 秒）
- 檔案選擇對話框需要 mock（見上方 mockFileDialog）
- 匯出操作會在同目錄產生新的 xlsx 檔案
- 截圖可用 Read 工具直接查看（支援圖片）
