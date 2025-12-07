/**
 * Renderer Process - 類型安全的 IPC Client 工具（新架構）
 *
 * 使用 window.electron.ipcRenderer 而不是直接導入 electron
 */

import type { IpcContract } from '../../shared/ipc-contracts';
import { logger } from './logger.tool';

// 取得 ipcRenderer（透過 preload 暴露）
const { ipcRenderer } = window.electron;

/**
 * IPC Client 錯誤類
 */
export class IpcClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public channel?: string
  ) {
    super(message);
    this.name = 'IpcClientError';
  }
}

/**
 * 請求選項
 */
interface RequestOptions {
  timeout?: number;
  disableLog?: boolean;
}

/**
 * 默認請求選項
 */
const defaultRequestOptions: RequestOptions = {
  timeout: 30000, // 30 秒
  disableLog: false,
};

/**
 * 創建類型安全的 IPC Client
 */
export function createClient<TInput, TOutput>(
  contract: IpcContract<TInput, TOutput>,
  options: RequestOptions = {}
) {
  const mergedOptions = { ...defaultRequestOptions, ...options };

  return async (input: TInput): Promise<TOutput> => {
    const shouldLog = !mergedOptions.disableLog;
    const startTime = Date.now();

    if (shouldLog) {
      logger.debug(`[IPC Client] ${contract.channel}`, { input });
    }

    try {
      const timeoutPromise = mergedOptions.timeout
        ? new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new IpcClientError(
                  `Request timeout after ${mergedOptions.timeout}ms`,
                  'TIMEOUT',
                  contract.channel
                )
              );
            }, mergedOptions.timeout);
          })
        : null;

      const requestPromise = ipcRenderer.invoke(contract.channel, input) as Promise<TOutput>;

      const result = timeoutPromise
        ? await Promise.race([requestPromise, timeoutPromise])
        : await requestPromise;

      const duration = Date.now() - startTime;

      if (shouldLog) {
        logger.debug(`[IPC Client] ${contract.channel} [OK]`, {
          duration: `${duration}ms`,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      logger.error(`[IPC Client] ${contract.channel} [FAIL]`, errorObj, {
        duration: `${duration}ms`,
      });

      throw new IpcClientError(
        errorObj.message,
        'REQUEST_FAILED',
        contract.channel
      );
    }
  };
}

/**
 * 創建類型安全的 void input client
 */
export function createVoidClient<TOutput>(
  contract: IpcContract<void, TOutput>,
  options: RequestOptions = {}
) {
  const client = createClient(contract, options);
  return async (): Promise<TOutput> => {
    return await client(undefined as void);
  };
}
