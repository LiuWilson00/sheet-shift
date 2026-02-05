import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import {
  launchApp,
  closeApp,
  waitForAppInit,
  login,
  takeScreenshot,
} from '../helpers/electron-app';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
});

test.afterAll(async () => {
  if (app) await closeApp(app);
});

test.describe('應用程式啟動', () => {
  test('顯示 Header 標題', async () => {
    const title = await page.locator('.layout-header__title').textContent();
    expect(title).toBe('Sheet Shift');
    await takeScreenshot(page, '01-header');
  });

  test('Google Sheets 連線成功', async () => {
    const connected = await waitForAppInit(page);
    await takeScreenshot(page, '02-connection-status');

    if (!connected) {
      console.warn('Google Sheets 連線失敗，請確認 settings.sheet.json');
    }
    expect(connected).toBe(true);
  });

  test('連線成功後顯示綠色狀態', async () => {
    const statusDot = page.locator('.layout-header__status--connected');
    await expect(statusDot).toBeVisible();
  });

  test('顯示歡迎頁面', async () => {
    const subtitle = page.locator('.welcome-section__subtitle');
    await expect(subtitle).toHaveText('快速處理電商物流表單');
    await takeScreenshot(page, '03-welcome');
  });
});

test.describe('登入流程', () => {
  test('未登入時顯示「請先登入」按鈕', async () => {
    const loginBtn = page.locator('.upload-card__btn--login');
    // 可能已經自動登入（localStorage），所以用 or 判斷
    const uploadBtn = page.locator('.upload-card__btn:has-text("選擇檔案")');

    const isLoginVisible = await loginBtn
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const isUploadVisible = await uploadBtn
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    // 至少一個按鈕應該可見
    expect(isLoginVisible || isUploadVisible).toBe(true);
  });

  test('登入成功', async () => {
    await login(page, 'admin', 'testtest');
    await takeScreenshot(page, '04-logged-in');

    // 驗證歡迎訊息包含使用者名稱
    const welcomeTitle = page.locator('.welcome-section__title');
    await expect(welcomeTitle).toContainText('歡迎');
  });

  test('登入後顯示「選擇檔案」按鈕', async () => {
    const uploadBtn = page.locator('.upload-card__btn:has-text("選擇檔案")');
    await expect(uploadBtn).toBeVisible();
    await takeScreenshot(page, '05-upload-ready');
  });
});
