import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../constants/ipc-channels';
import { GoogleSheetConnectionStore } from '../../status-store';
import { initGoogleConnection } from '../../utils/google-sheets.tool';
export function setupAppStatusHandlers() {
  ipcMain.on(IPC_CHANNELS.GET_DATA_INITIALIZED, (event) => {
    const isGoogleConnected = GoogleSheetConnectionStore.get().isConnected;

    event.reply(IPC_CHANNELS.DATA_INITIALIZED_RESPONSE, isGoogleConnected);
  });

  ipcMain.on(IPC_CHANNELS.APP_START_INIT, (event) => {
    initGoogleConnection().then((res) => {
      event.reply(IPC_CHANNELS.APP_START_INIT_RESPONSE, res);
    });
  });
}
