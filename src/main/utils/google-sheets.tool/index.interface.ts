export interface GoogleSheetSetting {
  keys: {
    client_email: string;
    private_key: string;
  };
  sheetSetting: {
    spreadsheetId: string;
  };
}
export enum TariffCodeSheetColumnKeys {
  OriginalProductName = '原始品名',
  CorrectProductName = '正確品名',
  TariffCode = '稅則', // 貨品分類編號
}

export enum AddressSheetColumnKeys {
  Number = '序號',
  Address = '地址',
}

export enum SystemSettingSheetsColumnKeys {
  Key = 'Key',
  Value = 'Value',
}

export interface TariffCodeSheet {
  [TariffCodeSheetColumnKeys.OriginalProductName]: string;
  [TariffCodeSheetColumnKeys.CorrectProductName]: string;
  [TariffCodeSheetColumnKeys.TariffCode]: number;
}

export interface AddressSheet {
  [AddressSheetColumnKeys.Number]: number;
  [AddressSheetColumnKeys.Address]: string;
}

export interface SystemSettingSheets {
  [SystemSettingSheetsColumnKeys.Key]: string;
  [SystemSettingSheetsColumnKeys.Value]: string;
}
