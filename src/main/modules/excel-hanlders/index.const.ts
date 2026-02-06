import path from 'path';

import { app } from 'electron';
import { getCpuArch, Arch } from '../../utils';
import { ExcelColumnKeys } from './index.interface';

export const CPU_ARCH = getCpuArch();

export const STATIC_RESOURCE_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets', 'static-resource')
  : path.join(__dirname, '../../../../assets/static-resource');

export const excelSuffix = CPU_ARCH === Arch.arm ? 'arm' : 'x86';

export const ORIGINAL_DATA_TEMPLATE_PATH = path.join(
  STATIC_RESOURCE_PATH,
  `original-data-template-${excelSuffix}.xlsx`,
);

export const SHOPEE_DATA_TEMPLATE_PATH = path.join(
  STATIC_RESOURCE_PATH,
  `shopee-data-template-${excelSuffix}.xlsx`,
);

export const defaultColumnOrder = [
  {
    headerKey: ExcelColumnKeys.ShippingOrderNumber,
    valueKey: ExcelColumnKeys.ShippingOrderNumber,
    columnIndex: 1,
  },
  {
    headerKey: ExcelColumnKeys.CourierTaxNumber,
    valueKey: ExcelColumnKeys.CourierTaxNumber,
    columnIndex: 2,
  },
  {
    headerKey: ExcelColumnKeys.ProductName,
    valueKey: ExcelColumnKeys.ProductName,
    columnIndex: 4,
  },
  {
    headerKey: '正確品名',
    valueKey: ExcelColumnKeys.RealProductName,
    columnIndex: 5,
  },
  {
    headerKey: '貨品分類列號',
    valueKey: ExcelColumnKeys.ProductClassNumber,
    columnIndex: 6,
  },
  {
    headerKey: ExcelColumnKeys.Brand,
    valueKey: ExcelColumnKeys.Brand,
    columnIndex: 7,
  },
  {
    headerKey: ExcelColumnKeys.Specification,
    valueKey: ExcelColumnKeys.Specification,
    columnIndex: 8,
  },
  {
    headerKey: ExcelColumnKeys.NetWeight,
    valueKey: ExcelColumnKeys.NetWeight,
    columnIndex: 9,
  },
  {
    headerKey: ExcelColumnKeys.GrossWeight,
    valueKey: ExcelColumnKeys.GrossWeight,
    columnIndex: 10,
  },
  {
    headerKey: ExcelColumnKeys.Quantity,
    valueKey: ExcelColumnKeys.Quantity,
    columnIndex: 11,
  },
  {
    headerKey: ExcelColumnKeys.QuantityUnit,
    valueKey: ExcelColumnKeys.QuantityUnit,
    columnIndex: 12,
  },
  {
    headerKey: ExcelColumnKeys.TradeConditionCode,
    valueKey: ExcelColumnKeys.TradeConditionCode,
    columnIndex: 13,
  },
  {
    headerKey: ExcelColumnKeys.CurrencyCode,
    valueKey: ExcelColumnKeys.CurrencyCode,
    columnIndex: 14,
  },
  {
    headerKey: ExcelColumnKeys.UnitPrice,
    valueKey: ExcelColumnKeys.UnitPrice,
    columnIndex: 15,
  },
  {
    headerKey: ExcelColumnKeys.TotalAmount,
    valueKey: ExcelColumnKeys.TotalAmount,
    columnIndex: 16,
  },
  {
    headerKey: ExcelColumnKeys.ProcessedAmount,
    valueKey: ExcelColumnKeys.ProcessedAmount,
    columnIndex: 17,
  },
  {
    headerKey: ExcelColumnKeys.TotalBoxes,
    valueKey: ExcelColumnKeys.TotalBoxes,
    columnIndex: 18,
  },
  {
    headerKey: ExcelColumnKeys.BoxUnit,
    valueKey: ExcelColumnKeys.BoxUnit,
    columnIndex: 19,
  },
  {
    headerKey: ExcelColumnKeys.SenderEnglishName,
    valueKey: ExcelColumnKeys.SenderEnglishName,
    columnIndex: 20,
  },
  {
    headerKey: ExcelColumnKeys.SenderPhoneNumber,
    valueKey: ExcelColumnKeys.SenderPhoneNumber,
    columnIndex: 21,
  },
  {
    headerKey: ExcelColumnKeys.SenderEnglishAddress,
    valueKey: ExcelColumnKeys.SenderEnglishAddress,
    columnIndex: 22,
  },
  {
    headerKey: ExcelColumnKeys.CountryOfOriginCode,
    valueKey: ExcelColumnKeys.CountryOfOriginCode,
    columnIndex: 23,
  },
  {
    headerKey: ExcelColumnKeys.RecipientTaxNumber,
    valueKey: ExcelColumnKeys.RecipientTaxNumber,
    columnIndex: 24,
  },
  {
    headerKey: ExcelColumnKeys.RecipientIDNumber,
    valueKey: ExcelColumnKeys.RecipientIDNumber,
    columnIndex: 25,
  },
  {
    headerKey: ExcelColumnKeys.RecipientEnglishName,
    valueKey: ExcelColumnKeys.RecipientEnglishName,
    columnIndex: 26,
  },
  {
    headerKey: ExcelColumnKeys.RecipientPhone,
    valueKey: ExcelColumnKeys.RecipientPhone,
    columnIndex: 27,
  },
  {
    headerKey: ExcelColumnKeys.RecipientEnglishAddress,
    valueKey: ExcelColumnKeys.RecipientEnglishAddress,
    columnIndex: 28,
  },
  {
    headerKey: ExcelColumnKeys.Mark,
    valueKey: ExcelColumnKeys.Mark,
    columnIndex: 31,
  },
  // {
  //   headerKey: ExcelColumnKeys.index,
  //   valueKey: ExcelColumnKeys.index,
  //   columnIndex: 31,
  // },
];

