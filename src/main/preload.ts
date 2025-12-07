// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../constants/ipc-channels';
import appStatusBridge from './context-bridge/app-status.bridge';
import debugBridge from './context-bridge/debug.bridge';
import excelBridge from './context-bridge/excel.bridge';
import settingBridge from './context-bridge/setting.bridge';
import authBridge from './context-bridge/auth.bridge';

export type Channels = keyof typeof IPC_CHANNELS;
const debugMessages: string[] = [];

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke(channel: string, ...args: unknown[]) {
      return ipcRenderer.invoke(channel, ...args);
    },
  },
  excelBridge,
  appStatusBridge,
  debugBridge,
  settingBridge,
  authBridge,
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
