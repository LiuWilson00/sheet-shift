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
  RecipientIDNumber = '收貨人身分識別碼',
  Mark = '標記',
  UnitPrice = '單價',
  TotalAmount = '總金額',
  SenderEnglishName = '寄件人英文名稱',
  SenderPhoneNumber = '寄件人電話',
  SenderEnglishAddress = '寄件人英文地址',
  // 輸出新增的欄位
  OriginalAmount = '原始金額',
  ProcessedAmount = '加總金額',
  RealProductName = '正確品名',
  ProductClassNumber = '貨品分類編號',
  index = 'index',
}
export type SheetDataOriginal = {
  [key in ExcelColumnKeys]: string | number;
};

// 明確指定型別的 SheetData
export type SheetData = {
  // 以下是字串的欄位
  [ExcelColumnKeys.ShippingOrderNumber]: string;
  [ExcelColumnKeys.CourierTaxNumber]: string;
  [ExcelColumnKeys.ProductName]: string;
  [ExcelColumnKeys.Brand]: string;
  [ExcelColumnKeys.Specification]: string;
  [ExcelColumnKeys.QuantityUnit]: string;
  [ExcelColumnKeys.TradeConditionCode]: string;
  [ExcelColumnKeys.CurrencyCode]: string;
  [ExcelColumnKeys.BoxUnit]: string;
  [ExcelColumnKeys.CountryOfOriginCode]: string;
  [ExcelColumnKeys.RecipientTaxNumber]: string;
  [ExcelColumnKeys.RecipientEnglishName]: string;
  [ExcelColumnKeys.RecipientPhone]: string;
  [ExcelColumnKeys.RecipientEnglishAddress]: string;
  [ExcelColumnKeys.RecipientIDNumber]: string;
  [ExcelColumnKeys.Mark]: string;
  [ExcelColumnKeys.SenderEnglishName]: string;
  [ExcelColumnKeys.SenderPhoneNumber]: string;
  [ExcelColumnKeys.SenderEnglishAddress]: string;
  [ExcelColumnKeys.RealProductName]: string;
  [ExcelColumnKeys.ProductClassNumber]: string;
  // 以下是數字的欄位
  [ExcelColumnKeys.NetWeight]: number;
  [ExcelColumnKeys.GrossWeight]: number | '';
  [ExcelColumnKeys.Quantity]: number;
  [ExcelColumnKeys.TotalBoxes]: number | '';
  [ExcelColumnKeys.UnitPrice]: number;
  [ExcelColumnKeys.TotalAmount]: number;
  [ExcelColumnKeys.OriginalAmount]: number | '';
  [ExcelColumnKeys.ProcessedAmount]: number | '';
  [ExcelColumnKeys.index]: number;
};

export enum ProductNameMappingColumnKeys {
  OriginalProductName = '原始品名',
  CorrectProductName = '正確品名',
  TariffCode = '稅則', // 貨品分類編號
}

export interface ProductNameMapping {
  [ProductNameMappingColumnKeys.OriginalProductName]: string;
  [ProductNameMappingColumnKeys.CorrectProductName]: string;
  [ProductNameMappingColumnKeys.TariffCode]: string;
}
export interface ProductTariffCodeMap {
  [ProductNameMappingColumnKeys.CorrectProductName]: string;
  [ProductNameMappingColumnKeys.TariffCode]: string;
}
