import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../constants/ipc-channels';
import { usersSheet } from '../../utils/google-sheets.tool';
export function setupAuthHandlers() {
  ipcMain.on(
    IPC_CHANNELS.LOGIN,
    (event, auth: { account: string; password: string }) => {
      const user = usersSheet
        .get()
        .find((user) => user.account === auth.account);

      if (!user) {
        event.reply(IPC_CHANNELS.LOGIN_RESPONSE, false);
        return;
      }

      if (user.password !== auth.password) {
        event.reply(IPC_CHANNELS.LOGIN_RESPONSE, false);
        return;
      }

      event.reply(IPC_CHANNELS.LOGIN_RESPONSE, user);
    },
  );

  ipcMain.on(IPC_CHANNELS.LOGOUT, (event) => {
    event.reply(IPC_CHANNELS.LOGOUT_RESPONSE);
  });
}
