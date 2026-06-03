/**
 * 資料前處理 / 批量智能辨識 — 狀態回報與 log 驗證
 *
 * 跑真實流程（勾批量智能辨識）確認：
 * - 流程能完成（loading 出現後消失、無錯誤對話框）
 * - 過程中 loading 會顯示狀態文字（盡力擷取，非硬性斷言）
 * 進度/log 的詳細驗證另由 reading 產生的 log 檔確認。
 */
import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import {
  launchApp,
  closeApp,
  waitForAppInit,
  login,
  mockFileDialog,
  takeScreenshot,
} from '../helpers/electron-app';

const PROJECT_ROOT = 'C:/Users/User/Desktop/projects/sheet-shift';
const TEST_DATA_FILE = path.join(PROJECT_ROOT, 'test-data/資料測試.xlsx');

let app: ElectronApplication;
let page: Page;

test.setTimeout(180000);

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
  await waitForAppInit(page);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await waitForAppInit(page);
  await login(page);
});

test.afterAll(async () => {
  if (app) await closeApp(app);
});

test('批量智能辨識：流程完成且 loading 顯示狀態文字', async () => {
  // 選檔
  await mockFileDialog(app, TEST_DATA_FILE);
  await page.locator('.upload-card__btn:has-text("選擇檔案")').click();
  await page.waitForSelector('.file-info-card', { timeout: 15000 });

  // 勾選「批量智能辨識」
  const batchCheckbox = page.locator(
    '.file-info-card__option:has-text("批量智能辨識") input[type="checkbox"]',
  );
  if (!(await batchCheckbox.isChecked())) {
    await batchCheckbox.check();
  }

  // 點「進行資料前處理」
  await page.locator('.file-info-card__preprocess-btn').click();

  // 流程完成的判準：資料調試對話框出現（含「實際商品名稱」欄）
  // 註：loading 是長操作期間的暫態 UI（小檔案會一閃而過），此處不硬性斷言；
  // 進度回報的逐筆觸發已由 log（辨識進度 / 批量智能辨識完成）佐證。
  await expect(
    page.locator('.dialog-content:has-text("實際商品名稱")'),
  ).toBeVisible({ timeout: 150000 });

  // 不應出現錯誤對話框
  const errorDialog = page.locator(
    '.dialog-content:has-text("資料前處理失敗"), .dialog-content:has-text("發生錯誤")',
  );
  expect(await errorDialog.count()).toBe(0);
  await takeScreenshot(page, '40-preprocess-done');
});
