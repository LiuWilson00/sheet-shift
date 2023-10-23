/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { createMainWindow } from './modules/window-manager';
import { setupExcelHandlers } from './modules/excel-hanlders';
import { setupSaveSettingsHandlers } from './modules/save-settings-handlers';
import { setupAppStatusHandlers } from './modules/app-status-handlers';
import { IPC_CHANNELS } from '../constants/ipc-channels';

// This is not valid TypeScript code. Please run this command in your terminal:
// npm install --save-dev @types/xlsx

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on(IPC_CHANNELS.IPC_EXAMPLE, async (event, arg) => {
  const msgTemplate = (pingPong: string) =>
    `IPC test: ${pingPong} ${__dirname}`;
  event.reply(IPC_CHANNELS.IPC_EXAMPLE, msgTemplate('pong'));
});

ipcMain.on(IPC_CHANNELS.DEBUG_MESSAGE, (event, message) => {
  mainWindow!.webContents.send(IPC_CHANNELS.DEBUG_MESSAGE, message);
});

setupExcelHandlers(mainWindow!);
setupSaveSettingsHandlers(mainWindow!);
setupAppStatusHandlers();

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  mainWindow = createMainWindow();
  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
