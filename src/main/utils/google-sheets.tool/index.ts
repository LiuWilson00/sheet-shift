import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import {
  SHEET_SETTING_PATH,
  SHEET_RANGES,
  SheetRangeName,
} from './index.const';
import {
  AddressSheet,
  SystemSettingSheets,
  UsersSheet,
} from './index.interface';
import { DataStore } from '../data-store.tool';
import { GaxiosResponse } from 'gaxios';
import { GoogleSheetConnectionStore } from '../../status-store';
import { ProductNameMapping } from '../../../renderer/utils/excel.interface';

export interface GoogleSheetConnectionResult {
  isConnected: boolean;
  error?: string;
  code?:
    | 'AUTHORIZE_ERROR'
    | 'INIT_GOOGLE_SHEET_DATA_ERROR'
    | 'NO_GOOGLE_SHEET_SETTING';
}

export interface GoogleSheetConnectionSetting {
  client_email: string;
  private_key: string;
  spreadsheet_id: string;
}

const googleSheetConnectionSetting =
  new DataStore<GoogleSheetConnectionSetting>({
    client_email: '',
    private_key: '',
    spreadsheet_id: '',
  });
export const tariffCodeSheet = new DataStore<ProductNameMapping[]>([]);
export const systemTariffCodeSheet = new DataStore<ProductNameMapping[]>([]);
export const addressSheet = new DataStore<AddressSheet[]>([]);
export const systemSettingSheetNames = new DataStore<string[]>([]);

export const getProductNameMap = () => [
  ...systemTariffCodeSheet.get(),
  ...tariffCodeSheet.get(),
];
export const systemSettingMap: {
  [key: string]: DataStore<SystemSettingSheets[]>;
} = {
  default: new DataStore<SystemSettingSheets[]>([]),
};

// export const systemSettingSheets = new DataStore<SystemSettingSheets[]>([]);

export const usersSheet = new DataStore<UsersSheet[]>([]);

export function getGoogleSheetAPISetting():
  | GoogleSheetConnectionSetting
  | false {
  if (fs.existsSync(SHEET_SETTING_PATH)) {
    const settingFile = fs.readFileSync(SHEET_SETTING_PATH, 'utf8');

    return JSON.parse(settingFile) as GoogleSheetConnectionSetting;
  } else {
    return false;
  }
}

export const client = new DataStore<JWT | null>(null);

export function initGoogleConnection() {
  return new Promise<GoogleSheetConnectionResult>((resolve, reject) => {
    const tryGetGoogleSheetAPISetting = getGoogleSheetAPISetting();

    if (tryGetGoogleSheetAPISetting) {
      googleSheetConnectionSetting.set(tryGetGoogleSheetAPISetting);
      const _googleSheetConnectionSetting = googleSheetConnectionSetting.get();
      client.set(
        new google.auth.JWT({
          email: _googleSheetConnectionSetting.client_email,
          key: _googleSheetConnectionSetting.private_key,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        }),
      );
      client.get()!.authorize((err, tokens) => {
        if (err) {
          resolve({
            isConnected: false,
            error: 'authorize error',
            code: 'AUTHORIZE_ERROR',
          });
          return;
        } else {
          console.log('Connected!');
          GoogleSheetConnectionStore.set({
            client_email: _googleSheetConnectionSetting.client_email,
            private_key: _googleSheetConnectionSetting.private_key,
            spreadsheet_id: _googleSheetConnectionSetting.spreadsheet_id,
            isConnected: true,
          });
          initGoogleSheetData(client.get()!).then((res) => {
            if (res) {
              resolve({
                isConnected: true,
              });
            } else {
              reject({
                isConnected: false,
                error: 'initGoogleSheetData error',
                code: 'INIT_GOOGLE_SHEET_DATA_ERROR',
              });
            }
          });
        }
      });
    } else {
      console.log('No google sheet setting found.');
      resolve({
        isConnected: false,
        error: 'No google sheet setting found.',
        code: 'NO_GOOGLE_SHEET_SETTING',
      });
    }
  });
}

