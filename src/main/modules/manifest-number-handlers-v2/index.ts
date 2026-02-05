/**
 * Manifest Number Handlers V2 - 艙單編號 IPC 處理器
 *
 * 提供艙單編號設定的 CRUD 和編號產生操作
 * - 取得所有設定
 * - 儲存設定
 * - 刪除設定
 * - 產生艙單編號
 * - 驗證艙單編號格式
 */

import { createHandler, IpcError } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import {
  manifestNumberConfigSheet,
  updateSheetData,
  initGoogleSheetData,
  client,
} from '../../utils/google-sheets.tool';
import {
  ManifestNumberConfigSheet,
  ManifestNumberConfigColumnKeys,
} from '../../utils/google-sheets.tool/index.interface';
import { SheetRangeName } from '../../utils/google-sheets.tool/index.const';
import { logger } from '../../utils/logger.tool';
import type {
  ManifestNumberConfig,
  ManifestNumberFormat,
  BlacklistRule,
  ApplyManifestNumberOutput,
  ManifestNumberValidation,
} from '../../../shared/manifest-number.types';

/**
 * 將 Google Sheets 格式轉換為應用程式格式
 */
function toManifestNumberConfig(
  sheet: ManifestNumberConfigSheet,
): ManifestNumberConfig {
  let format: ManifestNumberFormat = { segments: [] };
  let blacklist: BlacklistRule = { ranges: [], singles: [] };

  try {
    const formatStr = sheet[ManifestNumberConfigColumnKeys.FormatDefinition];
    if (formatStr) {
      format = JSON.parse(formatStr);
    }
  } catch (e) {
    logger.warn('[ManifestNumber V2] Failed to parse format definition', {
      settingName: sheet[ManifestNumberConfigColumnKeys.SettingName],
    });
  }

  try {
    const blacklistStr = sheet[ManifestNumberConfigColumnKeys.BlacklistRule];
    if (blacklistStr) {
      blacklist = JSON.parse(blacklistStr);
    }
  } catch (e) {
    logger.warn('[ManifestNumber V2] Failed to parse blacklist rule', {
      settingName: sheet[ManifestNumberConfigColumnKeys.SettingName],
    });
  }

  return {
    settingName: sheet[ManifestNumberConfigColumnKeys.SettingName] || '',
    format,
    blacklist,
    currentNumber:
      sheet[ManifestNumberConfigColumnKeys.CurrentNumber] || undefined,
    createdAt: sheet[ManifestNumberConfigColumnKeys.CreatedAt] || undefined,
    updatedAt: sheet[ManifestNumberConfigColumnKeys.UpdatedAt] || undefined,
  };
}

/**
 * 將應用程式格式轉換為 Google Sheets 格式
 */
function toSheetFormat(
  config: ManifestNumberConfig,
): ManifestNumberConfigSheet {
  const now = new Date().toISOString();

  return {
    [ManifestNumberConfigColumnKeys.SettingName]: config.settingName,
    [ManifestNumberConfigColumnKeys.FormatDefinition]: JSON.stringify(
      config.format,
    ),
    [ManifestNumberConfigColumnKeys.BlacklistRule]: JSON.stringify(
      config.blacklist,
    ),
    [ManifestNumberConfigColumnKeys.CurrentNumber]: config.currentNumber || '',
    [ManifestNumberConfigColumnKeys.CreatedAt]: config.createdAt || now,
    [ManifestNumberConfigColumnKeys.UpdatedAt]: now,
  };
}

/**
 * 產生初始編號（根據格式定義）
 */
export function generateFirstNumber(format: ManifestNumberFormat): string {
  return format.segments
    .map((seg) => {
      if (seg.type === 'alpha') {
        return 'A'.repeat(seg.length);
      }
      return '0'.repeat(seg.length);
    })
    .join('');
}

/**
 * 遞增編號
 */
