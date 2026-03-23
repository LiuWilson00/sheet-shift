/**
 * Recipient Info Handlers V2 - 收貨人資訊 IPC 處理器
 *
 * 提供收貨人資訊的 CRUD 操作
 * - 查詢所有收貨人
 * - 根據統一編號查詢
 * - 新增收貨人資訊
 * - 批量新增收貨人資訊
 */

import { createHandler, IpcError } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import {
  recipientInfoSheet,
  addSheetData,
  initGoogleSheetData,
  client,
} from '../../utils/google-sheets.tool';
import {
  RecipientInfoSheet,
  RecipientInfoColumnKeys,
} from '../../utils/google-sheets.tool/index.interface';
import { SheetRangeName } from '../../utils/google-sheets.tool/index.const';
import { logger } from '../../utils/logger.tool';
import type {
  RecipientInfo,
  RecipientInfoLookupResult,
  AddRecipientInfoInput,
} from '../../../shared/recipient-info.types';

/**
 * 將 Google Sheets 格式轉換為應用程式格式
 */
function toRecipientInfo(sheet: RecipientInfoSheet): RecipientInfo {
  return {
    艙提單號: sheet[RecipientInfoColumnKeys.ManifestNumber] || '',
    收貨人統一編號: sheet[RecipientInfoColumnKeys.TaxNumber] || '',
    收貨人英文名稱: sheet[RecipientInfoColumnKeys.EnglishName] || '',
    收貨人電話: sheet[RecipientInfoColumnKeys.Phone] || '',
    海關註記: sheet[RecipientInfoColumnKeys.CustomsNote] || '',
  };
}

/**
 * 將應用程式格式轉換為 Google Sheets 格式
 */
function toSheetFormat(input: AddRecipientInfoInput): RecipientInfoSheet {
  return {
    [RecipientInfoColumnKeys.ManifestNumber]: input.manifestNumber || '',
    [RecipientInfoColumnKeys.TaxNumber]: input.taxNumber,
    [RecipientInfoColumnKeys.EnglishName]: input.englishName || '',
    [RecipientInfoColumnKeys.Phone]: input.phone || '',
    [RecipientInfoColumnKeys.CustomsNote]: input.customsNote || '',
  };
}

/**
 * 設置 Recipient Info V2 相關的所有 IPC Handlers
 */
// eslint-disable-next-line import/prefer-default-export
export function setupRecipientInfoHandlersV2() {
  logger.info('[RecipientInfo V2] Setting up handlers...');

  // ==========================================
  // 取得所有收貨人資訊
  // ==========================================
  createHandler(ipcContracts.recipientInfo.getAll, async () => {
    logger.debug('[RecipientInfo V2] Getting all recipient info');

    const data = recipientInfoSheet.get();
    const result = data.map(toRecipientInfo);

    logger.debug('[RecipientInfo V2] Retrieved recipient info', {
      count: result.length,
    });

    return result;
  });

  // ==========================================
  // 根據統一編號查詢收貨人資訊
  // ==========================================
  createHandler(ipcContracts.recipientInfo.lookup, async (input) => {
    logger.debug('[RecipientInfo V2] Looking up recipient', {
      taxNumber: input.taxNumber,
    });

    if (!input.taxNumber) {
      throw new IpcError('Tax number is required', 'INVALID_INPUT');
    }

    const data = recipientInfoSheet.get();
    const found = data.find(
      (item) => item[RecipientInfoColumnKeys.TaxNumber] === input.taxNumber,
    );

    if (!found) {
      logger.debug('[RecipientInfo V2] Recipient not found', {
        taxNumber: input.taxNumber,
      });
      return {
        found: false,
        hasCustomsNote: false,
      } as RecipientInfoLookupResult;
    }

    const info = toRecipientInfo(found);
    const hasCustomsNote = !!info.海關註記 && info.海關註記.trim() !== '';

    logger.debug('[RecipientInfo V2] Recipient found', {
      taxNumber: input.taxNumber,
      hasCustomsNote,
    });

    return {
      found: true,
      info,
      hasCustomsNote,
    } as RecipientInfoLookupResult;
  });

  // ==========================================
  // 新增收貨人資訊
  // ==========================================
  createHandler(ipcContracts.recipientInfo.add, async (input) => {
    logger.debug('[RecipientInfo V2] Adding recipient', {
      taxNumber: input.taxNumber,
    });

    if (!input.taxNumber) {
      throw new IpcError('Tax number is required', 'INVALID_INPUT');
    }

    // 檢查是否已存在
    const existing = recipientInfoSheet
      .get()
      .find(
        (item) => item[RecipientInfoColumnKeys.TaxNumber] === input.taxNumber,
      );

    if (existing) {
      logger.warn('[RecipientInfo V2] Recipient already exists', {
        taxNumber: input.taxNumber,
      });
      // 已存在不是錯誤，只是跳過
      return true;
    }

    const sheetData = toSheetFormat(input);

    const success = await addSheetData(
      SheetRangeName.RecipientInfo,
      [sheetData],
      {
        jsonTransfromOptions: { disableAddTitle: true },
      },
    );

    if (!success) {
      throw new IpcError(
        'Failed to add recipient info to Google Sheets',
        'ADD_FAILED',
      );
    }

    // 更新本地快取
    const currentData = recipientInfoSheet.get();
    recipientInfoSheet.set([...currentData, sheetData]);

    logger.info('[RecipientInfo V2] Recipient added successfully', {
      taxNumber: input.taxNumber,
    });

    return true;
  });

  // ==========================================
  // 批量新增收貨人資訊
  // ==========================================
  createHandler(ipcContracts.recipientInfo.addBatch, async (inputs) => {
    logger.debug('[RecipientInfo V2] Adding batch recipients', {
      count: inputs.length,
    });

    if (!inputs || inputs.length === 0) {
      return true;
    }

    // 過濾掉已存在的
    const existingTaxNumbers = new Set(
      recipientInfoSheet
        .get()
        .map((item) => item[RecipientInfoColumnKeys.TaxNumber]),
    );

    const newInputs = inputs.filter(
      (input) => input.taxNumber && !existingTaxNumbers.has(input.taxNumber),
    );

    if (newInputs.length === 0) {
      logger.debug('[RecipientInfo V2] No new recipients to add');
      return true;
    }

    const sheetData = newInputs.map(toSheetFormat);

    const success = await addSheetData(
      SheetRangeName.RecipientInfo,
      sheetData,
      {
        jsonTransfromOptions: { disableAddTitle: true },
      },
    );

    if (!success) {
      throw new IpcError(
        'Failed to add batch recipient info to Google Sheets',
        'ADD_FAILED',
      );
    }

    // 更新本地快取
    const currentData = recipientInfoSheet.get();
    recipientInfoSheet.set([...currentData, ...sheetData]);

    logger.info('[RecipientInfo V2] Batch recipients added successfully', {
      addedCount: newInputs.length,
    });

    return true;
  });

  // ==========================================
  // 重新載入收貨人資訊
  // ==========================================
  createHandler(ipcContracts.recipientInfo.reload, async () => {
    logger.debug('[RecipientInfo V2] Reloading recipient info');

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

    logger.info('[RecipientInfo V2] Recipient info reloaded successfully');
    return true;
  });

  logger.info('[RecipientInfo V2] All handlers registered successfully [OK]');
}
