import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../constants/ipc-channels';
import { GoogleSheetConnectionResult } from '../utils/google-sheets.tool';

/**
 * @deprecated 死代碼 - 此函數未被使用
 *
 * 評估結果（2025-12-07）：
 * - Renderer 端無任何地方調用此函數
 * - Main 端沒有任何地方發送 DATA_INITIALIZED 事件（無 webContents.send）
 * - 原設計可能是用於推送初始化狀態，但實際使用的是 getDataInitialized() 輪詢方式
 * - 已有 V2 替代方案：ipcApi.app.isInitialized()
 *
 * 建議：在確認無影響後可安全移除
 */
// const onDataInitialized = (
//   func: (event: IpcRendererEvent, ...args: unknown[]) => void,
// ) => {
//   ipcRenderer.on(IPC_CHANNELS.DATA_INITIALIZED, func);
// };

const getDataInitialized = () => {
  ipcRenderer.send(IPC_CHANNELS.GET_DATA_INITIALIZED);

  return new Promise<boolean>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.DATA_INITIALIZED_RESPONSE,
      (_event, data: boolean) => {
        resolve(data);
      },
    );
  });
};

const appStartInit = () => {
  ipcRenderer.send(IPC_CHANNELS.APP_START_INIT);

  return new Promise<GoogleSheetConnectionResult>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.APP_START_INIT_RESPONSE,
      (_event, data: GoogleSheetConnectionResult) => {
        resolve(data);
      },
    );
  });
};


export default {
  // onDataInitialized, // @deprecated 死代碼，已註解
  getDataInitialized,
  appStartInit,
};
