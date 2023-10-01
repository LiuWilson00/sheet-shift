import { IpcRendererEvent, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../constants/ipc-channels';
import { GoogleSheetConnectionResult } from '../utils/google-sheets.tool';
const onDataInitialized = (
  func: (event: IpcRendererEvent, ...args: unknown[]) => void,
) => {
  ipcRenderer.on(IPC_CHANNELS.DATA_INITIALIZED, func);
};

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
  onDataInitialized,
  getDataInitialized,
  appStartInit,
};
