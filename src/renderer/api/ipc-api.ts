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
   * 日誌 API
   */
  logs: {
    openFolder: createVoidClient(ipcContracts.logs.openFolder),
  },

  /**
   * 使用者管理 API（Admin 專用）
   */
  users: {
    list: createClient(ipcContracts.users.list),
    save: createClient(ipcContracts.users.save),
    delete: createClient(ipcContracts.users.delete),
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
    exportTaipeiBay: createClient(ipcContracts.excel.exportTaipeiBay),
    exportKaohsiungChaofeng: createClient(
      ipcContracts.excel.exportKaohsiungChaofeng,
    ),
    getWrongData: createClient(ipcContracts.excel.getWrongData),
    addProductMap: createClient(ipcContracts.excel.addProductMap),
    getProductMap: createVoidClient(ipcContracts.excel.getProductMap),
    classifyProductName: createClient(ipcContracts.excel.classifyProductName),
    applyManifestNumberOnly: createClient(
      ipcContracts.excel.applyManifestNumberOnly,
    ),
    countFileGroups: createVoidClient(ipcContracts.excel.countFileGroups),
  },

  /**
   * 收貨人資訊 API
   */
  recipientInfo: {
    getAll: createVoidClient(ipcContracts.recipientInfo.getAll),
    lookup: createClient(ipcContracts.recipientInfo.lookup),
    add: createClient(ipcContracts.recipientInfo.add),
    addBatch: createClient(ipcContracts.recipientInfo.addBatch),
    reload: createVoidClient(ipcContracts.recipientInfo.reload),
  },

  /**
   * 問題件 API
   */
  problemItems: {
    getAll: createVoidClient(ipcContracts.problemItems.getAll),
    check: createClient(ipcContracts.problemItems.check),
    checkBatch: createClient(ipcContracts.problemItems.checkBatch),
    reload: createVoidClient(ipcContracts.problemItems.reload),
  },

  /**
   * 艙單編號 API
   */
  manifestNumber: {
    getConfigs: createVoidClient(ipcContracts.manifestNumber.getConfigs),
    getConfig: createClient(ipcContracts.manifestNumber.getConfig),
    saveConfig: createClient(ipcContracts.manifestNumber.saveConfig),
    deleteConfig: createClient(ipcContracts.manifestNumber.deleteConfig),
    generate: createClient(ipcContracts.manifestNumber.generate),
    validate: createClient(ipcContracts.manifestNumber.validate),
    updateCurrentNumber: createClient(
      ipcContracts.manifestNumber.updateCurrentNumber,
    ),
    reload: createVoidClient(ipcContracts.manifestNumber.reload),
  },
};

export type IpcApi = typeof ipcApi;
export default ipcApi;