export function incrementNumber(
  current: string,
  format: ManifestNumberFormat,
): string | null {
  const chars = current.split('');

  // 從右到左處理每個區段
  let charIndex = chars.length - 1;

  // eslint-disable-next-line no-plusplus
  for (let segIndex = format.segments.length - 1; segIndex >= 0; segIndex--) {
    const seg = format.segments[segIndex];
    const segEndIndex = charIndex;
    const segStartIndex = charIndex - seg.length + 1;

    // 嘗試遞增此區段
    // eslint-disable-next-line no-plusplus
    for (let i = segEndIndex; i >= segStartIndex; i--) {
      if (seg.type === 'numeric') {
        if (chars[i] !== '9') {
          chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
          // 將右邊的數字歸零
          // eslint-disable-next-line no-plusplus
          for (let j = i + 1; j <= segEndIndex; j++) {
            chars[j] = '0';
          }
          return chars.join('');
        }
        chars[i] = '0';
      } else {
        // alpha
        if (chars[i] !== 'Z') {
          chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
          // 將右邊的字母歸 A
          // eslint-disable-next-line no-plusplus
          for (let j = i + 1; j <= segEndIndex; j++) {
            if (format.segments[segIndex].type === 'alpha') {
              chars[j] = 'A';
            } else {
              chars[j] = '0';
            }
          }
          return chars.join('');
        }
        chars[i] = 'A';
      }
    }

    charIndex = segStartIndex - 1;
  }

  // 所有位數都已達最大值，無法再遞增
  return null;
}

/**
 * 檢查編號是否在黑名單中
 */
export function isBlacklisted(number: string, blacklist: BlacklistRule): boolean {
  // 檢查單個排除
  if (blacklist.singles.includes(number)) {
    return true;
  }

  // 檢查區間排除
  return blacklist.ranges.some(
    (range) => number >= range.start && number <= range.end,
  );
}

/**
 * 產生下一個有效編號（跳過黑名單）
 */
export function getNextValidNumber(
  current: string,
  format: ManifestNumberFormat,
  blacklist: BlacklistRule,
): { number: string; skipped: string[] } | null {
  let next: string | null = current;
  const skipped: string[] = [];

  // 最多嘗試 10000 次避免無限迴圈
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < 10000; i++) {
    next = incrementNumber(next, format);

    if (!next) {
      // 已達最大值
      return null;
    }

    if (!isBlacklisted(next, blacklist)) {
      return { number: next, skipped };
    }

    skipped.push(next);
  }

  // 嘗試次數過多
  return null;
}

/**
 * 設置 Manifest Number V2 相關的所有 IPC Handlers
 */
