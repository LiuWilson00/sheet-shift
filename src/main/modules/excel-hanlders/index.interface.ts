export enum ExcelColumnKeys {
  ShippingOrderNumber = '分提單號',
  CourierTaxNumber = '快遞業者統一編號',
  ProductName = '貨物名稱',
  Brand = '品牌',
  Specification = '規格',
  NetWeight = '淨重(kg)',
  GrossWeight = '毛重(kg)',
  Quantity = '數量',
  QuantityUnit = '數量單位',
  TradeConditionCode = '交易條件代碼',
  CurrencyCode = '單價幣代碼',
  TotalBoxes = '總件數(箱數)',
  BoxUnit = '件數單位',
  CountryOfOriginCode = '生產國別代碼',
  RecipientTaxNumber = '收貨人統一編號',
  RecipientEnglishName = '收貨人英文名稱',
  RecipientPhone = '收貨人電話',
  RecipientEnglishAddress = '收貨人英文地址',
  Mark = '標記',

  // 輸出新增的欄位

  RealProductName = '正確品名',
  ProductClassNumber = '貨品分類編號',
}

export interface OriginalExcelData {
  [ExcelColumnKeys.ShippingOrderNumber]: string;
  [ExcelColumnKeys.CourierTaxNumber]: string;
  [ExcelColumnKeys.ProductName]: string;
  [ExcelColumnKeys.Brand]: string;
  [ExcelColumnKeys.Specification]: string;
  [ExcelColumnKeys.NetWeight]: number;
  [ExcelColumnKeys.GrossWeight]: number;
  [ExcelColumnKeys.Quantity]: number;
  [ExcelColumnKeys.QuantityUnit]: string;
  [ExcelColumnKeys.TradeConditionCode]: string;
  [ExcelColumnKeys.CurrencyCode]: string;
  [ExcelColumnKeys.TotalBoxes]: number;
  [ExcelColumnKeys.BoxUnit]: string;
  [ExcelColumnKeys.CountryOfOriginCode]: string;
  [ExcelColumnKeys.RecipientTaxNumber]: string;
  [ExcelColumnKeys.RecipientEnglishName]: string;
  [ExcelColumnKeys.RecipientPhone]: string;
  [ExcelColumnKeys.RecipientEnglishAddress]: string;
  [ExcelColumnKeys.Mark]: string;
}

export interface CompletedExcelData extends OriginalExcelData {
  [ExcelColumnKeys.RealProductName]: string;
  [ExcelColumnKeys.ProductClassNumber]: number;
}
export enum ProductNameMappingColumnKeys {
  OriginalProductName = '原始品名',
  CorrectProductName = '正確品名',
  TariffCode = '稅則', // 貨品分類編號
}

export interface ProductNameMapping {
  [ProductNameMappingColumnKeys.OriginalProductName]: string;
  [ProductNameMappingColumnKeys.CorrectProductName]: string;
  [ProductNameMappingColumnKeys.TariffCode]: number;
}

export const columnOrder = [
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
    headerKey: ExcelColumnKeys.TotalBoxes,
    valueKey: ExcelColumnKeys.TotalBoxes,
    columnIndex: 17,
  },
  {
    headerKey: ExcelColumnKeys.BoxUnit,
    valueKey: ExcelColumnKeys.BoxUnit,
    columnIndex: 18,
  },
  {
    headerKey: ExcelColumnKeys.CountryOfOriginCode,
    valueKey: ExcelColumnKeys.CountryOfOriginCode,
    columnIndex: 22,
  },
  {
    headerKey: ExcelColumnKeys.RecipientTaxNumber,
    valueKey: ExcelColumnKeys.RecipientTaxNumber,
    columnIndex: 23,
  },
  {
    headerKey: ExcelColumnKeys.RecipientEnglishName,
    valueKey: ExcelColumnKeys.RecipientEnglishName,
    columnIndex: 25,
  },
  {
    headerKey: ExcelColumnKeys.RecipientPhone,
    valueKey: ExcelColumnKeys.RecipientPhone,
    columnIndex: 26,
  },
  {
    headerKey: ExcelColumnKeys.RecipientEnglishAddress,
    valueKey: ExcelColumnKeys.RecipientEnglishAddress,
    columnIndex: 27,
  },
  {
    headerKey: ExcelColumnKeys.Mark,
    valueKey: ExcelColumnKeys.Mark,
    columnIndex: 30,
  },
];
