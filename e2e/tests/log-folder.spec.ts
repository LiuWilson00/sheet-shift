/**
 * 隱藏功能：開啟 log 資料夾 E2E 測試
 *
 * - logs.openFolder IPC 回傳 success 與 logs 路徑
 * - 系統設定（驗證碼 8800885）最下方顯示「開啟 log 資料夾」按鈕且可點擊
 *
 * 註：以 app.evaluate mock shell.openPath，避免測試時真的開啟檔案總管。
 */

import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import {
  launchApp,
  closeApp,
  waitForAppInit,
  takeScreenshot,
} from '../helpers/electron-app';

let app: ElectronApplication;
let page: Page;

test.setTimeout(120000);

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
  await waitForAppInit(page);

  // mock shell.openPath，避免真的開啟檔案總管（回傳 '' 代表成功）
  await app.evaluate(async ({ shell }) => {
    // eslint-disable-next-line no-param-reassign
    shell.openPath = async () => '';
  });
});

test.afterAll(async () => {
  if (app) await closeApp(app);
});

test('logs.openFolder IPC 回傳 success 與 logs 路徑', async () => {
  const result = await page.evaluate(() =>
    (window as any).electron.ipcRenderer.invoke('logs-v2/open-folder'),
  );
  expect(result.success).toBe(true);
  expect(result.path).toMatch(/logs$/);
});

test('系統設定最下方顯示「開啟 log 資料夾」並可點擊', async () => {
  // 開啟系統設定
  await page.locator('.layout-header__btn:has-text("系統設定")').click();
  await page.waitForSelector('.dialog-container.mask');

  // 輸入驗證碼解鎖設定內容
  await page.locator('input[name="AUTH_CODE"]').fill('8800885');
  await page.locator('button.confirm').click();

  // 設定內容出現，最下方的隱藏按鈕可見
  const logBtn = page.locator('.settings-logfolder__btn');
  await expect(logBtn).toBeVisible({ timeout: 10000 });
  await logBtn.scrollIntoViewIfNeeded();
  await takeScreenshot(page, '30-log-folder-button');

  // 點擊後不應出現「失敗」對話框（shell.openPath 已 mock 成功）
  await logBtn.click();
  await expect(
    page.locator('.dialog-content:has-text("開啟 log 資料夾失敗")'),
  ).toHaveCount(0);
});
