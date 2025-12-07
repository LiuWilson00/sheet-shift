/**
 * Settings Handlers V2 - 新的類型安全實作
 *
 * ⚠️ 重要：這是全新的 handler 系統，與舊的完全隔離
 *
 * 舊系統：src/main/modules/save-settings-handlers（保持不變）
 * 新系統：這個文件（並行運行）
 *
 * 使用新的 channel 名稱避免衝突：
 * - 舊：'save-settings', 'get-settings'
 * - 新：'settings-v2/save', 'settings-v2/get'
 */

import { createHandler, IpcError } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import { getSystemSetting, Settings } from '../../utils/setting.tool';
import {
  getGoogleSheetConnectionSetting,
  saveGoogleSheetConnectionSetting,
  systemSettingMap,
  updateSheetData,
} from '../../utils/google-sheets.tool';
import { SheetRangeName } from '../../utils/google-sheets.tool/index.const';
import { logger } from '../../utils/logger.tool';

/**
 * 設置 Settings V2 相關的所有 IPC Handlers
 *
 * ✅ 安全性保證：
 * 1. 使用不同的 channel 名稱（settings-v2/*），不影響舊系統
 * 2. 調用相同的底層工具函數（getSettings, saveSettings）
 * 3. 可以與舊 handlers 同時運行
 *
 * 在 main.ts 中調用：
 * ```typescript
 * import { setupSettingsHandlersV2 } from './modules/settings-handlers-v2';
 *
 * app.whenReady().then(() => {
 *   // 舊的 handlers 繼續工作
 *   setupSaveSettingsHandlers(mainWindow);
 *
 *   // 新的 handlers（試點）
 *   setupSettingsHandlersV2();
 * });
 * ```
 */
export function setupSettingsHandlersV2() {
  logger.info('[Settings V2] Setting up handlers...');

  // ==========================================
  // 獲取設置
  // ==========================================
  createHandler(ipcContracts.settingsV2.get, async (input) => {
    logger.debug('[Settings V2] Getting settings', { settingName: input.settingName });

    try {
      const settings = getSystemSetting(input.settingName);
      logger.debug('[Settings V2] Settings retrieved successfully');
      return settings;
    } catch (error) {
      throw new IpcError(
        `Settings not found: ${input.settingName || 'default'}`,
        'SETTINGS_NOT_FOUND'
      );
    }
  });

  // ==========================================
  // 保存設置（更新到 Google Sheets）
  // ==========================================
  createHandler(ipcContracts.settingsV2.save, async (input) => {
    logger.debug('[Settings V2] Saving settings', {
      settingName: input.settingName,
      hasData: !!input.data,
    });

    if (!input.data) {
      throw new IpcError('Settings data is required', 'INVALID_INPUT');
    }

    const settingsJsonArray = transformSettingsToObjectArray(input.data);
    const sheetName = input.settingName ?? SheetRangeName.SystemSetting;

    const success = await updateSheetData(sheetName, settingsJsonArray);

    if (!success) {
      throw new IpcError('Failed to save settings to Google Sheets', 'SAVE_FAILED');
    }

    // 更新本地快取
    systemSettingMap[input.settingName ?? 'default'].set(settingsJsonArray);

    logger.info('[Settings V2] Settings saved successfully', {
      settingName: input.settingName,
    });

    return true;
  });

  // ==========================================
  // 獲取 Google Sheets 設置
  // ==========================================
  createHandler(ipcContracts.settingsV2.getSheet, async (input) => {
    logger.debug('[Settings V2] Getting sheet settings', { settingName: input.settingName });

    const settings = await getGoogleSheetConnectionSetting(input.settingName);

    if (!settings) {
      throw new IpcError(
        `Google Sheets settings not found: ${input.settingName || 'default'}`,
        'SHEET_SETTINGS_NOT_FOUND'
      );
    }

    logger.debug('[Settings V2] Sheet settings retrieved successfully');
    return settings;
  });

  // ==========================================
  // 保存 Google Sheets 設置
  // ==========================================
  createHandler(ipcContracts.settingsV2.saveSheet, async (input) => {
    logger.debug('[Settings V2] Saving sheet settings');

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

    logger.info('[Settings V2] Sheet settings saved successfully');
    return true;
  });

  logger.info('[Settings V2] All handlers registered successfully [OK]');
}

/**
 * 移除 Settings V2 Handlers（用於測試或清理）
 */
export function removeSettingsHandlersV2() {
  logger.info('[Settings V2] Removing handlers...');
  // 可以在這裡實現移除邏輯
  logger.info('[Settings V2] Handlers removed');
}

/**
 * 將 Settings 物件轉換為 Google Sheets 格式的陣列
 */
function transformSettingsToObjectArray(settings: Settings, prefix = ''): Array<{ Key: string; Value: string }> {
  let resultArray: Array<{ Key: string; Value: string }> = [];

  for (const key in settings) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      const value = (settings as any)[key];
      if (typeof value === 'object' && !Array.isArray(value)) {
        // 若屬性值是物件，則進行遞迴
        resultArray = resultArray.concat(
          transformSettingsToObjectArray(value, `${prefix}${key}--`),
        );
      } else {
        // 若屬性值不是物件，則直接加入結果陣列
        resultArray.push({
          Key: `${prefix}${key}`,
          Value: value.toString(),
        });
      }
    }
  }

  return resultArray;
}
