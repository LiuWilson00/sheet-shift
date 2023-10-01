import { IpcRendererEvent, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../constants/ipc-channels';

const debugMessages: string[] = [];
export function listenForDebugMessages(func: (message: string) => void) {
  ipcRenderer.on(IPC_CHANNELS.DEBUG_MESSAGE, (_event, message) => {
    debugMessages.push(message);
    func(message);
  });
}
export function getDebugMessages() {
  return debugMessages;
}

export default {
  listenForDebugMessages,
  getDebugMessages,
};
