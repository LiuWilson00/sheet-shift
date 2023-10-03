import { app } from 'electron';
import path from 'path';

export const ENV_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets', '.env')
  : path.join(__dirname, '../../../.env');

export const SHEET_SETTING_PATH = path.join(ENV_PATH, 'settings.sheet.json');

export enum SheetRangeName {
  TariffCodeSheet = '稅則表',
  Address = '地址',
  SystemSetting = '系統設定',
  template = 'Template',
}

export const SHEET_RANGES = [
  SheetRangeName.TariffCodeSheet,
  SheetRangeName.Address,
  SheetRangeName.SystemSetting,
  SheetRangeName.template,
];
