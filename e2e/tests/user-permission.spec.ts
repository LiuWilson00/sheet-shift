/**
 * 使用者權限管理 E2E 測試（對應 FEATURE_SPEC §8.3）
 *
 * 測試場景：
 * - 案例 15：admin（管理員）登入後看到全部匯出按鈕 + 「使用者管理」入口
 * - 使用者管理對話框：列表、新增表單（角色/權限 checkbox）
 * - 案例 16/17：透過管理 UI 新增「限定權限」使用者 → 列表顯示正確權限 → 刪除（CRUD round-trip）
 *
 * ⚠️ 前置：Google Sheet「用戶資訊」表需已新增 role/permissions 欄，
 *    且測試帳號 admin 的 role 設為 admin（Phase 0）。
 *    若未設定，相關測試會 skip 並提示。
 *
 * 註：一般使用者「只看到被授權按鈕」的過濾邏輯由單元測試
 *    (permission.util.test.ts canSeeExport) 完整涵蓋；此處驗證 UI 串接。
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
const TEMP_ACCOUNT = 'e2e_perm_test';

let app: ElectronApplication;
let page: Page;
/** admin 角色是否已正確設定（Phase 0 完成）；未完成則相關測試 skip */
let managementAvailable = false;

test.setTimeout(120000);

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
  const connected = await waitForAppInit(page);
  if (!connected) {
    console.warn('Google Sheets 連線失敗，E2E 測試無法進行');
  }
  await login(page);

  managementAvailable = await page
    .locator('.layout-header__btn:has-text("使用者管理")')
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (!managementAvailable) {
    console.warn(
      '未偵測到「使用者管理」入口：請確認 Phase 0（Google Sheet 已新增 role 欄且 admin 帳號 role=admin）',
    );
  }
});

test.afterAll(async () => {
  if (app) await closeApp(app);
});

test('回歸：admin 登入成功且首頁正常渲染', async () => {
  // 驗證 auth.login → AppUser 變更未破壞既有登入流程
  await takeScreenshot(page, '20-admin-logged-in');
  await expect(page.locator('.welcome-section__title')).toContainText('歡迎');
  await expect(page.locator('.layout-header__status--connected')).toBeVisible();
});

test('案例15a：admin 登入後顯示「使用者管理」入口', async () => {
  test.skip(
    !managementAvailable,
    '需先完成 Phase 0（Google Sheet 新增 role 欄且 admin 帳號 role=admin）',
  );
  const entry = page.locator('.layout-header__btn:has-text("使用者管理")');
  await expect(entry).toBeVisible();
});

