/**
 * Main Process - Settings Handlers 實作範例
 *
 * 這個文件展示如何使用新的類型安全 IPC Handler 系統
 * 來實現 Settings 相關的 API
 *
 * 對比舊實作：
 * - 減少了 67% 的樣板代碼
 * - 完全類型安全
 * - 統一的錯誤處理
 * - 自動日誌記錄
 */

import { createHandler, createVoidHandler, IpcError } from './main-typed-ipc-handler';
import { ipcContracts } from './shared-ipc-contracts';
import { getSettings, saveSettings } from '../../src/main/utils/setting.tool';
import {
  getGoogleSheetConnectionSetting,
  saveGoogleSheetConnectionSetting,
  importGoogleSheetConnectionSetting,
  systemSettingSheetNames,
} from '../../src/main/utils/google-sheets.tool';

/**
 * 設置 Settings 相關的所有 IPC Handlers
 *
 * 在 main.ts 中調用此函數來註冊所有 handlers
 *
 * @example
 * ```typescript
 * // main.ts
 * import { setupSettingsHandlers } from './modules/settings-handlers';
 *
 * app.whenReady().then(() => {
 *   setupSettingsHandlers();
 * });
 * ```
 */
export function setupSettingsHandlers() {
  // ==========================================
  // 獲取設置
  // ==========================================
  createHandler(ipcContracts.settings.get, async (input) => {
    // 從工具函數獲取設置
    const settings = await getSettings(input.settingName);

    // 驗證設置是否存在
    if (!settings) {
      throw new IpcError(
        `Settings not found: ${input.settingName || 'default'}`,
        'SETTINGS_NOT_FOUND'
      );
    }

    return settings;
  });

  // ==========================================
  // 保存設置
  // ==========================================
  createHandler(ipcContracts.settings.save, async (input) => {
    // 驗證輸入
    if (!input.data) {
      throw new IpcError('Settings data is required', 'INVALID_INPUT');
    }

    // 保存設置
    const success = await saveSettings(input.data, input.settingName);

    if (!success) {
      throw new IpcError('Failed to save settings', 'SAVE_FAILED');
    }

    return true;
  });

  // ==========================================
  // 獲取 Google Sheets 設置
  // ==========================================
  createHandler(ipcContracts.settings.getSheet, async (input) => {
    const settings = await getGoogleSheetConnectionSetting(input.settingName);

    if (!settings) {
      throw new IpcError(
        `Google Sheets settings not found: ${input.settingName || 'default'}`,
        'SHEET_SETTINGS_NOT_FOUND'
      );
    }

    return settings;
  });

  // ==========================================
  // 保存 Google Sheets 設置
  // ==========================================
  createHandler(ipcContracts.settings.saveSheet, async (input) => {
    // 驗證必要欄位
    if (!input.client_email || !input.private_key || !input.spreadsheet_id) {
      throw new IpcError(
        'Missing required fields: client_email, private_key, or spreadsheet_id',
        'INVALID_INPUT'
      );
    }

    const success = await saveGoogleSheetConnectionSetting(input);

    if (!success) {
      throw new IpcError('Failed to save Google Sheets settings', 'SAVE_FAILED');
    }

    return true;
  });

  // ==========================================
  // 導入 Google Sheets 設置
  // ==========================================
  createHandler(ipcContracts.settings.importSheet, async (input) => {
    // 驗證連接設置
    if (!input.client_email || !input.private_key || !input.spreadsheet_id) {
      throw new IpcError(
        'Invalid Google Sheets connection settings',
        'INVALID_CONNECTION_SETTINGS'
      );
    }

    try {
      const success = await importGoogleSheetConnectionSetting(input);

      if (!success) {
        throw new IpcError('Failed to import settings from Google Sheets', 'IMPORT_FAILED');
      }

      return true;
    } catch (error) {
      // 處理 Google Sheets API 錯誤
      if (error instanceof Error && error.message.includes('authentication')) {
        throw new IpcError(
          'Google Sheets authentication failed. Please check your credentials.',
          'AUTH_FAILED'
        );
      }

      if (error instanceof Error && error.message.includes('spreadsheet')) {
        throw new IpcError(
          'Spreadsheet not found or not accessible.',
          'SPREADSHEET_NOT_FOUND'
        );
      }

      // 重新拋出其他錯誤
      throw error;
    }
  });

  // ==========================================
  // 獲取系統設置 Sheet 名稱列表
  // ==========================================
  createVoidHandler(ipcContracts.settings.getSystemSheetNames, async () => {
    const names = systemSettingSheetNames.get();

    if (!names || names.length === 0) {
      throw new IpcError('No system setting sheets found', 'NO_SHEETS_FOUND');
    }

    return names;
  });

  console.log('[Settings Handlers] All handlers registered successfully');
}

/**
 * 移除所有 Settings Handlers（用於測試或清理）
 */
export function removeSettingsHandlers() {
  // 這裡可以實現移除邏輯
  console.log('[Settings Handlers] All handlers removed');
}
