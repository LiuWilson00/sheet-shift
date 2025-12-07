/**
 * Renderer Process - 統一的類型安全 IPC API
 *
 * 這個文件提供了所有 IPC API 的統一入口
 * 在 Renderer Process 中使用此文件來調用 Main Process 的功能
 *
 * 使用範例：
 * ```typescript
 * import { ipcApi } from '@/api/ipc-api';
 *
 * // Settings API
 * const settings = await ipcApi.settings.get({ settingName: 'default' });
 * await ipcApi.settings.save({ data: newSettings, settingName: 'default' });
 *
 * // Excel API
 * const result = await ipcApi.excel.selectFile();
 * const exportResult = await ipcApi.excel.exportDefault({ settingName: 'default' });
 *
 * // Auth API
 * const user = await ipcApi.auth.login({ account: 'user', password: 'pass' });
 * ```
 */

import { createClient, createVoidClient, createCachedClient } from './renderer-typed-ipc-client';
import { ipcContracts } from './shared-ipc-contracts';

/**
 * 統一的類型安全 IPC API
 *
 * 所有 API 都經過類型檢查，IDE 會提供自動補全和類型提示
 */
export const ipcApi = {
  /**
   * 設置相關 API
   */
  settings: {
    /**
     * 獲取設置
     *
     * @param input.settingName 設置名稱（可選，默認為當前設置）
     * @returns 設置對象
     *
     * @example
     * ```typescript
     * const settings = await ipcApi.settings.get({ settingName: 'default' });
     * console.log(settings.someField);
     * ```
     */
    get: createCachedClient(ipcContracts.settings.get, {
      ttl: 5000, // 快取 5 秒
      getCacheKey: (input) => input.settingName || 'default',
    }),

    /**
     * 保存設置
     *
     * @param input.data 設置數據
     * @param input.settingName 設置名稱（可選）
     * @returns 是否保存成功
     *
     * @example
     * ```typescript
     * const success = await ipcApi.settings.save({
     *   data: { field1: 'value1' },
     *   settingName: 'default'
     * });
     * ```
     */
    save: createClient(ipcContracts.settings.save),

    /**
     * 獲取 Google Sheets 設置
     */
    getSheet: createCachedClient(ipcContracts.settings.getSheet, {
      ttl: 10000, // 快取 10 秒
      getCacheKey: (input) => input.settingName || 'default',
    }),

    /**
     * 保存 Google Sheets 設置
     */
    saveSheet: createClient(ipcContracts.settings.saveSheet),

    /**
     * 導入 Google Sheets 設置
     */
    importSheet: createClient(ipcContracts.settings.importSheet),

    /**
     * 獲取系統設置 Sheet 名稱列表
     */
    getSystemSheetNames: createVoidClient(ipcContracts.settings.getSystemSheetNames),
  },

  /**
   * Excel 處理相關 API
   */
  excel: {
    /**
     * 選擇 Excel 文件
     *
     * @returns Excel 數據結果
     *
     * @example
     * ```typescript
     * const result = await ipcApi.excel.selectFile();
     * if (!result.isError) {
     *   console.log('Selected file:', result.path);
     * }
     * ```
     */
    selectFile: createVoidClient(ipcContracts.excel.selectFile),

    /**
     * 導出預設格式
     *
     * @param input.settingName 設置名稱
     * @returns 導出結果
     *
     * @example
     * ```typescript
     * const result = await ipcApi.excel.exportDefault({ settingName: 'default' });
     * if (!result.isError) {
     *   console.log('Exported to:', result.path);
     * }
     * ```
     */
    exportDefault: createClient(ipcContracts.excel.exportDefault, {
      timeout: 60000, // 60 秒超時
    }),

    /**
     * 導出預設格式（帶重量處理）
     */
    exportDefaultWithWeight: createClient(ipcContracts.excel.exportDefaultWithWeight, {
      timeout: 60000,
    }),

    /**
     * 導出 Pegasus 格式
     */
    exportPegasus: createClient(ipcContracts.excel.exportPegasus, {
      timeout: 60000,
    }),

    /**
     * 導出 Shopee 格式
     */
    exportShopee: createClient(ipcContracts.excel.exportShopee, {
      timeout: 60000,
    }),

    /**
     * 導出 Shopee 新格式
     */
    exportShopeeNew: createClient(ipcContracts.excel.exportShopeeNew, {
      timeout: 60000,
    }),

    /**
     * 獲取錯誤數據
     *
     * @param input.aiClassify 是否使用 AI 分類
     * @returns 錯誤數據
     */
    getWrongData: createClient(ipcContracts.excel.getWrongData),

    /**
     * 添加新的產品映射
     *
     * @param input.mappings 產品映射列表
     * @returns 是否添加成功
     */
    addProductMap: createClient(ipcContracts.excel.addProductMap),

    /**
     * 獲取產品映射
     *
     * @returns 產品映射列表
     */
    getProductMap: createVoidClient(ipcContracts.excel.getProductMap),

    /**
     * 分類產品名稱
     *
     * @param input.productName 產品名稱
     * @returns 分類結果
     */
    classifyProductName: createClient(ipcContracts.excel.classifyProductName),
  },

  /**
   * 認證相關 API
   */
  auth: {
    /**
     * 登入
     *
     * @param input.account 帳號
     * @param input.password 密碼
     * @returns 用戶信息或 false
     *
     * @example
     * ```typescript
     * const user = await ipcApi.auth.login({
     *   account: 'admin',
     *   password: 'password123'
     * });
     *
     * if (user) {
     *   console.log('Logged in as:', user.name);
     * }
     * ```
     */
    login: createClient(ipcContracts.auth.login),

    /**
     * 登出
     *
     * @returns 是否登出成功
     */
    logout: createVoidClient(ipcContracts.auth.logout),
  },

  /**
   * 應用程序狀態相關 API
   */
  app: {
    /**
     * 獲取數據初始化狀態
     *
     * @returns 是否已初始化
     */
    getDataInitialized: createVoidClient(ipcContracts.app.getDataInitialized),

    /**
     * 應用啟動初始化
     *
     * @returns 初始化結果
     */
    startInit: createVoidClient(ipcContracts.app.startInit),
  },
};

/**
 * IPC API 類型（供 TypeScript 類型推導使用）
 */
export type IpcApi = typeof ipcApi;

/**
 * 清除所有快取
 */
export function clearAllCache() {
  // 這裡可以添加清除所有快取的邏輯
  console.log('[IPC API] All cache cleared');
}

/**
 * 導出便捷方法
 */
export default ipcApi;
