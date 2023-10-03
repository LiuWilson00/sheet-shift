import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import {
  SHEET_SETTING_PATH,
  SHEET_RANGES,
  SheetRangeName,
} from './index.const';
import {
  TariffCodeSheet,
  AddressSheet,
  SystemSettingSheets,
} from './index.interface';
import { DataStore } from '../data-store.tool';
import { GaxiosResponse } from 'gaxios';
import { GoogleSheetConnectionStore } from '../../status-store';

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
export const tariffCodeSheet = new DataStore<TariffCodeSheet[]>([]);
export const addressSheet = new DataStore<AddressSheet[]>([]);
export const systemSettingSheets = new DataStore<SystemSettingSheets[]>([]);

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
  rangeName: SheetRangeName,
): T[] {
  const nameIndex = SHEET_RANGES.findIndex((name) => name === rangeName);
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
    const opt = {
      spreadsheetId: sheetSetting.spreadsheet_id,
      ranges: SHEET_RANGES, // Or whatever is the name of your sheet
    };

    let data = await gsapi.spreadsheets.values.batchGet(opt);

    tariffCodeSheet.set(
      getDataByRangeName<TariffCodeSheet>(data, SheetRangeName.TariffCodeSheet),
    );
    addressSheet.set(
      getDataByRangeName<AddressSheet>(data, SheetRangeName.Address),
    );
    systemSettingSheets.set(
      getDataByRangeName<SystemSettingSheets>(
        data,
        SheetRangeName.SystemSetting,
      ),
    );
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

function jsonToSheetArray(jsonArray: any[]): any[][] {
  if (!jsonArray.length) return [];

  // 取得所有的標題 (keys)
  const keys = Object.keys(jsonArray[0]);
  const result: any[][] = [keys];

  // 轉換每一個物件成為一個陣列並加到結果中
  for (const obj of jsonArray) {
    const row = keys.map((key) => obj[key]);
    result.push(row);
  }

  return result;
}

export async function updateSheetData(
  rangeName: string,
  jsonArray: any[],
  cl: JWT = client.get()!,
): Promise<boolean> {
  try {
    const sheetSetting = googleSheetConnectionSetting.get();
    const gsapi = google.sheets({ version: 'v4', auth: cl });

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
      systemSettingSheets.set(jsonArray);
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
