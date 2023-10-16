import { systemSettingSheets } from './google-sheets.tool';
import {
  SystemSettingSheets,
  SystemSettingSheetsColumnKeys,
} from './google-sheets.tool/index.interface';

export function getSystemSetting() {
  return transformSettingsArray(systemSettingSheets.get());
}

const systemSettingTypeMap = {
  SYSTEM_SETTING: {
    UNIT_TRANSLATE_LIMIT: 'number',
    NET_WEIGHT_INTERVAL: 'number',
    KPC_NUMBER: 'number',
  },
  DEFAULT_PRICE_SETTING: {
    OPE_PIECE: 'array',
    TWO_PIECE: 'array',
    THREE_OR_MORE_PIECES: 'array',
    ADJUSTMENT_RATE: 'array',
  },
};

function transformSettingsArray(arr: Array<SystemSettingSheets>): Settings {
  let result: Settings = {
    SYSTEM_SETTING: {
      UNIT_TRANSLATE_LIMIT: 0,
      NET_WEIGHT_INTERVAL: 0,
      KPC_NUMBER: 0,
    },
    DEFAULT_PRICE_SETTING: {
      OPE_PIECE: [0, 0],
      TWO_PIECE: [0, 0],
      THREE_OR_MORE_PIECES: [0, 0],
      ADJUSTMENT_RATE: [0, 0],
    },
  };
  console.log(arr);
  arr.forEach((item) => {
    const splitedArr = item[SystemSettingSheetsColumnKeys.Key].split('--');
    const category = splitedArr[0] as keyof Settings;
    const key = splitedArr[1];
    const value = item[SystemSettingSheetsColumnKeys.Value];

    const processedValue = valueTypeProcess(category, key, value);

    (result[category] as any)[key] = processedValue;
  });

  return result as Settings;
}

function valueTypeProcess(category: string, key: string, value: string) {
  const type = (systemSettingTypeMap as any)[category][key];

  switch (type) {
    case 'number':
      return Number(value);
    case 'array':
      return value.split(',').map((item) => Number(item));
    default:
      return value;
  }
}

export interface SystemSetting {
  UNIT_TRANSLATE_LIMIT: number;
  NET_WEIGHT_INTERVAL: number;
  KPC_NUMBER: number;
}

export interface DefaultPriceSetting {
  OPE_PIECE: [number, number];
  TWO_PIECE: [number, number];
  THREE_OR_MORE_PIECES: [number, number];
  ADJUSTMENT_RATE: [number, number];
}

export interface Settings {
  SYSTEM_SETTING: SystemSetting;
  DEFAULT_PRICE_SETTING: DefaultPriceSetting;
}