test.describe('使用者管理對話框', () => {
  test.beforeEach(() => {
    test.skip(!managementAvailable, '需先完成 Phase 0（admin 角色設定）');
  });

  test('開啟對話框並顯示使用者列表', async () => {
    await page.locator('.layout-header__btn:has-text("使用者管理")').click();
    await page.waitForSelector('.user-mgmt-dialog', { timeout: 10000 });

    // 標題與表格
    await expect(
      page.locator('.user-mgmt-dialog__header h2'),
    ).toHaveText('使用者管理');
    await expect(page.locator('.user-mgmt-table')).toBeVisible();

    // 至少一列使用者（admin 自己）
    const rows = page.locator('.user-mgmt-table tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(1);

    await takeScreenshot(page, '21-user-management-list');
  });

  test('新增表單顯示 6 個權限 checkbox 與「全部可見」', async () => {
    await page.locator('.user-mgmt-toolbar__add').click();
    await page.waitForSelector('.user-mgmt-form', { timeout: 5000 });

    // 「全部可見」+ 6 個按鈕 checkbox = 7 個 .user-mgmt-form__perm-item
    const permItems = page.locator('.user-mgmt-form__perm-item');
    expect(await permItems.count()).toBe(7);

    await takeScreenshot(page, '22-user-management-add-form');

    // 切換為管理員角色 → 權限區塊改顯示提示
    await page.locator('input[type="radio"][name="role"]').nth(1).check();
    await expect(page.locator('.user-mgmt-form__hint')).toBeVisible();

    await takeScreenshot(page, '23-user-management-admin-role');

    // 取消，回到列表
    await page.locator('.user-mgmt-form__actions button:has-text("取消")').click();
    await expect(page.locator('.user-mgmt-table')).toBeVisible();
  });

  test('案例16/17：新增限定權限使用者 → 列表顯示正確 → 刪除', async () => {
    // --- 新增 ---
    await page.locator('.user-mgmt-toolbar__add').click();
    await page.waitForSelector('.user-mgmt-form');

    await page.locator('.user-mgmt-form__row:has-text("姓名") input').fill('E2E測試員');
    await page.locator('.user-mgmt-form__row:has-text("帳號") input').fill(TEMP_ACCOUNT);
    await page.locator('.user-mgmt-form__row:has-text("密碼") input').fill('e2e-pw');

    // 只勾選「蝦皮2轉」(exportShopee) 與「天馬格式」(exportPegasus)
    await page
      .locator('.user-mgmt-form__perm-item:has-text("蝦皮2轉") input')
      .check();
    await page
      .locator('.user-mgmt-form__perm-item:has-text("天馬格式") input')
      .check();

    await takeScreenshot(page, '24-add-limited-user');
    await page.locator('.user-mgmt-form__save').click();

    // 等回到列表並出現新使用者
    const newRow = page.locator(
      `.user-mgmt-table tbody tr:has-text("${TEMP_ACCOUNT}")`,
    );
    await expect(newRow).toBeVisible({ timeout: 15000 });

    // 權限欄應顯示兩個被授權的按鈕標籤
    await expect(newRow).toContainText('蝦皮2轉');
    await expect(newRow).toContainText('天馬格式');
    await takeScreenshot(page, '25-limited-user-in-list');

    // --- 刪除（清理）---
    await newRow.locator('button[title="刪除"]').click();
    // 確認刪除對話框
    await page.waitForSelector('.dialog-content');
    await page.locator('button.confirm').click();

    // 該列消失
    await expect(newRow).toHaveCount(0, { timeout: 15000 });
    await takeScreenshot(page, '26-limited-user-deleted');
  });

  test.afterAll(async () => {
    // 保險清理：若上面流程中斷導致 temp user 殘留，嘗試移除
    if (!managementAvailable) return;
    const stray = page.locator(
      `.user-mgmt-table tbody tr:has-text("${TEMP_ACCOUNT}")`,
    );
    if (await stray.count().catch(() => 0)) {
      await stray
        .first()
        .locator('button[title="刪除"]')
        .click()
        .catch(() => {});
      await page
        .locator('button.confirm')
        .click()
        .catch(() => {});
    }
  });
});

test.describe('案例15b：admin 看到全部 6 個匯出按鈕', () => {
  test.afterAll(() => {
    // 清理匯出測試可能殘留的關閉檔案（本測試不匯出，僅保險）
    try {
      const dir = path.dirname(TEST_DATA_FILE);
      const base = path.basename(TEST_DATA_FILE, path.extname(TEST_DATA_FILE));
      fs.readdirSync(dir)
        .filter((f) => f.includes(`${base}-completed`))
        .forEach((f) => fs.unlinkSync(path.join(dir, f)));
    } catch {
      /* 清理失敗不影響測試 */
    }
  });

  test('選擇檔案後顯示 6 個匯出按鈕', async () => {
    test.skip(!managementAvailable, '需先完成 Phase 0（admin 角色設定）');

    // 若管理對話框仍開啟，先關閉
    const dialogClose = page.locator('.user-mgmt-dialog__close');
    if (await dialogClose.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dialogClose.click();
    }

    await mockFileDialog(app, TEST_DATA_FILE);
    const uploadBtn = page.locator('.upload-card__btn:has-text("選擇檔案")');
    if (await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await uploadBtn.click();
    }
    await page.waitForSelector('.export-section', { timeout: 15000 });

    // admin 應看到全部 6 個匯出按鈕
    await expect(page.locator('.export-card')).toHaveCount(6);
    await takeScreenshot(page, '27-admin-all-export-cards');
  });
});
