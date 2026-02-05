export interface GoogleSheetSetting {
  keys: {
    client_email: string;
    private_key: string;
  };
  sheetSetting: {
    spreadsheetId: string;
  };
}

export enum AddressSheetColumnKeys {
  Number = '序號',
  Address = '地址',
}

export enum SystemSettingSheetsColumnKeys {
  Key = 'Key',
  Value = 'Value',
}

export interface AddressSheet {
  [AddressSheetColumnKeys.Number]: number;
  [AddressSheetColumnKeys.Address]: string;
}

export interface SystemSettingSheets {
  [SystemSettingSheetsColumnKeys.Key]: string;
  [SystemSettingSheetsColumnKeys.Value]: string;
}

export interface UsersSheet {
  name: string;
  account: string;
  password: string;
}

/** 收貨人資訊欄位名稱 */
export enum RecipientInfoColumnKeys {
  /** 收貨人統一編號 */
  TaxNumber = '收貨人統一編號',
  /** 收貨人英文名稱 */
  EnglishName = '收貨人英文名稱',
  /** 收貨人電話 */
  Phone = '收貨人電話',
  /** 海關註記 */
  CustomsNote = '海關註記',
}

/** 收貨人資訊 */
export interface RecipientInfoSheet {
  [RecipientInfoColumnKeys.TaxNumber]: string;
  [RecipientInfoColumnKeys.EnglishName]: string;
  [RecipientInfoColumnKeys.Phone]: string;
  [RecipientInfoColumnKeys.CustomsNote]: string;
}

/** 問題件欄位名稱 */
export enum ProblemItemColumnKeys {
  /** 貨物名稱 */
  ProductName = '貨物名稱',
}

/** 問題件 */
export interface ProblemItemSheet {
  [ProblemItemColumnKeys.ProductName]: string;
}

/** 艙單編號設定欄位名稱 */
export enum ManifestNumberConfigColumnKeys {
  /** 設定名稱 */
  SettingName = '設定名稱',
  /** 格式定義 */
  FormatDefinition = '格式定義',
  /** 黑名單規則 */
  BlacklistRule = '黑名單規則',
  /** 當前編號 */
  CurrentNumber = '當前編號',
  /** 建立時間 */
  CreatedAt = '建立時間',
  /** 更新時間 */
  UpdatedAt = '更新時間',
}

/** 艙單編號設定（Google Sheets 格式） */
export interface ManifestNumberConfigSheet {
  [ManifestNumberConfigColumnKeys.SettingName]: string;
  [ManifestNumberConfigColumnKeys.FormatDefinition]: string;
  [ManifestNumberConfigColumnKeys.BlacklistRule]: string;
  [ManifestNumberConfigColumnKeys.CurrentNumber]: string;
  [ManifestNumberConfigColumnKeys.CreatedAt]: string;
  [ManifestNumberConfigColumnKeys.UpdatedAt]: string;
}
