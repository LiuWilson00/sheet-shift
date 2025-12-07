/**
 * Renderer Process - 統一的類型安全 IPC API（新架構）
 *
 * 這是新的 API 系統，與舊的 bridge 並存
 */

import { createClient, createVoidClient } from '../utils/typed-ipc-client';
import { ipcContracts } from '../../shared/ipc-contracts';

/**
 * 統一的類型安全 IPC API
 */
export const ipcApi = {
  /**
   * 設置相關 API（新版本 - V2）
   */
  settingsV2: {
    get: createClient(ipcContracts.settingsV2.get),
    save: createClient(ipcContracts.settingsV2.save),
    getSheet: createClient(ipcContracts.settingsV2.getSheet),
    saveSheet: createClient(ipcContracts.settingsV2.saveSheet),
    importSheet: createVoidClient(ipcContracts.settingsV2.importSheet),
    getSheetNames: createVoidClient(ipcContracts.settingsV2.getSheetNames),
  },

  /**
   * 應用程式狀態 API
   */
  app: {
    init: createVoidClient(ipcContracts.app.init),
    isInitialized: createVoidClient(ipcContracts.app.isInitialized),
  },

  /**
   * 認證 API
   */
  auth: {
    login: createClient(ipcContracts.auth.login),
    logout: createVoidClient(ipcContracts.auth.logout),
  },

  /**
   * Excel 處理 API
   */
  excel: {
    selectFile: createVoidClient(ipcContracts.excel.selectFile),
    exportDefault: createClient(ipcContracts.excel.exportDefault),
    exportDefaultWithWeight: createClient(
      ipcContracts.excel.exportDefaultWithWeight,
    ),
    exportShopee: createClient(ipcContracts.excel.exportShopee),
    exportShopeeNew: createClient(ipcContracts.excel.exportShopeeNew),
    exportPegasus: createClient(ipcContracts.excel.exportPegasus),
    getWrongData: createClient(ipcContracts.excel.getWrongData),
    addProductMap: createClient(ipcContracts.excel.addProductMap),
    getProductMap: createVoidClient(ipcContracts.excel.getProductMap),
    classifyProductName: createClient(ipcContracts.excel.classifyProductName),
  },
};

export type IpcApi = typeof ipcApi;
export default ipcApi;
