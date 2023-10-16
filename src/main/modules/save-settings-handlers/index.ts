import { IPC_CHANNELS } from '../../../constants/ipc-channels';
import { BrowserWindow, app, dialog, ipcMain } from 'electron';
import { getSystemSetting } from '../../utils/setting.tool';
import {
  systemSettingSheets,
  updateSheetData,
} from '../../utils/google-sheets.tool';
import { GoogleSheetConnectionStore } from '../../status-store';
import { SheetRangeName } from '../../utils/google-sheets.tool/index.const';
const fs = require('fs');
const path = require('path');

export const ENV_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets', '.env')
  : path.join(__dirname, '../../../.env');
const SETTINGS_SHEET_PATH = path.join(ENV_PATH, 'settings.sheet.json');

export const setupSaveSettingsHandlers = (mainWindow: BrowserWindow) => {
  ipcMain.on(IPC_CHANNELS.SAVE_SETTINGS, (event, settings) => {
    const settingsJsonArray = transformSettingsToObjectArray(settings);
    updateSheetData(
      SheetRangeName.SystemSetting,
      settingsJsonArray,
    ).then((res) => {
      if (res) {
        systemSettingSheets.set(settingsJsonArray);
        event.reply(IPC_CHANNELS.SETTINGS_SAVED, true);
      } else {
        event.reply(IPC_CHANNELS.SETTINGS_SAVED, false);
      }
    });
  });

  ipcMain.on(IPC_CHANNELS.GET_SETTINGS, (event) => {
    const settingsData = getSystemSetting();

    event.reply(IPC_CHANNELS.SETTINGS_RESPONSE, settingsData);
  });
  ipcMain.on(IPC_CHANNELS.SAVE_SETTINGS_SHEET, (event, settings) => {
    fs.writeFileSync(
      SETTINGS_SHEET_PATH,
      JSON.stringify(settings, null, 2).replace(/\\\\/g, '\\'),
    );
    event.reply(IPC_CHANNELS.SETTINGS_SHEET_SAVED, true);
  });
  ipcMain.on(IPC_CHANNELS.GET_SETTINGS_SHEET, (event) => {
    const tryGetGoogleSheetAPISetting = GoogleSheetConnectionStore.get();
    if (tryGetGoogleSheetAPISetting) {
      event.reply(
        IPC_CHANNELS.SETTINGS_SHEET_RESPONSE,
        tryGetGoogleSheetAPISetting,
      );
    } else {
      event.reply(IPC_CHANNELS.SETTINGS_SHEET_RESPONSE, false);
    }
  });
  ipcMain.on(IPC_CHANNELS.IMPORT_SETTINGS_SHEET, async (event) => {
    const filePath = await selectJsonFile(mainWindow);

    if (filePath) {
      const settingsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      fs.writeFileSync(
        SETTINGS_SHEET_PATH,
        JSON.stringify(settingsData, null, 2).replace(/\\\\/g, '\\'),
      );

      event.reply(IPC_CHANNELS.IMPORT_SETTINGS_SHEET_RESPONSE, true);
    } else {
      event.reply(IPC_CHANNELS.IMPORT_SETTINGS_SHEET_RESPONSE, false);
    }
  });
};

function transformSettingsToObjectArray(settings: any, prefix = '') {
  let resultArray: any = [];

  for (const key in settings) {
    if (settings.hasOwnProperty(key)) {
      if (typeof settings[key] === 'object' && !Array.isArray(settings[key])) {
        // 若屬性值是物件，則進行遞迴
        resultArray = resultArray.concat(
          transformSettingsToObjectArray(settings[key], `${prefix}${key}--`),
        );
      } else {
        // 若屬性值不是物件，則直接加入結果陣列
        resultArray.push({
          Key: `${prefix}${key}`,
          Value: settings[key].toString(),
        });
      }
    }
  }

  return resultArray;
}

function selectJsonFile(mainWindow: BrowserWindow) {
  return new Promise<string | undefined>((resolve, reject) => {
    const options = {
      title: 'Select a json file',
      filters: [{ name: 'json', extensions: ['json'] }],
    };
    const filePath = dialog.showOpenDialogSync(mainWindow, options);
    if (filePath) {
      resolve(filePath[0]);
    } else {
      resolve(undefined);
    }
  });
}
