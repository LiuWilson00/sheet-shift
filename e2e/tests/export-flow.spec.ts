/**
 * 匯出流程 E2E 測試
 *
 * 測試場景：
 * 1. 完整匯出流程 - 台北港格式
 * 2. 完整匯出流程 - 高雄超峰格式
 * 3. 艙單編號設定與帶入流程
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
const TEST_DATA_FILE = path.join(PROJECT_ROOT, 'test-data/資料測試.xlsx');

let app: ElectronApplication;
let page: Page;

test.setTimeout(120000);

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
  const connected = await waitForAppInit(page);
  if (!connected) {
    console.warn('Google Sheets 連線失敗，部分測試可能受影響');
  }
  await login(page);
});

test.afterAll(async () => {
  if (app) await closeApp(app);
});

/**
 * 選擇測試檔案並等待檔案資訊區塊出現
 */
async function selectTestFile() {
  // Mock 檔案選擇對話框
  await mockFileDialog(app, TEST_DATA_FILE);

  // 點擊「選擇檔案」按鈕
  const uploadBtn = page.locator('.upload-card__btn:has-text("選擇檔案")');
  if (await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await uploadBtn.click();
  }

  // 等待檔案資訊區塊出現
  await page.waitForSelector('.file-info-card', { timeout: 15000 });
}

/**
 * 重設檔案狀態（重新選擇）
 */
async function resetFile() {
  const reuploadBtn = page.locator('.file-info-card__reupload');
  if (await reuploadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await reuploadBtn.click();
    // 等待回到上傳區塊
    await page
      .waitForSelector('.upload-card', { timeout: 5000 })
      .catch(() => {});
  }
}

/**
 * 清理匯出產生的檔案
 */
function cleanupExportedFile(originalPath: string) {
  const dir = path.dirname(originalPath);
  const ext = path.extname(originalPath);
  const baseName = path.basename(originalPath, ext);
  // 匯出檔案名稱格式：原檔名-completed.xlsx
  const pattern = `${baseName}-completed`;

  try {
    const files = fs.readdirSync(dir);
    files
      .filter((f) => f.includes(pattern))
      .forEach((f) => {
        fs.unlinkSync(path.join(dir, f));
      });
  } catch {
    // 清理失敗不影響測試
  }
}