export function reconnectGoogleSheet(
  setting: GoogleSheetConnectionSetting = googleSheetConnectionSetting.get()!,
) {
  GoogleSheetConnectionStore.set({
    client_email: setting.client_email,
    private_key: setting.private_key,
    spreadsheet_id: setting.spreadsheet_id,
    isConnected: false,
  });
  client.set(
    new google.auth.JWT({
      email: setting.client_email,
      key: setting.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }),
  );
  return new Promise<boolean>((resolve, reject) => {
    client.get()!.authorize((err, tokens) => {
      if (err) {
        resolve(false);
        return;
      } else {
        console.log('Connected!');
        GoogleSheetConnectionStore.set({
          client_email: setting.client_email,
          private_key: setting.private_key,
          spreadsheet_id: setting.spreadsheet_id,
          isConnected: true,
        });
        initGoogleSheetData(client.get()!);
        resolve(true);
      }
    });
  });
}

function getDataByRangeName<T>(
  data: GaxiosResponse<sheets_v4.Schema$BatchGetValuesResponse>,
  rangeName: string,
  systemSettingSheetNames: string[] = [],
): T[] {
  const nameIndex = [...SHEET_RANGES, ...systemSettingSheetNames].findIndex(
    (name) => name === rangeName,
  );
  let dataArray = data?.data?.valueRanges?.[nameIndex]?.values ?? [];

  if (!dataArray) {
    console.log('No data found.');
    return [];
  }

  const newData = originalSheetArrayToJson<T>(dataArray);
  return newData;
}

function originalSheetArrayToJson<T>(dataArray: any[][]): T[] {
  let keys = dataArray[0];
  let jsonData: T[] = [];

  for (let i = 1; i < dataArray.length; i++) {
    let obj: any = {};
    for (let j = 0; j < dataArray[i].length; j++) {
      obj[keys[j]] = dataArray[i][j];
    }
    jsonData.push(obj as T);
  }

  return jsonData;
}

