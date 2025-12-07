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
import { setupAuthHandlers } from './modules/auth-handlers';

// ============================================
// 新系統導入（Logger + V2 Handlers）
// ============================================
import { setupLoggerHandlers } from './modules/logger-handlers';
import { logger } from './utils/logger.tool';
import { setupSettingsHandlersV2 } from './modules/settings-handlers-v2';
import { setupAppStatusHandlersV2 } from './modules/app-status-handlers-v2';
import { setupAuthHandlersV2 } from './modules/auth-handlers-v2';

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

// ============================================
// 🆕 注意：移除了过早的 handlers 注册
// handlers 将在 createWindow() 中正确注册
// ============================================

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
  // ============================================
  // 第 1 步：首先注册 Logger Handlers
  // ============================================
  setupLoggerHandlers();
  logger.info('============================================================');
  logger.info('Application starting...');
  logger.info('Node Environment:', process.env.NODE_ENV);
  logger.info('============================================================');

  if (isDebug) {
    await installExtensions();
  }

  mainWindow = createMainWindow();

  // ============================================
  // 第 2 步：注册原有 Handlers（保持不变）
  // ============================================
  logger.info('Registering IPC handlers...');
  setupExcelHandlers(mainWindow);
  setupSaveSettingsHandlers(mainWindow);
  setupAppStatusHandlers();
  setupAuthHandlers();
  logger.info('Original handlers registered [OK]');

  // ============================================
  // 第 3 步：註冊新的 V2 Handlers（試點）
  // 與舊系統並行運行，使用不同的 channel 名稱
  // ============================================
  setupSettingsHandlersV2(mainWindow);
  setupAppStatusHandlersV2();
  setupAuthHandlersV2();
  logger.info('V2 handlers registered [OK]');

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  logger.info('Application started successfully [OK]');
  logger.info('============================================================');
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
