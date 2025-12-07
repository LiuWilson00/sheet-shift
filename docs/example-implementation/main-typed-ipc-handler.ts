/**
 * Main Process - 類型安全的 IPC Handler 工具
 *
 * 這個文件提供了創建類型安全 IPC Handler 的工具函數
 * 自動處理錯誤、日誌等常見邏輯
 *
 * 使用範例：
 * ```typescript
 * import { createHandler } from '@/utils/typed-ipc-handler';
 * import { ipcContracts } from '@shared/ipc-contracts';
 *
 * createHandler(ipcContracts.settings.get, async (input) => {
 *   return await getSettings(input.settingName);
 * });
 * ```
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import type { IpcContract } from './shared-ipc-contracts';

/**
 * Logger 配置
 */
interface LoggerConfig {
  /** 是否啟用日誌 */
  enabled: boolean;
  /** 是否記錄輸入參數 */
  logInput: boolean;
  /** 是否記錄輸出結果 */
  logOutput: boolean;
  /** 是否記錄錯誤 */
  logError: boolean;
}

/**
 * 全局 Logger 配置
 */
let globalLoggerConfig: LoggerConfig = {
  enabled: process.env.NODE_ENV === 'development',
  logInput: true,
  logOutput: true,
  logError: true,
};

/**
 * 設置全局 Logger 配置
 */
export function setLoggerConfig(config: Partial<LoggerConfig>) {
  globalLoggerConfig = { ...globalLoggerConfig, ...config };
}

/**
 * Handler 上下文
 * 提供額外的輔助方法給 handler 使用
 */
export interface HandlerContext {
  /** IPC 事件對象 */
  event: IpcMainInvokeEvent;
  /** 發送進度更新（如果需要） */
  sendProgress?: (progress: number) => void;
}

/**
 * 創建類型安全的 IPC Handler
 *
 * @param contract API 契約定義
 * @param handler 處理函數，接收輸入並返回輸出
 * @param options 可選配置
 *
 * @example
 * ```typescript
 * createHandler(ipcContracts.settings.get, async (input) => {
 *   return await getSettings(input.settingName);
 * });
 * ```
 */
export function createHandler<TInput, TOutput>(
  contract: IpcContract<TInput, TOutput>,
  handler: (input: TInput, context: HandlerContext) => Promise<TOutput>,
  options?: {
    /** 是否禁用此 handler 的日誌 */
    disableLog?: boolean;
    /** 自定義錯誤處理 */
    onError?: (error: Error, input: TInput) => void;
  }
) {
  const shouldLog = globalLoggerConfig.enabled && !options?.disableLog;

  ipcMain.handle(contract.channel, async (event, input: TInput) => {
    const startTime = Date.now();

    if (shouldLog && globalLoggerConfig.logInput) {
      console.log(`[IPC Handler] ${contract.channel}`, {
        input,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const context: HandlerContext = { event };
      const result = await handler(input, context);

      const duration = Date.now() - startTime;

      if (shouldLog && globalLoggerConfig.logOutput) {
        console.log(`[IPC Handler] ${contract.channel} ✓`, {
          result,
          duration: `${duration}ms`,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      if (shouldLog && globalLoggerConfig.logError) {
        console.error(`[IPC Handler] ${contract.channel} ✗`, {
          error: errorObj.message,
          stack: errorObj.stack,
          duration: `${duration}ms`,
        });
      }

      // 調用自定義錯誤處理
      if (options?.onError) {
        options.onError(errorObj, input);
      }

      // 重新拋出錯誤，讓 renderer 可以捕獲
      throw errorObj;
    }
  });

  if (shouldLog) {
    console.log(`[IPC Handler] Registered: ${contract.channel}`);
  }
}

/**
 * 創建類型安全的 void input handler（無參數）
 *
 * @example
 * ```typescript
 * createVoidHandler(ipcContracts.settings.getSystemSheetNames, async () => {
 *   return await getSystemSheetNames();
 * });
 * ```
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
 * 批量註冊 handlers
 *
 * @example
 * ```typescript
 * registerHandlers([
 *   { contract: ipcContracts.settings.get, handler: getSettingsHandler },
 *   { contract: ipcContracts.settings.save, handler: saveSettingsHandler },
 * ]);
 * ```
 */
export function registerHandlers(
  handlers: Array<{
    contract: IpcContract<any, any>;
    handler: (input: any, context: HandlerContext) => Promise<any>;
    options?: { disableLog?: boolean };
  }>
) {
  handlers.forEach(({ contract, handler, options }) => {
    createHandler(contract, handler, options);
  });
}

/**
 * 移除 handler
 *
 * @param contract API 契約定義
 */
export function removeHandler(contract: IpcContract<any, any>) {
  ipcMain.removeHandler(contract.channel);
  console.log(`[IPC Handler] Removed: ${contract.channel}`);
}

/**
 * 移除所有 handlers（用於清理或測試）
 */
export function removeAllHandlers() {
  // Note: Electron 沒有提供直接移除所有 handlers 的 API
  // 這裡需要手動追蹤註冊的 handlers
  console.warn('[IPC Handler] removeAllHandlers not implemented');
}

/**
 * 錯誤包裝器 - 將業務邏輯錯誤轉換為標準格式
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
 * 創建帶錯誤處理的 handler 包裝器
 *
 * @example
 * ```typescript
 * const safeHandler = withErrorHandling(async (input) => {
 *   if (!input.file) {
 *     throw new IpcError('File is required', 'MISSING_FILE');
 *   }
 *   return await processFile(input.file);
 * });
 *
 * createHandler(ipcContracts.excel.selectFile, safeHandler);
 * ```
 */
export function withErrorHandling<TInput, TOutput>(
  handler: (input: TInput, context: HandlerContext) => Promise<TOutput>
): (input: TInput, context: HandlerContext) => Promise<TOutput> {
  return async (input, context) => {
    try {
      return await handler(input, context);
    } catch (error) {
      if (error instanceof IpcError) {
        throw error;
      }

      // 包裝未預期的錯誤
      throw new IpcError(
        error instanceof Error ? error.message : String(error),
        'INTERNAL_ERROR',
        { originalError: error }
      );
    }
  };
}
