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
  SystemProductMap = 'system_product_map',
  Users = '用戶資訊',
  /** 收貨人資訊表 */
  RecipientInfo = '收貨人資訊',
  /** 問題件表 */
  ProblemItems = '問題件',
  /** 艙單編號設定表 */
  ManifestNumberConfig = '艙單編號設定',
}

export const SHEET_RANGES = [
  SheetRangeName.TariffCodeSheet,
  SheetRangeName.Address,
  SheetRangeName.SystemSetting,
  SheetRangeName.template,
  SheetRangeName.SystemProductMap,
  SheetRangeName.Users,
  SheetRangeName.RecipientInfo,
  SheetRangeName.ProblemItems,
  SheetRangeName.ManifestNumberConfig,
];
