import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../constants/ipc-channels';

export function sendLogin(data: { account: string; password: string }) {
  ipcRenderer.send(IPC_CHANNELS.LOGIN, data);
  return new Promise<
    false | { name: string; account: string; password: string }
  >((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.LOGIN_RESPONSE, (_event, data) => {
      resolve(data);
    });
  });
}

export function sendLogout() {
  ipcRenderer.send(IPC_CHANNELS.LOGOUT);

  return new Promise<boolean>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.LOGOUT_RESPONSE, (_event, data) => {
      resolve(data);
    });
  });
}
export default {
  sendLogin,
  sendLogout,
};
