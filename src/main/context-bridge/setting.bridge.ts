import { IpcRendererEvent, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../constants/ipc-channels';
import { Settings } from '../utils/setting.tool';
import { GoogleSheetConnectionSetting } from '../utils/google-sheets.tool';

function importSettingSheet(data: GoogleSheetConnectionSetting) {
  ipcRenderer.send(IPC_CHANNELS.IMPORT_SETTINGS_SHEET, data);

  return new Promise<boolean>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.IMPORT_SETTINGS_SHEET_RESPONSE, (_event, data) => {
      resolve(data);
    });
  });
}

function sendSettingSheet(data: GoogleSheetConnectionSetting) {
  ipcRenderer.send(IPC_CHANNELS.SAVE_SETTINGS_SHEET, data);

  return new Promise<boolean>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.SETTINGS_SHEET_SAVED, (_event, data) => {
      resolve(data);
    });
  });
}

function sendSetting(data: Settings) {
  ipcRenderer.send(IPC_CHANNELS.SAVE_SETTINGS, data);

  return new Promise<boolean>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.SETTINGS_SAVED, (_event, data) => {
      resolve(data);
    });
  });
}

function getSetting() {
  ipcRenderer.send(IPC_CHANNELS.GET_SETTINGS);

  return new Promise<Settings>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.SETTINGS_RESPONSE, (_event, data) => {
      resolve(data);
    });
  });
}

function getSettingSheet() {
  ipcRenderer.send(IPC_CHANNELS.GET_SETTINGS_SHEET);

  return new Promise<GoogleSheetConnectionSetting>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.SETTINGS_SHEET_RESPONSE, (_event, data) => {
      resolve(data);
    });
  });
}

export default {
  sendSettingSheet,
  sendSetting,
  getSettingSheet,
  getSetting,
  importSettingSheet
};