export async function initGoogleSheetData(cl: JWT) {
  try {
    const sheetSetting = googleSheetConnectionSetting.get();
    const gsapi = google.sheets({ version: 'v4', auth: cl });
    const sheetNames = await getSheetNames(cl);
    const _systemSettingSheetNames = sheetNames?.filter(
      (name) =>
        name?.startsWith(SheetRangeName.SystemSetting) &&
        name !== SheetRangeName.SystemSetting,
    ) as string[];
    systemSettingSheetNames.set(_systemSettingSheetNames);
    const opt = {
      spreadsheetId: sheetSetting.spreadsheet_id,
      ranges: [...SHEET_RANGES, ..._systemSettingSheetNames],
    };

    let data = await gsapi.spreadsheets.values.batchGet(opt);

    tariffCodeSheet.set(
      getDataByRangeName<ProductNameMapping>(
        data,
        SheetRangeName.TariffCodeSheet,
      ),
    );
    addressSheet.set(
      getDataByRangeName<AddressSheet>(data, SheetRangeName.Address),
    );
    systemSettingMap?.default.set(
      getDataByRangeName<SystemSettingSheets>(
        data,
        SheetRangeName.SystemSetting,
      ),
    );

    systemTariffCodeSheet.set(
      getDataByRangeName<ProductNameMapping>(
        data,
        SheetRangeName.SystemProductMap,
      ),
    );
    usersSheet.set(getDataByRangeName<UsersSheet>(data, SheetRangeName.Users));

    _systemSettingSheetNames?.forEach(async (name) => {
      const _name = name as string;

      systemSettingMap[_name] = new DataStore<SystemSettingSheets[]>([]);

      systemSettingMap[_name]?.set(
        getDataByRangeName<SystemSettingSheets>(
          data,
          _name,
          _systemSettingSheetNames,
        ),
      );
    });

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}
type JsonToSheetArrayOptions = {
  disableAddTitle?: boolean;
  keySorting?: string[];
};

function jsonToSheetArray(
  jsonArray: any[],
  options: JsonToSheetArrayOptions = {
    disableAddTitle: false,
    keySorting: [],
  },
): any[][] {
  if (!jsonArray.length) return [];
  const { disableAddTitle, keySorting } = options;

  // 取得所有的標題 (keys)
  const keys = Object.keys(jsonArray[0]);
  const result: any[][] = disableAddTitle ? [] : [keys];

  // 轉換每一個物件成為一個陣列並加到結果中
  for (const obj of jsonArray) {
    const row = keys
      .sort((keyA, keyB) => {
        if (!keySorting) return 0;

        if (keySorting.length) {
          const indexA = keySorting.findIndex((key) => key === keyA);
          const indexB = keySorting.findIndex((key) => key === keyB);

          if (indexA > indexB) {
            return 1;
          } else if (indexA < indexB) {
            return -1;
          } else {
            return 0;
          }
        } else {
          return 0;
        }
      })
      .map((key) => obj[key]);
    result.push(row);
  }

  return result;
}

export async function updateSheetData(
  rangeName: string,
  jsonArray: any[],
  options: { cl?: JWT } = { cl: client.get()! },
): Promise<boolean> {
  const { cl } = options;
  try {
    const sheetSetting = googleSheetConnectionSetting.get();
    const gsapi = google.sheets({ version: 'v4', auth: cl ?? client.get()! });

    const values = jsonToSheetArray(jsonArray);

    const opt = {
      spreadsheetId: sheetSetting.spreadsheet_id,
      range: rangeName, // 確保傳入的 rangeName 有指定具體的範圍，例如 'Sheet1!A1:D10'
      valueInputOption: 'RAW', // 這表示我們直接將值放入，不進行任何其他處理
      resource: {
        values: values,
      },
    };

    const response = await gsapi.spreadsheets.values.update(opt);

    if (response.status === 200) {
      console.log('Sheet updated successfully!');
      return true;
    } else {
      console.error('Error updating sheet:', response.statusText);
      return false;
    }
  } catch (e) {
    console.error('Error updating sheet:', e);
    return false;
  }
}

export async function addSheetData(
  rangeName: string,
  jsonArray: any[],
  options: { cl?: JWT; jsonTransfromOptions?: JsonToSheetArrayOptions } = {
    cl: client.get()!,
    jsonTransfromOptions: undefined,
  },
): Promise<boolean> {
  const { cl, jsonTransfromOptions } = options;

  try {
    const sheetSetting = googleSheetConnectionSetting.get();
    const gsapi = google.sheets({ version: 'v4', auth: cl ?? client.get()! });

    const values = jsonToSheetArray(jsonArray, jsonTransfromOptions);

    const opt = {
      spreadsheetId: sheetSetting.spreadsheet_id,
      range: rangeName, // 確保傳入的 rangeName 有指定具體的範圍，例如 'Sheet1!A1:D10'
      valueInputOption: 'RAW', // 這表示我們直接將值放入，不進行任何其他處理
      resource: {
        values: values,
      },
    };
    const response = await gsapi.spreadsheets.values.append(opt);

    if (response.status === 200) {
      console.log('Sheet updated successfully!');
      return true;
    } else {
      console.error('Error updating sheet:', response.statusText);
      return false;
    }
  } catch (e) {
    console.error('Error updating sheet:', e);
    return false;
  }
}

export async function getSheetNames(cl: JWT = client.get()!) {
  try {
    const sheetSetting = googleSheetConnectionSetting.get();
    const gsapi = google.sheets({ version: 'v4', auth: cl });

    const response = await gsapi.spreadsheets.get({
      spreadsheetId: sheetSetting.spreadsheet_id,
    });

    const sheetNames = response?.data?.sheets?.map(
      (sheet) => sheet?.properties?.title,
    );
    return sheetNames;
  } catch (e) {
    console.error('Error fetching sheet names:', e);
    throw e; // 或者處理錯誤
  }
}
export function addSheet(sheetTitle: string, cl: JWT = client.get()!) {
  try {
    const sheetSetting = googleSheetConnectionSetting.get();
    const gsapi = google.sheets({ version: 'v4', auth: cl });

    const addSheetRequest = {
      addSheet: {
        properties: {
          title: sheetTitle,
        },
      },
    };

    gsapi.spreadsheets.batchUpdate(
      {
        spreadsheetId: sheetSetting.spreadsheet_id,
        requestBody: { requests: [addSheetRequest] },
      },
      (err: any, _response: any) => {
        if (err) {
          console.error('Error adding sheet:', err);
          throw err;
        }
        console.log(`Sheet "${sheetTitle}" added successfully.`);
      },
    );
  } catch (e) {
    console.error('Error adding sheet:', e);
    throw e;
  }
}
export async function deleteSheet(sheetId: number, cl: JWT = client.get()!) {
  try {
    const sheetSetting = googleSheetConnectionSetting.get();
    const gsapi = google.sheets({ version: 'v4', auth: cl });

    const deleteSheetRequest = {
      deleteSheet: {
        sheetId: sheetId,
      },
    };

    await gsapi.spreadsheets.batchUpdate({
      spreadsheetId: sheetSetting.spreadsheet_id,
      requestBody: {
        requests: [deleteSheetRequest],
      },
    });

    console.log(`Sheet with ID ${sheetId} deleted successfully.`);
  } catch (e) {
    console.error('Error deleting sheet:', e);
    throw e;
  }
}
