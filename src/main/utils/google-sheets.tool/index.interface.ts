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
