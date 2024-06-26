import {
  SheetData,
  ExcelColumnKeys,
  ProductNameMapping,
  ProductNameMappingColumnKeys,
  SheetDataOriginal,
} from '../index.interface';

export const stringKeys: ExcelColumnKeys[] = [
  ExcelColumnKeys.ShippingOrderNumber,
  ExcelColumnKeys.CourierTaxNumber,
  ExcelColumnKeys.ProductName,
  ExcelColumnKeys.Brand,
  ExcelColumnKeys.Specification,
  ExcelColumnKeys.QuantityUnit,
  ExcelColumnKeys.TradeConditionCode,
  ExcelColumnKeys.CurrencyCode,
  ExcelColumnKeys.BoxUnit,
  ExcelColumnKeys.CountryOfOriginCode,
  ExcelColumnKeys.RecipientTaxNumber,
  ExcelColumnKeys.RecipientEnglishName,
  ExcelColumnKeys.RecipientPhone,
  ExcelColumnKeys.RecipientEnglishAddress,
  ExcelColumnKeys.RecipientIDNumber,
  ExcelColumnKeys.Mark,
  ExcelColumnKeys.SenderEnglishName,
  ExcelColumnKeys.SenderPhoneNumber,
  ExcelColumnKeys.SenderEnglishAddress,
  ExcelColumnKeys.RealProductName,
  ExcelColumnKeys.ProductClassNumber,
];
export const numbarKeys: ExcelColumnKeys[] = [
  ExcelColumnKeys.NetWeight,
  ExcelColumnKeys.GrossWeight,
  ExcelColumnKeys.Quantity,
  ExcelColumnKeys.TotalBoxes,
  ExcelColumnKeys.UnitPrice,
  ExcelColumnKeys.TotalAmount,
  ExcelColumnKeys.OriginalAmount,
  ExcelColumnKeys.ProcessedAmount,
  ExcelColumnKeys.index,
];
export const defaultSheetData: SheetData = {
  [ExcelColumnKeys.ShippingOrderNumber]: '',
  [ExcelColumnKeys.CourierTaxNumber]: '',
  [ExcelColumnKeys.ProductName]: '',
  [ExcelColumnKeys.Brand]: '',
  [ExcelColumnKeys.Specification]: '',
  [ExcelColumnKeys.QuantityUnit]: '',
  [ExcelColumnKeys.TradeConditionCode]: '',
  [ExcelColumnKeys.CurrencyCode]: '',
  [ExcelColumnKeys.BoxUnit]: '',
  [ExcelColumnKeys.CountryOfOriginCode]: '',
  [ExcelColumnKeys.RecipientTaxNumber]: '',
  [ExcelColumnKeys.RecipientEnglishName]: '',
  [ExcelColumnKeys.RecipientPhone]: '',
  [ExcelColumnKeys.RecipientEnglishAddress]: '',
  [ExcelColumnKeys.RecipientIDNumber]: '',
  [ExcelColumnKeys.Mark]: '',
  [ExcelColumnKeys.SenderEnglishName]: '',
  [ExcelColumnKeys.SenderPhoneNumber]: '',
  [ExcelColumnKeys.SenderEnglishAddress]: '',
  [ExcelColumnKeys.RealProductName]: '',
  [ExcelColumnKeys.ProductClassNumber]: '',
  [ExcelColumnKeys.NetWeight]: 0,
  [ExcelColumnKeys.GrossWeight]: 0,
  [ExcelColumnKeys.Quantity]: 0,
  [ExcelColumnKeys.TotalBoxes]: 0,
  [ExcelColumnKeys.UnitPrice]: 0,
  [ExcelColumnKeys.TotalAmount]: 0,
  [ExcelColumnKeys.OriginalAmount]: 0,
  [ExcelColumnKeys.ProcessedAmount]: 0,
  [ExcelColumnKeys.index]: 0,
};
