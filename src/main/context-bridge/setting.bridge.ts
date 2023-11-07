import { IpcRendererEvent, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../constants/ipc-channels';
import { Settings } from '../utils/setting.tool';
import { GoogleSheetConnectionSetting } from '../utils/google-sheets.tool';

function importSettingSheet(data: GoogleSheetConnectionSetting) {
  ipcRenderer.send(IPC_CHANNELS.IMPORT_SETTINGS_SHEET, data);

  return new Promise<boolean>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.IMPORT_SETTINGS_SHEET_RESPONSE,
      (_event, data) => {
        resolve(data);
      },
    );
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

function sendSetting(data: Settings, settingName?: string) {
  ipcRenderer.send(IPC_CHANNELS.SAVE_SETTINGS, data, settingName);

  return new Promise<boolean>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.SETTINGS_SAVED, (_event, data) => {
      resolve(data);
    });
  });
}

function getSetting(settingName?: string) {
  ipcRenderer.send(IPC_CHANNELS.GET_SETTINGS, settingName);

  return new Promise<Settings>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.SETTINGS_RESPONSE, (_event, data) => {
      resolve(data);
    });
  });
}

function getSettingSheet(settingName?: string) {
  ipcRenderer.send(IPC_CHANNELS.GET_SETTINGS_SHEET, settingName);

  return new Promise<GoogleSheetConnectionSetting>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.SETTINGS_SHEET_RESPONSE, (_event, data) => {
      resolve(data);
    });
  });
}

function getSystemSettingSheetNames() {
  ipcRenderer.send(IPC_CHANNELS.GET_SYSTEM_SETTINGS_SHEET_NAMES);

  return new Promise<string[]>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.SYSTEM_SETTINGS_SHEET_NAMES_RESPONSE,
      (_event, data) => {
        resolve(data);
      },
    );
  });
}

export default {
  sendSettingSheet,
  sendSetting,
  getSettingSheet,
  getSetting,
  importSettingSheet,
  getSystemSettingSheetNames,
};
