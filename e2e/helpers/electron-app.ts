import {
  _electron as electron,
  ElectronApplication,
  Page,
} from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = 'C:/Users/User/Desktop/projects/sheet-shift';

/**
 * 修補 Electron 開發模式路徑問題
 *
 * 直接用 electron.exe 執行 production build 時，app.isPackaged = false，
 * 導致 preload 和 settings 路徑使用開發模式解析（相對於 release/app/dist/main/）。
 * 需要在 release/ 目錄建立對應的目錄結構。
 */
function patchDevPaths() {
  const mainDir = path.join(PROJECT_ROOT, 'release/app/dist/main');
  const prodPreload = path.join(mainDir, 'preload.js');

  // 修補 preload：開發路徑 = __dirname/../../../.erb/dll/preload.js = release/.erb/dll/preload.js
  const devPreloadDir = path.join(PROJECT_ROOT, 'release/.erb/dll');
  const devPreload = path.join(devPreloadDir, 'preload.js');
  if (!fs.existsSync(devPreload) && fs.existsSync(prodPreload)) {
    fs.mkdirSync(devPreloadDir, { recursive: true });
    fs.copyFileSync(prodPreload, devPreload);
  }

  // 修補 .env：開發路徑 = __dirname/../../../.env = release/.env
  const srcEnv = path.join(PROJECT_ROOT, 'src/.env');
  const devEnv = path.join(PROJECT_ROOT, 'release/.env');
  if (!fs.existsSync(devEnv) && fs.existsSync(srcEnv)) {
    fs.cpSync(srcEnv, devEnv, { recursive: true });
  }
}

/**
 * 啟動 Electron 測試應用
 * 需先執行 `npm run build` 建置
 */
export async function launchApp(): Promise<{
  app: ElectronApplication;
  page: Page;
}> {
  // 確保路徑修補
  patchDevPaths();

  const app = await electron.launch({
    args: [path.join(PROJECT_ROOT, 'release/app/dist/main/main.js')],
    executablePath: path.join(
      PROJECT_ROOT,
      'node_modules/electron/dist/electron.exe',
    ),
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });

  // 等待第一個視窗出現
  const page = await app.firstWindow();

  // 等待 DOM 載入
  await page.waitForLoadState('domcontentloaded');

  return { app, page };
}

/**
 * 關閉 Electron 應用
 */
export async function closeApp(app: ElectronApplication): Promise<void> {
  await app.close();
}

/**
 * 等待應用初始化完成（Google Sheets 連線）
 * @returns 是否連線成功
 */
export async function waitForAppInit(page: Page): Promise<boolean> {
  const connected = page.locator('.layout-header__status--connected');
  const errorDialog = page.locator('.dialog-content');

  try {
    await Promise.race([
      connected.waitFor({ timeout: 20000 }),
      errorDialog.waitFor({ timeout: 20000 }),
    ]);
  } catch {
    // 超時，可能仍在載入
    return false;
  }

  // 如果出現錯誤對話框，關閉並回報失敗
  if (await errorDialog.isVisible()) {
    await page.locator('button.confirm').click();
    return false;
  }

  return true;
}

/**
 * 執行登入流程
 */
export async function login(
  page: Page,
  account = 'admin',
  password = 'testtest',
): Promise<void> {
  const loginBtn = page.locator('.upload-card__btn--login');

  // 如果已登入（沒有登入按鈕），直接返回
  if (!(await loginBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
    return;
  }

  await loginBtn.click();

  // 等待登入對話框
  await page.waitForSelector('.dialog-container.mask');

  // 填入帳號密碼
  await page.locator('input[name="account"]').fill(account);
  await page.locator('input[name="password"]').fill(password);

  // 確認登入
  await page.locator('button.confirm').click();

  // 等待歡迎訊息出現
  await page.waitForSelector('.welcome-section__title:has-text("歡迎")', {
    timeout: 10000,
  });
}

/**
 * Mock 檔案選擇對話框
 */
export async function mockFileDialog(
  app: ElectronApplication,
  filePath: string,
): Promise<void> {
  await app.evaluate(
    async ({ dialog }, mockPath) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [mockPath],
      });
    },
    filePath,
  );
}

/**
 * 截圖工具
 */
export async function takeScreenshot(
  page: Page,
  name: string,
): Promise<string> {
  const screenshotPath = `e2e/screenshots/${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}
