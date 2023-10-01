// bridgeHelper.ts

import { ipcRenderer, ipcMain } from 'electron';

export class BridgeHelper {
  static bridgeFunctions: Record<string, Function> = {};

  static on(channel: string, handler: Function) {
    if (process.type === 'renderer') {
      // 在渲染進程
      this.bridgeFunctions[channel] = (...args: any[]) => {
        ipcRenderer.send(channel, ...args);
        return new Promise((resolve) => {
          ipcRenderer.once(channel + '-reply', (_event, data) => {
            resolve(data);
          });
        });
      };
    } else if (process.type === 'browser') {
      // 在主進程
      ipcMain.on(channel, async (event, ...args) => {
        const result = await handler(...args);
        event.reply(channel + '-reply', result);
      });
    }
  }
}