// eslint-disable-next-line import/prefer-default-export
export function setupManifestNumberHandlersV2() {
  logger.info('[ManifestNumber V2] Setting up handlers...');

  // ==========================================
  // 取得所有艙單編號設定
  // ==========================================
  createHandler(ipcContracts.manifestNumber.getConfigs, async () => {
    logger.debug('[ManifestNumber V2] Getting all configs');

    const data = manifestNumberConfigSheet.get();
    const result = data.map(toManifestNumberConfig);

    logger.debug('[ManifestNumber V2] Retrieved configs', {
      count: result.length,
    });

    return result;
  });

  // ==========================================
  // 取得單一艙單編號設定
  // ==========================================
  createHandler(ipcContracts.manifestNumber.getConfig, async (input) => {
    logger.debug('[ManifestNumber V2] Getting config', {
      settingName: input.settingName,
    });

    const data = manifestNumberConfigSheet.get();
    const found = data.find(
      (item) =>
        item[ManifestNumberConfigColumnKeys.SettingName] === input.settingName,
    );

    if (!found) {
      logger.debug('[ManifestNumber V2] Config not found', {
        settingName: input.settingName,
      });
      return null;
    }

    return toManifestNumberConfig(found);
  });

  // ==========================================
  // 儲存艙單編號設定（新增或更新）
  // ==========================================
  createHandler(ipcContracts.manifestNumber.saveConfig, async (input) => {
    logger.debug('[ManifestNumber V2] Saving config', {
      settingName: input.settingName,
    });

    if (!input.settingName) {
      throw new IpcError('Setting name is required', 'INVALID_INPUT');
    }

    const currentData = manifestNumberConfigSheet.get();
    const existingIndex = currentData.findIndex(
      (item) =>
        item[ManifestNumberConfigColumnKeys.SettingName] === input.settingName,
    );

    const sheetData = toSheetFormat(input);

    let newData: ManifestNumberConfigSheet[];
    if (existingIndex >= 0) {
      // 更新現有設定
      newData = [...currentData];
      newData[existingIndex] = {
        ...sheetData,
        [ManifestNumberConfigColumnKeys.CreatedAt]:
          currentData[existingIndex][ManifestNumberConfigColumnKeys.CreatedAt],
      };
    } else {
      // 新增設定
      newData = [...currentData, sheetData];
    }

    const success = await updateSheetData(
      SheetRangeName.ManifestNumberConfig,
      newData,
    );

    if (!success) {
      throw new IpcError(
        'Failed to save manifest number config to Google Sheets',
        'SAVE_FAILED',
      );
    }

    // 更新本地快取
    manifestNumberConfigSheet.set(newData);

    logger.info('[ManifestNumber V2] Config saved successfully', {
      settingName: input.settingName,
      isUpdate: existingIndex >= 0,
    });

    return true;
  });

  // ==========================================
  // 刪除艙單編號設定
  // ==========================================
  createHandler(ipcContracts.manifestNumber.deleteConfig, async (input) => {
    logger.debug('[ManifestNumber V2] Deleting config', {
      settingName: input.settingName,
    });

    const currentData = manifestNumberConfigSheet.get();
    const newData = currentData.filter(
      (item) =>
        item[ManifestNumberConfigColumnKeys.SettingName] !== input.settingName,
    );

    if (newData.length === currentData.length) {
      logger.warn('[ManifestNumber V2] Config not found for deletion', {
        settingName: input.settingName,
      });
      return false;
    }

    const success = await updateSheetData(
      SheetRangeName.ManifestNumberConfig,
      newData,
    );

    if (!success) {
      throw new IpcError(
        'Failed to delete manifest number config from Google Sheets',
        'DELETE_FAILED',
      );
    }

    // 更新本地快取
    manifestNumberConfigSheet.set(newData);

    logger.info('[ManifestNumber V2] Config deleted successfully', {
      settingName: input.settingName,
    });

    return true;
  });

  // ==========================================
  // 產生艙單編號
  // ==========================================
  createHandler(ipcContracts.manifestNumber.generate, async (input) => {
    logger.debug('[ManifestNumber V2] Generating manifest numbers', {
      configName: input.configName,
      count: input.count,
      startFrom: input.startFrom,
    });

    if (!input.configName || input.count <= 0) {
      throw new IpcError('Config name and count are required', 'INVALID_INPUT');
    }

    const configData = manifestNumberConfigSheet.get();
    const configSheet = configData.find(
      (item) =>
        item[ManifestNumberConfigColumnKeys.SettingName] === input.configName,
    );

    if (!configSheet) {
      throw new IpcError(
        `Config not found: ${input.configName}`,
        'CONFIG_NOT_FOUND',
      );
    }

    const config = toManifestNumberConfig(configSheet);

    // 決定起始編號
    const startNumber =
      input.startFrom ||
      config.currentNumber ||
      generateFirstNumber(config.format);

    const numbers: string[] = [];
    const allSkipped: string[] = [];
    let current = startNumber;

    // 第一個編號
    if (!isBlacklisted(current, config.blacklist)) {
      numbers.push(current);
    } else {
      allSkipped.push(current);
      const next = getNextValidNumber(current, config.format, config.blacklist);
      if (!next) {
        throw new IpcError(
          'Cannot generate numbers: reached maximum',
          'GENERATION_FAILED',
        );
      }
      current = next.number;
      allSkipped.push(...next.skipped);
      numbers.push(current);
    }

    // 產生剩餘編號
    // eslint-disable-next-line no-plusplus
    for (let i = 1; i < input.count; i++) {
      const next = getNextValidNumber(current, config.format, config.blacklist);
      if (!next) {
        throw new IpcError(
          `Cannot generate ${input.count} numbers: reached maximum at ${i}`,
          'GENERATION_FAILED',
        );
      }
      current = next.number;
      allSkipped.push(...next.skipped);
      numbers.push(current);
    }

    const result: ApplyManifestNumberOutput = {
      numbers,
      endAt: current,
      skipped: allSkipped,
    };

    logger.info('[ManifestNumber V2] Numbers generated successfully', {
      configName: input.configName,
      count: numbers.length,
      endAt: current,
      skippedCount: allSkipped.length,
    });

    return result;
  });

  // ==========================================
  // 驗證艙單編號格式
  // ==========================================
  createHandler(ipcContracts.manifestNumber.validate, async (input) => {
    logger.debug('[ManifestNumber V2] Validating number', {
      number: input.number,
      settingName: input.settingName,
    });

    const configData = manifestNumberConfigSheet.get();
    const configSheet = configData.find(
      (item) =>
        item[ManifestNumberConfigColumnKeys.SettingName] === input.settingName,
    );

    if (!configSheet) {
      return {
        isValid: false,
        error: `找不到設定: ${input.settingName}`,
      } as ManifestNumberValidation;
    }

    const config = toManifestNumberConfig(configSheet);

    // 計算預期長度
    const expectedLength = config.format.segments.reduce(
      (sum, seg) => sum + seg.length,
      0,
    );

    if (input.number.length !== expectedLength) {
      return {
        isValid: false,
        error: `編號長度不正確，預期 ${expectedLength} 位，實際 ${input.number.length} 位`,
      } as ManifestNumberValidation;
    }

    // 驗證每個區段
    let charIndex = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const seg of config.format.segments) {
      const segValue = input.number.substring(
        charIndex,
        charIndex + seg.length,
      );

      if (seg.type === 'alpha') {
        if (!/^[A-Z]+$/.test(segValue)) {
          return {
            isValid: false,
            error: `區段 "${segValue}" 應為英文大寫字母`,
          } as ManifestNumberValidation;
        }
      } else if (!/^[0-9]+$/.test(segValue)) {
        return {
          isValid: false,
          error: `區段 "${segValue}" 應為數字`,
        } as ManifestNumberValidation;
      }

      charIndex += seg.length;
    }

    // 檢查是否在黑名單中
    if (isBlacklisted(input.number, config.blacklist)) {
      return {
        isValid: false,
        error: '此編號在黑名單中',
      } as ManifestNumberValidation;
    }

    return {
      isValid: true,
    } as ManifestNumberValidation;
  });

  // ==========================================
  // 更新當前編號
  // ==========================================
  createHandler(
    ipcContracts.manifestNumber.updateCurrentNumber,
    async (input) => {
      logger.debug('[ManifestNumber V2] Updating current number', {
        settingName: input.settingName,
        currentNumber: input.currentNumber,
      });

      const currentData = manifestNumberConfigSheet.get();
      const index = currentData.findIndex(
        (item) =>
          item[ManifestNumberConfigColumnKeys.SettingName] ===
          input.settingName,
      );

      if (index < 0) {
        throw new IpcError(
          `Config not found: ${input.settingName}`,
          'CONFIG_NOT_FOUND',
        );
      }

      const now = new Date().toISOString();
      const newData = [...currentData];
      newData[index] = {
        ...newData[index],
        [ManifestNumberConfigColumnKeys.CurrentNumber]: input.currentNumber,
        [ManifestNumberConfigColumnKeys.UpdatedAt]: now,
      };

      const success = await updateSheetData(
        SheetRangeName.ManifestNumberConfig,
        newData,
      );

      if (!success) {
        throw new IpcError(
          'Failed to update current number in Google Sheets',
          'UPDATE_FAILED',
        );
      }

      // 更新本地快取
      manifestNumberConfigSheet.set(newData);

      logger.info('[ManifestNumber V2] Current number updated successfully', {
        settingName: input.settingName,
        currentNumber: input.currentNumber,
      });

      return true;
    },
  );

  // ==========================================
  // 重新載入艙單編號設定
  // ==========================================
  createHandler(ipcContracts.manifestNumber.reload, async () => {
    logger.debug('[ManifestNumber V2] Reloading manifest number configs');

    const cl = client.get();
    if (!cl) {
      throw new IpcError(
        'Google Sheets client not initialized',
        'NOT_INITIALIZED',
      );
    }

    const success = await initGoogleSheetData(cl);

    if (!success) {
      throw new IpcError(
        'Failed to reload data from Google Sheets',
        'RELOAD_FAILED',
      );
    }

    logger.info('[ManifestNumber V2] Configs reloaded successfully');
    return true;
  });

  logger.info('[ManifestNumber V2] All handlers registered successfully [OK]');
}
