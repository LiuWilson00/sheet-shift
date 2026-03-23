/**
 * Manifest Number Handlers V2 - 艙單編號 IPC 處理器
 *
 * 提供艙單編號設定的 CRUD 和編號產生操作
 * - 取得所有設定
 * - 儲存設定
 * - 刪除設定
 * - 產生艙單編號（支援多組格式循環）
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
  FormatGroup,
  CurrentProgress,
  ApplyManifestNumberOutput,
  ManifestNumberValidation,
} from '../../../shared/manifest-number.types';

/**
 * 將 Google Sheets 格式轉換為應用程式格式
 */
function toManifestNumberConfig(
  sheet: ManifestNumberConfigSheet,
): ManifestNumberConfig {
  let formats: ManifestNumberFormat[] = [];
  let blacklists: BlacklistRule[] = [];
  let currentProgress: CurrentProgress | undefined;

  // 解析格式定義（陣列）
  try {
    const formatStr = sheet[ManifestNumberConfigColumnKeys.FormatDefinition];
    if (formatStr) {
      formats = JSON.parse(formatStr);
    }
  } catch (e) {
    logger.warn('[ManifestNumber V2] Failed to parse format definition', {
      settingName: sheet[ManifestNumberConfigColumnKeys.SettingName],
    });
  }

  // 解析黑名單規則（陣列）
  try {
    const blacklistStr = sheet[ManifestNumberConfigColumnKeys.BlacklistRule];
    if (blacklistStr) {
      blacklists = JSON.parse(blacklistStr);
    }
  } catch (e) {
    logger.warn('[ManifestNumber V2] Failed to parse blacklist rule', {
      settingName: sheet[ManifestNumberConfigColumnKeys.SettingName],
    });
  }

  // 解析當前進度（JSON 物件）
  try {
    const progressStr = sheet[ManifestNumberConfigColumnKeys.CurrentNumber];
    if (progressStr) {
      currentProgress = JSON.parse(progressStr);
    }
  } catch (e) {
    logger.warn('[ManifestNumber V2] Failed to parse current progress', {
      settingName: sheet[ManifestNumberConfigColumnKeys.SettingName],
    });
  }

  // 組合 formatGroups
  const formatGroups: FormatGroup[] = formats.map((format, i) => ({
    format,
    blacklist: blacklists[i] || { ranges: [], singles: [] },
  }));

  // 至少要有一組預設
  if (formatGroups.length === 0) {
    formatGroups.push({
      format: { segments: [] },
      blacklist: { ranges: [], singles: [] },
    });
  }

  return {
    settingName: sheet[ManifestNumberConfigColumnKeys.SettingName] || '',
    formatGroups,
    currentProgress,
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
      config.formatGroups.map((g) => g.format),
    ),
    [ManifestNumberConfigColumnKeys.BlacklistRule]: JSON.stringify(
      config.formatGroups.map((g) => g.blacklist),
    ),
    [ManifestNumberConfigColumnKeys.CurrentNumber]: config.currentProgress
      ? JSON.stringify(config.currentProgress)
      : '',
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
export function isBlacklisted(
  number: string,
  blacklist: BlacklistRule,
): boolean {
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
 * 檢查編號的數字區段是否全為 0
 *
 * 例如格式 [alpha:2, numeric:2]：
 * - AB00 → 數字部分 "00" = 0 → true
 * - AA10 → 數字部分 "10" ≠ 0 → false
 */
function hasAllZeroNumericSegments(
  number: string,
  format: ManifestNumberFormat,
): boolean {
  let pos = 0;
  // eslint-disable-next-line no-restricted-syntax
  for (const seg of format.segments) {
    const part = number.substring(pos, pos + seg.length);
    pos += seg.length;
    if (seg.type === 'numeric' && Number(part) !== 0) {
      return false;
    }
  }
  return true;
}

/**
 * 檢查編號是否應被跳過（黑名單或數字區段為 0）
 */
export function shouldSkipNumber(
  number: string,
  blacklist: BlacklistRule,
  skipZeroNumbers: boolean,
  format?: ManifestNumberFormat,
): boolean {
  if (isBlacklisted(number, blacklist)) return true;
  if (skipZeroNumbers && format && hasAllZeroNumericSegments(number, format)) {
    return true;
  }
  return false;
}

/**
 * 產生下一個有效編號（跳過黑名單及數值 0）
 *
 * 當編號落在黑名單範圍內時，直接跳到範圍結尾的下一個編號，
 * 避免逐一遞增導致大範圍黑名單（如 44,000+ 筆）超過迭代上限。
 */
export function getNextValidNumber(
  current: string,
  format: ManifestNumberFormat,
  blacklist: BlacklistRule,
  skipZeroNumbers: boolean = false,
): { number: string; skipped: string[] } | null {
  let next: string | null = incrementNumber(current, format);
  if (!next) return null;

  const skipped: string[] = [];

  // 安全上限：基於黑名單結構的合理上限，防止無限迴圈
  const maxAttempts =
    blacklist.ranges.length + blacklist.singles.length + 1000;
  let attempts = 0;

  while (attempts < maxAttempts) {
    // 檢查是否落在黑名單範圍內 → 直接跳到範圍結尾的下一個編號
    const matchedRange = blacklist.ranges.find(
      (r) => next! >= r.start && next! <= r.end,
    );

    if (matchedRange) {
      // 直接跳過整個範圍，不逐一遞增
      next = incrementNumber(matchedRange.end, format);
      if (!next) return null;
      // eslint-disable-next-line no-plusplus
      attempts++;
      // eslint-disable-next-line no-continue
      continue;
    }

    // 不在範圍黑名單內，檢查單一排除和零值
    if (!shouldSkipNumber(next, blacklist, skipZeroNumbers, format)) {
      return { number: next, skipped };
    }

    // 在單一排除或零值編號中，正常遞增
    skipped.push(next);
    next = incrementNumber(next, format);
    if (!next) return null;
    // eslint-disable-next-line no-plusplus
    attempts++;
  }

  // 所有嘗試都已用盡
  return null;
}

/**
 * 跨組取得下一個有效編號
 * 當前組用完時自動跳到下一組，循環回起始組時停止
 */
function getNextValidNumberAcrossGroups(
  current: string,
  currentGroupIndex: number,
  formatGroups: FormatGroup[],
  skipZeroNumbers: boolean,
  startGroupIndex: number,
): { number: string; groupIndex: number; skipped: string[] } | null {
  const allSkipped: string[] = [];

  // 先嘗試在當前組取得下一個
  const group = formatGroups[currentGroupIndex];
  const nextInGroup = getNextValidNumber(
    current,
    group.format,
    group.blacklist,
    skipZeroNumbers,
  );

  if (nextInGroup) {
    return {
      number: nextInGroup.number,
      groupIndex: currentGroupIndex,
      skipped: nextInGroup.skipped,
    };
  }

  // 當前組已用完，嘗試下一組
  let nextGroupIndex = (currentGroupIndex + 1) % formatGroups.length;

  // 最多嘗試所有組（回到起始組就停止）
  while (nextGroupIndex !== startGroupIndex) {
    const nextGroup = formatGroups[nextGroupIndex];
    const firstNumber = generateFirstNumber(nextGroup.format);

    // 檢查第一個編號是否可用
    if (
      !shouldSkipNumber(
        firstNumber,
        nextGroup.blacklist,
        skipZeroNumbers,
        nextGroup.format,
      )
    ) {
      return {
        number: firstNumber,
        groupIndex: nextGroupIndex,
        skipped: allSkipped,
      };
    }

    allSkipped.push(firstNumber);

    // 嘗試從第一個編號往下找
    const nextValid = getNextValidNumber(
      firstNumber,
      nextGroup.format,
      nextGroup.blacklist,
      skipZeroNumbers,
    );

    if (nextValid) {
      allSkipped.push(...nextValid.skipped);
      return {
        number: nextValid.number,
        groupIndex: nextGroupIndex,
        skipped: allSkipped,
      };
    }

    // 這組也用完了，繼續下一組
    nextGroupIndex = (nextGroupIndex + 1) % formatGroups.length;
  }

  // 繞回起始組，嘗試從頭開始（循環）
  const startGroup = formatGroups[startGroupIndex];
  const firstNumber = generateFirstNumber(startGroup.format);

  if (
    !shouldSkipNumber(
      firstNumber,
      startGroup.blacklist,
      skipZeroNumbers,
      startGroup.format,
    )
  ) {
    return {
      number: firstNumber,
      groupIndex: startGroupIndex,
      skipped: allSkipped,
    };
  }

  allSkipped.push(firstNumber);

  const nextValid = getNextValidNumber(
    firstNumber,
    startGroup.format,
    startGroup.blacklist,
    skipZeroNumbers,
  );

  if (nextValid) {
    allSkipped.push(...nextValid.skipped);
    return {
      number: nextValid.number,
      groupIndex: startGroupIndex,
      skipped: allSkipped,
    };
  }

  // 所有格式群組都已用盡
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
  // 產生艙單編號（支援多組格式循環）
  // ==========================================
  createHandler(ipcContracts.manifestNumber.generate, async (input) => {
    logger.debug('[ManifestNumber V2] Generating manifest numbers', {
      configName: input.configName,
      count: input.count,
      startFrom: input.startFrom,
      startGroupIndex: input.startGroupIndex,
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
    const skipZero = input.skipZeroNumbers ?? false;
    const { formatGroups } = config;

    if (formatGroups.length === 0) {
      throw new IpcError('No format groups defined', 'INVALID_CONFIG');
    }

    // 決定起始群組與編號
    let currentGroupIndex: number;
    let current: string;

    if (input.startFrom) {
      // 使用自訂起始編號
      currentGroupIndex = input.startGroupIndex ?? 0;
      if (currentGroupIndex < 0 || currentGroupIndex >= formatGroups.length) {
        throw new IpcError(
          `群組索引超出範圍：${currentGroupIndex}`,
          'INVALID_GROUP_INDEX',
        );
      }

      // 驗證 startFrom 格式
      const group = formatGroups[currentGroupIndex];
      const expectedLength = group.format.segments.reduce(
        (sum, seg) => sum + seg.length,
        0,
      );
      if (input.startFrom.length !== expectedLength) {
        throw new IpcError(
          `起始編號長度不符，預期 ${expectedLength} 位`,
          'INVALID_START_NUMBER',
        );
      }
      let pos = 0;
      // eslint-disable-next-line no-restricted-syntax
      for (const seg of group.format.segments) {
        const part = input.startFrom.substring(pos, pos + seg.length);
        pos += seg.length;
        const segStart = pos - seg.length + 1;
        if (seg.type === 'alpha' && !/^[A-Z]+$/.test(part)) {
          throw new IpcError(
            `起始編號格式錯誤：位置 ${segStart}-${pos} 應為英文大寫`,
            'INVALID_START_NUMBER',
          );
        }
        if (seg.type === 'numeric' && !/^[0-9]+$/.test(part)) {
          throw new IpcError(
            `起始編號格式錯誤：位置 ${segStart}-${pos} 應為數字`,
            'INVALID_START_NUMBER',
          );
        }
      }

      current = input.startFrom;
    } else if (config.currentProgress) {
      // 使用上次進度
      currentGroupIndex = config.currentProgress.groupIndex;
      if (currentGroupIndex >= formatGroups.length) {
        currentGroupIndex = 0;
      }
      current = config.currentProgress.number;
    } else {
      // 首次產生：使用第一組的初始編號
      currentGroupIndex = 0;
      current = generateFirstNumber(formatGroups[0].format);
    }

    const numbers: string[] = [];
    const allSkipped: string[] = [];
    const startGroupIndex = currentGroupIndex;

    // 產生編號（支援跨組循環）
    const hasLastUsed = !!input.startFrom || !!config.currentProgress;

    if (hasLastUsed) {
      // 從上次編號的下一個開始
      const result = getNextValidNumberAcrossGroups(
        current,
        currentGroupIndex,
        formatGroups,
        skipZero,
        startGroupIndex,
      );
      if (!result) {
        throw new IpcError(
          '無法產生編號：所有格式群組已用盡',
          'GENERATION_FAILED',
        );
      }
      current = result.number;
      currentGroupIndex = result.groupIndex;
      allSkipped.push(...result.skipped);
      numbers.push(current);
    } else {
      // 首次產生：檢查初始編號是否需要跳過
      const group = formatGroups[currentGroupIndex];
      if (!shouldSkipNumber(current, group.blacklist, skipZero, group.format)) {
        numbers.push(current);
      } else {
        allSkipped.push(current);
        const result = getNextValidNumberAcrossGroups(
          current,
          currentGroupIndex,
          formatGroups,
          skipZero,
          startGroupIndex,
        );
        if (!result) {
          throw new IpcError(
            '無法產生編號：所有格式群組已用盡',
            'GENERATION_FAILED',
          );
        }
        current = result.number;
        currentGroupIndex = result.groupIndex;
        allSkipped.push(...result.skipped);
        numbers.push(current);
      }
    }

    // 產生剩餘編號
    // eslint-disable-next-line no-plusplus
    for (let i = 1; i < input.count; i++) {
      const result = getNextValidNumberAcrossGroups(
        current,
        currentGroupIndex,
        formatGroups,
        skipZero,
        startGroupIndex,
      );
      if (!result) {
        throw new IpcError(
          `無法產生 ${input.count} 個編號：在第 ${i} 個時已用盡`,
          'GENERATION_FAILED',
        );
      }
      current = result.number;
      currentGroupIndex = result.groupIndex;
      allSkipped.push(...result.skipped);
      numbers.push(current);
    }

    const output: ApplyManifestNumberOutput = {
      numbers,
      endAt: current,
      endGroupIndex: currentGroupIndex,
      skipped: allSkipped,
    };

    logger.info('[ManifestNumber V2] Numbers generated successfully', {
      configName: input.configName,
      count: numbers.length,
      endAt: current,
      endGroupIndex: currentGroupIndex,
      skippedCount: allSkipped.length,
    });

    return output;
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

    // 逐組嘗試驗證
    // eslint-disable-next-line no-restricted-syntax
    for (const group of config.formatGroups) {
      const { format, blacklist } = group;
      const expectedLength = format.segments.reduce(
        (sum, seg) => sum + seg.length,
        0,
      );

      if (input.number.length !== expectedLength) {
        // eslint-disable-next-line no-continue
        continue;
      }

      let charIndex = 0;
      let segmentValid = true;
      // eslint-disable-next-line no-restricted-syntax
      for (const seg of format.segments) {
        const segValue = input.number.substring(
          charIndex,
          charIndex + seg.length,
        );
        if (seg.type === 'alpha' && !/^[A-Z]+$/.test(segValue)) {
          segmentValid = false;
          break;
        }
        if (seg.type === 'numeric' && !/^[0-9]+$/.test(segValue)) {
          segmentValid = false;
          break;
        }
        charIndex += seg.length;
      }

      if (!segmentValid) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // 格式匹配成功，檢查黑名單
      if (isBlacklisted(input.number, blacklist)) {
        return {
          isValid: false,
          error: '此編號在黑名單中',
        } as ManifestNumberValidation;
      }

      return { isValid: true } as ManifestNumberValidation;
    }

    // 沒有任何群組格式匹配
    return {
      isValid: false,
      error: '編號格式與所有群組皆不相符',
    } as ManifestNumberValidation;
  });

  // ==========================================
  // 更新當前進度
  // ==========================================
  createHandler(
    ipcContracts.manifestNumber.updateCurrentNumber,
    async (input) => {
      logger.debug('[ManifestNumber V2] Updating current progress', {
        settingName: input.settingName,
        groupIndex: input.groupIndex,
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
      const progress: CurrentProgress = {
        groupIndex: input.groupIndex,
        number: input.currentNumber,
      };

      const newData = [...currentData];
      newData[index] = {
        ...newData[index],
        [ManifestNumberConfigColumnKeys.CurrentNumber]:
          JSON.stringify(progress),
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

      logger.info('[ManifestNumber V2] Current progress updated successfully', {
        settingName: input.settingName,
        groupIndex: input.groupIndex,
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
