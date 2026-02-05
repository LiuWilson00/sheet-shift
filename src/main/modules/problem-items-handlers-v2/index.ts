/**
 * Problem Items Handlers V2 - 問題件 IPC 處理器
 *
 * 提供問題件的查詢和檢查操作
 * - 查詢所有問題件
 * - 檢查貨物名稱是否為問題件（完全匹配）
 * - 批量檢查貨物名稱
 */

import { createHandler, IpcError } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import {
  problemItemsSheet,
  initGoogleSheetData,
  client,
} from '../../utils/google-sheets.tool';
import { ProblemItemColumnKeys } from '../../utils/google-sheets.tool/index.interface';
import { logger } from '../../utils/logger.tool';
import type {
  ProblemItem,
  ProblemItemCheckResult,
} from '../../../shared/problem-item.types';

/**
 * 設置 Problem Items V2 相關的所有 IPC Handlers
 */
// eslint-disable-next-line import/prefer-default-export
export function setupProblemItemsHandlersV2() {
  logger.info('[ProblemItems V2] Setting up handlers...');

  // ==========================================
  // 取得所有問題件
  // ==========================================
  createHandler(ipcContracts.problemItems.getAll, async () => {
    logger.debug('[ProblemItems V2] Getting all problem items');

    const data = problemItemsSheet.get();
    const result: ProblemItem[] = data.map((item) => ({
      貨物名稱: item[ProblemItemColumnKeys.ProductName] || '',
    }));

    logger.debug('[ProblemItems V2] Retrieved problem items', {
      count: result.length,
    });

    return result;
  });

  // ==========================================
  // 檢查貨物名稱是否為問題件（完全匹配）
  // ==========================================
  createHandler(ipcContracts.problemItems.check, async (input) => {
    logger.debug('[ProblemItems V2] Checking product name', {
      productName: input.productName,
    });

    if (!input.productName) {
      return {
        isProblem: false,
      } as ProblemItemCheckResult;
    }

    const data = problemItemsSheet.get();
    const trimmedProductName = input.productName.trim();

    // 完全匹配檢查
    const matchedItem = data.find(
      (item) =>
        item[ProblemItemColumnKeys.ProductName]?.trim() === trimmedProductName,
    );

    if (matchedItem) {
      logger.debug('[ProblemItems V2] Problem item matched', {
        productName: input.productName,
        matchedItem: matchedItem[ProblemItemColumnKeys.ProductName],
      });

      return {
        isProblem: true,
        matchedItem: matchedItem[ProblemItemColumnKeys.ProductName],
      } as ProblemItemCheckResult;
    }

    logger.debug('[ProblemItems V2] Not a problem item', {
      productName: input.productName,
    });

    return {
      isProblem: false,
    } as ProblemItemCheckResult;
  });

  // ==========================================
  // 批量檢查貨物名稱是否為問題件
  // ==========================================
  createHandler(ipcContracts.problemItems.checkBatch, async (input) => {
    logger.debug('[ProblemItems V2] Batch checking product names', {
      count: input.productNames?.length || 0,
    });

    if (!input.productNames || input.productNames.length === 0) {
      return [];
    }

    const data = problemItemsSheet.get();

    // 建立問題件名稱的 Set 以提高查詢效率
    const problemItemNames = new Set(
      data.map((item) => item[ProblemItemColumnKeys.ProductName]?.trim()),
    );

    const results: ProblemItemCheckResult[] = input.productNames.map(
      (productName) => {
        if (!productName) {
          return { isProblem: false };
        }

        const trimmedName = productName.trim();
        const isProblem = problemItemNames.has(trimmedName);

        return {
          isProblem,
          matchedItem: isProblem ? trimmedName : undefined,
        };
      },
    );

    const problemCount = results.filter((r) => r.isProblem).length;
    logger.debug('[ProblemItems V2] Batch check completed', {
      total: input.productNames.length,
      problemCount,
    });

    return results;
  });

  // ==========================================
  // 重新載入問題件
  // ==========================================
  createHandler(ipcContracts.problemItems.reload, async () => {
    logger.debug('[ProblemItems V2] Reloading problem items');

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

    logger.info('[ProblemItems V2] Problem items reloaded successfully');
    return true;
  });

  logger.info('[ProblemItems V2] All handlers registered successfully [OK]');
}