/** 交易代碼欄位（AG 欄，column 33） */
export const TRANSACTION_CODE_COLUMN_INDEX = 33;

// ==========================================
// 背景色優先級系統
// ==========================================

/** 行樣式資訊 */
export interface RowStyleInfo {
  /** ARGB 顏色字串（例如 'FFFF0000' 表示紅色） */
  backgroundColor: string;
  /** 優先級數字，越小越高 */
  priority: number;
  /** 可選：指定只標記特定欄位的索引（不指定則標記整行） */
  columnIndex?: number;
}

/** 行樣式映射 - key 是 jsonData 的索引 */
export type RowStyleMap = Map<number, RowStyleInfo[]>;

/** 背景色優先級常數 */
export const STYLE_PRIORITY = {
  /** 海關註記 - 最高優先 */
  CUSTOMS_NOTE: 1,
  /** 問題件 - 最高優先 */
  PROBLEM_ITEM: 1,
  /** 台北港特殊條件（毛重≥40 & 件數=1） */
  TAIPEI_BAY_SPECIAL: 2,
  /** 箱數高亮 */
  HIGHLIGHT_BOXES: 3,
  /** 金額高亮 */
  HIGHLIGHT_AMOUNT: 3,
};

/** 背景色常數 */
export const STYLE_COLORS = {
  /** 紅色 - 海關註記/問題件 */
  RED: 'FFFF0000',
  /** 黃色 - 特殊條件/高亮 */
  YELLOW: 'FFFFFF00',
};

/**
 * 合併多個 RowStyleMap
 */
export function mergeRowStyleMaps(...maps: RowStyleMap[]): RowStyleMap {
  const result: RowStyleMap = new Map();
  maps.forEach((map) => {
    map.forEach((styles, index) => {
      const existing = result.get(index) || [];
      existing.push(...styles);
      result.set(index, existing);
    });
  });
  return result;
}

/**
 * 取得行的最高優先級樣式（數字最小）
 */
export function getBestStyle(styles: RowStyleInfo[]): RowStyleInfo | undefined {
  if (!styles || styles.length === 0) return undefined;
  return styles.reduce((best, current) =>
    current.priority < best.priority ? current : best,
  );
}

