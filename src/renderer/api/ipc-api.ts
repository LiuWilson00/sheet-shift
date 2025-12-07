/**
 * Renderer Process - 統一的類型安全 IPC API（新架構）
 *
 * 這是新的 API 系統，與舊的 bridge 並存
 */

import { createClient } from '../utils/typed-ipc-client';
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
  },
};

export type IpcApi = typeof ipcApi;
export default ipcApi;
