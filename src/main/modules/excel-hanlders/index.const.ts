import { getCpuArch, Arch } from '../../utils';
import path from 'path';

import { app } from 'electron';
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