export const shopeeColumnOrder = [
  {
    headerKey: ExcelColumnKeys.ShippingOrderNumber,
    valueKey: ExcelColumnKeys.ShippingOrderNumber,
    columnIndex: 1,
  },
  {
    headerKey: ExcelColumnKeys.CourierTaxNumber,
    valueKey: ExcelColumnKeys.CourierTaxNumber,
    columnIndex: 2,
  },
  {
    headerKey: ExcelColumnKeys.ProductName,
    valueKey: ExcelColumnKeys.ProductName,
    columnIndex: 4,
  },
  {
    headerKey: '正確品名',
    valueKey: ExcelColumnKeys.RealProductName,
    columnIndex: 5,
  },
  {
    headerKey: '貨品分類列號',
    valueKey: ExcelColumnKeys.ProductClassNumber,
    columnIndex: 6,
  },
  {
    headerKey: ExcelColumnKeys.Brand,
    valueKey: ExcelColumnKeys.Brand,
    columnIndex: 7,
  },
  {
    headerKey: ExcelColumnKeys.Specification,
    valueKey: ExcelColumnKeys.Specification,
    columnIndex: 8,
  },
  {
    headerKey: ExcelColumnKeys.NetWeight,
    valueKey: ExcelColumnKeys.NetWeight,
    columnIndex: 9,
  },
  {
    headerKey: ExcelColumnKeys.GrossWeight,
    valueKey: ExcelColumnKeys.GrossWeight,
    columnIndex: 10,
  },
  {
    headerKey: ExcelColumnKeys.Quantity,
    valueKey: ExcelColumnKeys.Quantity,
    columnIndex: 11,
  },
  {
    headerKey: ExcelColumnKeys.QuantityUnit,
    valueKey: ExcelColumnKeys.QuantityUnit,
    columnIndex: 12,
  },
  {
    headerKey: ExcelColumnKeys.TradeConditionCode,
    valueKey: ExcelColumnKeys.TradeConditionCode,
    columnIndex: 13,
  },
  {
    headerKey: ExcelColumnKeys.CurrencyCode,
    valueKey: ExcelColumnKeys.CurrencyCode,
    columnIndex: 14,
  },
  {
    headerKey: ExcelColumnKeys.UnitPrice,
    valueKey: ExcelColumnKeys.UnitPrice,
    columnIndex: 15,
  },
  {
    headerKey: ExcelColumnKeys.TotalAmount,
    valueKey: ExcelColumnKeys.TotalAmount,
    columnIndex: 16,
  },
  {
    headerKey: ExcelColumnKeys.OriginalAmount,
    valueKey: ExcelColumnKeys.OriginalAmount,
    columnIndex: 17,
  },
  {
    headerKey: ExcelColumnKeys.ProcessedAmount,
    valueKey: ExcelColumnKeys.ProcessedAmount,
    columnIndex: 18,
  },
  {
    headerKey: ExcelColumnKeys.TotalBoxes,
    valueKey: ExcelColumnKeys.TotalBoxes,
    columnIndex: 19,
  },
  {
    headerKey: ExcelColumnKeys.BoxUnit,
    valueKey: ExcelColumnKeys.BoxUnit,
    columnIndex: 20,
  },
  {
    headerKey: ExcelColumnKeys.SenderEnglishName,
    valueKey: ExcelColumnKeys.SenderEnglishName,
    columnIndex: 21,
  },
  {
    headerKey: ExcelColumnKeys.SenderPhoneNumber,
    valueKey: ExcelColumnKeys.SenderPhoneNumber,
    columnIndex: 22,
  },
  {
    headerKey: ExcelColumnKeys.SenderEnglishAddress,
    valueKey: ExcelColumnKeys.SenderEnglishAddress,
    columnIndex: 23,
  },
  {
    headerKey: ExcelColumnKeys.CountryOfOriginCode,
    valueKey: ExcelColumnKeys.CountryOfOriginCode,
    columnIndex: 24,
  },
  {
    headerKey: ExcelColumnKeys.RecipientTaxNumber,
    valueKey: ExcelColumnKeys.RecipientTaxNumber,
    columnIndex: 25,
  },
  {
    headerKey: ExcelColumnKeys.RecipientIDNumber,
    valueKey: ExcelColumnKeys.RecipientIDNumber,
    columnIndex: 26,
  },
  {
    headerKey: ExcelColumnKeys.RecipientEnglishName,
    valueKey: ExcelColumnKeys.RecipientEnglishName,
    columnIndex: 27,
  },
  {
    headerKey: ExcelColumnKeys.RecipientPhone,
    valueKey: ExcelColumnKeys.RecipientPhone,
    columnIndex: 28,
  },
  {
    headerKey: ExcelColumnKeys.RecipientEnglishAddress,
    valueKey: ExcelColumnKeys.RecipientEnglishAddress,
    columnIndex: 29,
  },
  {
    headerKey: ExcelColumnKeys.Mark,
    valueKey: ExcelColumnKeys.Mark,
    columnIndex: 32,
  },
  // {
  //   headerKey: ExcelColumnKeys.index,
  //   valueKey: ExcelColumnKeys.index,
  //   columnIndex: 31,
  // },
];
