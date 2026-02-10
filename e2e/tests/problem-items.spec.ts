/**
 * 問題件標紅測試
 *
 * 驗證：台北港格式匯出後，包含問題件關鍵字的「貨物名稱」欄位應標紅
 */

import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  launchApp,
  closeApp,
  waitForAppInit,
  login,
  mockFileDialog,
  takeScreenshot,
} from '../helpers/electron-app';

const PROJECT_ROOT = 'C:/Users/User/Desktop/projects/sheet-shift';
const TEST_DATA_FILE = path.join(
  PROJECT_ROOT,
  'docs/new-feature-1207/client-qa-20260210/example/資料轉換測試.xlsx',
);

let app: ElectronApplication;
let page: Page;

test.setTimeout(180000);

test.beforeAll(async () => {
  console.log('啟動 Electron...');
  ({ app, page } = await launchApp());
  console.log('Electron 已啟動，等待初始化...');
  const connected = await waitForAppInit(page);
  console.log('初始化完成，連線狀態:', connected);
  if (!connected) {
    console.warn('Google Sheets 連線失敗，部分測試可能受影響');
  }
  await login(page);
  console.log('登入完成');
});

test.afterAll(async () => {
  if (app) await closeApp(app);
});

test('台北港格式匯出 - 問題件應標紅', async () => {
  // 1. 選擇 QA 測試檔案
  await mockFileDialog(app, TEST_DATA_FILE);
  const uploadBtn = page.locator('.upload-card__btn:has-text("選擇檔案")');
  if (await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await uploadBtn.click();
  }
  await page.waitForSelector('.file-info-card', { timeout: 15000 });
  await takeScreenshot(page, 'problem-items-01-file-selected');

  // 2. 點擊台北港格式匯出
  const taipeiBayBtn = page.locator(
    '.export-card:has(.export-card__title:text("台北港格式"))',
  );
  await expect(taipeiBayBtn).toBeVisible();
  await taipeiBayBtn.click();

  // 3. 等待匯出完成
  const dialog = page.locator('.dialog-content');
  await dialog.waitFor({ timeout: 60000 });
  await takeScreenshot(page, 'problem-items-02-export-result');

  const dialogText = await dialog.textContent();
  console.log('匯出對話框內容:', dialogText);

  // 關閉對話框
  await page.locator('button.confirm').click();

  // 驗證匯出成功
  expect(dialogText).toContain('檔案已匯出');

  // 4. 找到匯出的檔案並用 ExcelJS 檢查
  const dir = path.dirname(TEST_DATA_FILE);
  const baseName = path.basename(TEST_DATA_FILE, '.xlsx');
  const files = fs.readdirSync(dir).filter(
    (f) => f.startsWith(`${baseName}-completed`) && f.endsWith('.xlsx'),
  );
  console.log('匯出檔案:', files);
  expect(files.length).toBeGreaterThan(0);

  // 取最新的匯出檔案
  const exportedFile = path.join(dir, files.sort().pop()!);
  console.log('檢查檔案:', exportedFile);

  // 5. 用 ExcelJS 讀取並檢查格式
  // eslint-disable-next-line global-require
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(exportedFile);
  const worksheet = workbook.worksheets[0];

  // 找出「毒品」所在行，檢查其貨物名稱欄位（E 欄 = col 5）是否為紅色
  let foundPoisonRow = false;
  worksheet.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
    // 跳過表頭行
    if (rowNumber <= 3) return;

    // 貨物名稱在 E 欄 (col 5)
    const productNameCell = row.getCell(5);
    const cellValue = productNameCell.value?.toString() || '';

    if (cellValue.includes('毒品')) {
      foundPoisonRow = true;
      console.log(`Row ${rowNumber}: 貨物名稱="${cellValue}"`);

      // 檢查此 cell 的背景色
      const fill = productNameCell.fill;
      console.log(`Row ${rowNumber} fill:`, JSON.stringify(fill));

      // 應為紅色背景 (FFFF0000 或類似)
      if (fill && fill.type === 'pattern' && fill.fgColor) {
        const color = (fill.fgColor.argb || '').toUpperCase();
        console.log(`Row ${rowNumber} 背景色: ${color}`);
        // 紅色 ARGB 可能是 FFFF0000 或 FF0000
        expect(color).toContain('FF0000');
      } else {
        console.error(`Row ${rowNumber}: 毒品行沒有背景色！`, fill);
        expect(fill?.fgColor).toBeTruthy();
      }
    }
  });

  expect(foundPoisonRow).toBe(true);
  console.log('問題件標紅驗證通過');
});