test.describe('匯出流程', () => {
  test.beforeAll(async () => {
    await selectTestFile();
  });

  test.afterAll(async () => {
    // 清理匯出檔案
    cleanupExportedFile(TEST_DATA_FILE);
  });

  test('檔案選擇後顯示檔案資訊', async () => {
    const fileInfoCard = page.locator('.file-info-card');
    await expect(fileInfoCard).toBeVisible();

    // 應顯示檔案路徑
    const filePath = page.locator('.file-info-card__text');
    await expect(filePath).toBeVisible();
    await takeScreenshot(page, '10-file-selected');
  });

  test('顯示匯出格式選項', async () => {
    const exportSection = page.locator('.export-section');
    await expect(exportSection).toBeVisible();

    // 檢查匯出標題
    const title = page.locator('.export-section__title');
    await expect(title).toHaveText('選擇匯出格式');

    // 檢查所有匯出卡片
    const cards = page.locator('.export-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);

    await takeScreenshot(page, '11-export-options');
  });

  test('台北港格式匯出成功', async () => {
    // 點擊台北港格式按鈕
    const taipeiBayBtn = page.locator(
      '.export-card:has(.export-card__title:text("台北港格式"))',
    );
    await expect(taipeiBayBtn).toBeVisible();
    await taipeiBayBtn.click();

    // 等待匯出完成 - 對話框出現（成功或失敗）
    const dialog = page.locator('.dialog-content');
    await dialog.waitFor({ timeout: 60000 });

    // 截圖查看結果
    await takeScreenshot(page, '12-taipei-bay-export-result');

    // 取得對話框內容
    const dialogText = await dialog.textContent();

    // 關閉對話框
    await page.locator('button.confirm').click();

    // 驗證匯出成功（包含「檔案已匯出」或「匯出」字樣）
    expect(dialogText).toContain('檔案已匯出');
  });

  test('高雄超峰格式匯出成功', async () => {
    // 點擊高雄超峰格式按鈕
    const kaohsiungBtn = page.locator(
      '.export-card:has(.export-card__title:text("高雄超峰格式"))',
    );
    await expect(kaohsiungBtn).toBeVisible();
    await kaohsiungBtn.click();

    // 等待匯出完成
    const dialog = page.locator('.dialog-content');
    await dialog.waitFor({ timeout: 60000 });

    await takeScreenshot(page, '13-kaohsiung-chaofeng-export-result');

    const dialogText = await dialog.textContent();

    // 關閉對話框
    await page.locator('button.confirm').click();

    expect(dialogText).toContain('檔案已匯出');
  });
});

test.describe('艙單編號設定功能', () => {
  test.beforeAll(async () => {
    // 確保有檔案已選取（如果前一個 describe 已重設）
    const fileInfoCard = page.locator('.file-info-card');
    if (!(await fileInfoCard.isVisible({ timeout: 2000 }).catch(() => false))) {
      await selectTestFile();
    }
  });

  test('顯示艙單編號選項區塊', async () => {
    const manifestSection = page.locator('.file-info-card__manifest');
    await expect(manifestSection).toBeVisible();

    // 檢查自動帶入核選方塊
    const checkbox = page.locator(
      '.file-info-card__manifest label:has-text("自動帶入艙單編號")',
    );
    await expect(checkbox).toBeVisible();

    // 檢查設定按鈕
    const configBtn = page.locator('.file-info-card__manifest-config');
    await expect(configBtn).toBeVisible();

    await takeScreenshot(page, '14-manifest-section');
  });

  test('開啟艙單編號設定 Dialog', async () => {
    // 點擊設定按鈕
    const configBtn = page.locator('.file-info-card__manifest-config');
    await configBtn.click();

    // 等待 Dialog 出現
    const dialog = page.locator('.manifest-dialog-overlay');
    await dialog.waitFor({ timeout: 5000 });

    // 驗證 Dialog 內容
    const dialogTitle = page.locator('.manifest-dialog__title');
    await expect(dialogTitle).toBeVisible();

    await takeScreenshot(page, '15-manifest-config-dialog');

    // 關閉 Dialog
    const closeBtn = page.locator('.manifest-dialog__close');
    await closeBtn.click();

    // 驗證 Dialog 關閉
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('啟用艙單編號並觸發帶入 Dialog', async () => {
    // 勾選「自動帶入艙單編號」
    const checkbox = page.locator(
      '.file-info-card__manifest .file-info-card__option input[type="checkbox"]',
    );
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.click();
    }

    await takeScreenshot(page, '16-manifest-enabled');

    // 確認勾選後應顯示設定選擇區塊（如果有設定的話）
    const selectSection = page.locator('.file-info-card__manifest-select');
    // 如果 Google Sheets 中有設定，應該會顯示
    const hasConfigs = await selectSection
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (hasConfigs) {
      // 點擊任意匯出按鈕，應開啟帶入 Dialog
      const exportBtn = page.locator(
        '.export-card:has(.export-card__title:text("台北港格式"))',
      );
      await exportBtn.click();

      // 等待帶入 Dialog 出現
      const applyDialog = page.locator('.manifest-dialog-overlay');
      const dialogVisible = await applyDialog
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (dialogVisible) {
        await takeScreenshot(page, '17-manifest-apply-dialog');

        // 關閉 Dialog
        const cancelBtn = page.locator('.manifest-dialog__btn--secondary');
        if (await cancelBtn.isVisible().catch(() => false)) {
          await cancelBtn.click();
        } else {
          const closeBtn = page.locator('.manifest-dialog__close');
          await closeBtn.click();
        }
      }
    }

    // 取消勾選以恢復狀態
    if (await checkbox.isChecked()) {
      await checkbox.click();
    }
  });
});
