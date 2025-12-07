/**
 * Main Process - 類型安全的 IPC Handler 工具（新架構）
 *
 * ⚠️ 與舊的 handler 系統並存，互不影響
 *
 * 使用範例：
 * ```typescript
 * import { createHandler } from '@/utils/typed-ipc-handler';
 * import { ipcContracts } from '@shared/ipc-contracts';
 *
 * createHandler(ipcContracts.settingsV2.get, async (input) => {
 *   return await getSettings(input.settingName);
 * });
 * ```
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import type { IpcContract } from '../../shared/ipc-contracts';
import { logger } from './logger.tool';

/**
 * Handler 上下文
 */
export interface HandlerContext {
  event: IpcMainInvokeEvent;
}

/**
 * IPC 錯誤類
 */
export class IpcError extends Error {
  constructor(
    message: string,
    public code?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'IpcError';
  }
}

/**
 * 創建類型安全的 IPC Handler
 *
 * @param contract API 契約定義
 * @param handler 處理函數
 * @param options 可選配置
 */
export function createHandler<TInput, TOutput>(
  contract: IpcContract<TInput, TOutput>,
  handler: (input: TInput, context: HandlerContext) => Promise<TOutput>,
  options?: {
    disableLog?: boolean;
    onError?: (error: Error, input: TInput) => void;
  }
) {
  const shouldLog = !options?.disableLog;

  ipcMain.handle(contract.channel, async (event, input: TInput) => {
    const startTime = Date.now();

    if (shouldLog) {
      logger.debug(`[IPC Handler] ${contract.channel}`, { input });
    }

    try {
      const context: HandlerContext = { event };
      const result = await handler(input, context);

      const duration = Date.now() - startTime;

      if (shouldLog) {
        logger.debug(`[IPC Handler] ${contract.channel} [OK]`, {
          duration: `${duration}ms`,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      logger.error(`[IPC Handler] ${contract.channel} [FAIL]`, errorObj, {
        duration: `${duration}ms`,
        input,
      });

      if (options?.onError) {
        options.onError(errorObj, input);
      }

      throw errorObj;
    }
  });

  logger.info(`[IPC Handler] Registered: ${contract.channel}`);
}

/**
 * 創建類型安全的 void input handler
 */
export function createVoidHandler<TOutput>(
  contract: IpcContract<void, TOutput>,
  handler: (context: HandlerContext) => Promise<TOutput>,
  options?: {
    disableLog?: boolean;
    onError?: (error: Error) => void;
  }
) {
  return createHandler(
    contract,
    async (_input, context) => {
      return await handler(context);
    },
    options
  );
}

/**
 * 移除 handler
 */
export function removeHandler(contract: IpcContract<any, any>) {
  ipcMain.removeHandler(contract.channel);
  logger.info(`[IPC Handler] Removed: ${contract.channel}`);
}
