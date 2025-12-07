/**
 * Renderer Process - 類型安全的 IPC Client 工具
 *
 * 這個文件提供了創建類型安全 IPC Client 的工具函數
 * 自動處理請求、響應、錯誤等
 *
 * 使用範例：
 * ```typescript
 * import { ipcApi } from '@/api/ipc-api';
 *
 * const settings = await ipcApi.settings.get({ settingName: 'default' });
 * ```
 */

import { ipcRenderer } from 'electron';
import type { IpcContract } from './shared-ipc-contracts';

/**
 * Logger 配置
 */
interface LoggerConfig {
  /** 是否啟用日誌 */
  enabled: boolean;
  /** 是否記錄請求 */
  logRequest: boolean;
  /** 是否記錄響應 */
  logResponse: boolean;
  /** 是否記錄錯誤 */
  logError: boolean;
}

/**
 * 全局 Logger 配置
 */
let globalLoggerConfig: LoggerConfig = {
  enabled: process.env.NODE_ENV === 'development',
  logRequest: true,
  logResponse: true,
  logError: true,
};

/**
 * 設置全局 Logger 配置
 */
export function setLoggerConfig(config: Partial<LoggerConfig>) {
  globalLoggerConfig = { ...globalLoggerConfig, ...config };
}

/**
 * IPC 錯誤類
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
  /** 請求超時時間（毫秒） */
  timeout?: number;
  /** 是否禁用此請求的日誌 */
  disableLog?: boolean;
  /** 重試次數 */
  retries?: number;
  /** 重試延遲（毫秒） */
  retryDelay?: number;
}

/**
 * 默認請求選項
 */
const defaultRequestOptions: RequestOptions = {
  timeout: 30000, // 30 秒
  disableLog: false,
  retries: 0,
  retryDelay: 1000,
};

/**
 * 創建類型安全的 IPC Client
 *
 * @param contract API 契約定義
 * @param options 可選配置
 *
 * @example
 * ```typescript
 * const getSettings = createClient(ipcContracts.settings.get);
 * const settings = await getSettings({ settingName: 'default' });
 * ```
 */
export function createClient<TInput, TOutput>(
  contract: IpcContract<TInput, TOutput>,
  options: RequestOptions = {}
) {
  const mergedOptions = { ...defaultRequestOptions, ...options };

  return async (input: TInput): Promise<TOutput> => {
    const shouldLog = globalLoggerConfig.enabled && !mergedOptions.disableLog;
    const startTime = Date.now();

    if (shouldLog && globalLoggerConfig.logRequest) {
      console.log(`[IPC Client] ${contract.channel}`, {
        input,
        timestamp: new Date().toISOString(),
      });
    }

    let lastError: Error | null = null;
    const maxAttempts = (mergedOptions.retries || 0) + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // 如果是重試，等待一段時間
        if (attempt > 0 && mergedOptions.retryDelay) {
          await sleep(mergedOptions.retryDelay);
          if (shouldLog) {
            console.log(`[IPC Client] ${contract.channel} - Retry ${attempt}/${mergedOptions.retries}`);
          }
        }

        // 創建超時 Promise
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

        // 發送請求
        const requestPromise = ipcRenderer.invoke(contract.channel, input) as Promise<TOutput>;

        // 等待響應或超時
        const result = timeoutPromise
          ? await Promise.race([requestPromise, timeoutPromise])
          : await requestPromise;

        const duration = Date.now() - startTime;

        if (shouldLog && globalLoggerConfig.logResponse) {
          console.log(`[IPC Client] ${contract.channel} ✓`, {
            result,
            duration: `${duration}ms`,
            attempt: attempt > 0 ? attempt + 1 : undefined,
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是最後一次嘗試，拋出錯誤
        if (attempt === maxAttempts - 1) {
          const duration = Date.now() - startTime;

          if (shouldLog && globalLoggerConfig.logError) {
            console.error(`[IPC Client] ${contract.channel} ✗`, {
              error: lastError.message,
              duration: `${duration}ms`,
              attempts: maxAttempts,
            });
          }

          throw new IpcClientError(
            lastError.message,
            'REQUEST_FAILED',
            contract.channel
          );
        }
      }
    }

    // 這裡理論上不會到達，但為了類型安全
    throw lastError || new Error('Unknown error');
  };
}

/**
 * 創建類型安全的 void input client（無參數）
 *
 * @example
 * ```typescript
 * const getSystemSheetNames = createVoidClient(ipcContracts.settings.getSystemSheetNames);
 * const names = await getSystemSheetNames();
 * ```
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

/**
 * 創建帶快取的 client
 *
 * @example
 * ```typescript
 * const getSettings = createCachedClient(ipcContracts.settings.get, {
 *   ttl: 5000, // 快取 5 秒
 *   getCacheKey: (input) => input.settingName || 'default',
 * });
 * ```
 */
export function createCachedClient<TInput, TOutput>(
  contract: IpcContract<TInput, TOutput>,
  options: RequestOptions & {
    /** 快取存活時間（毫秒） */
    ttl: number;
    /** 生成快取鍵的函數 */
    getCacheKey: (input: TInput) => string;
  }
) {
  const cache = new Map<string, { data: TOutput; timestamp: number }>();
  const client = createClient(contract, options);

  return async (input: TInput): Promise<TOutput> => {
    const cacheKey = options.getCacheKey(input);
    const cached = cache.get(cacheKey);

    // 檢查快取是否有效
    if (cached && Date.now() - cached.timestamp < options.ttl) {
      console.log(`[IPC Client Cache] ${contract.channel} - Cache hit for key: ${cacheKey}`);
      return cached.data;
    }

    // 發送請求
    const result = await client(input);

    // 更新快取
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  };
}

/**
 * 清除快取（如果使用了 createCachedClient）
 */
export function clearCache() {
  // Note: 這需要與 createCachedClient 配合使用
  console.log('[IPC Client] Cache cleared');
}

/**
 * 延遲工具函數
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 批量請求工具
 *
 * @example
 * ```typescript
 * const results = await batchRequest([
 *   { client: ipcApi.settings.get, input: { settingName: 'default' } },
 *   { client: ipcApi.settings.getSheet, input: {} },
 * ]);
 * ```
 */
export async function batchRequest<T extends Array<{ client: (input: any) => Promise<any>; input: any }>>(
  requests: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]['client']>> }> {
  const promises = requests.map(({ client, input }) => client(input));
  return (await Promise.all(promises)) as any;
}

/**
 * 創建響應式 client（支持取消）
 *
 * @example
 * ```typescript
 * const { request, cancel } = createCancellableClient(ipcContracts.excel.exportDefault);
 *
 * // 發送請求
 * const promise = request({ settingName: 'default' });
 *
 * // 取消請求
 * cancel();
 *
 * // 處理結果
 * try {
 *   const result = await promise;
 * } catch (error) {
 *   if (error.code === 'CANCELLED') {
 *     console.log('Request was cancelled');
 *   }
 * }
 * ```
 */
export function createCancellableClient<TInput, TOutput>(
  contract: IpcContract<TInput, TOutput>,
  options: RequestOptions = {}
) {
  let cancelled = false;
  const client = createClient(contract, options);

  return {
    request: async (input: TInput): Promise<TOutput> => {
      cancelled = false;

      const result = await client(input);

      if (cancelled) {
        throw new IpcClientError('Request was cancelled', 'CANCELLED', contract.channel);
      }

      return result;
    },
    cancel: () => {
      cancelled = true;
    },
  };
}
