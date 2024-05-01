import {
  excelToJSON,
  jsonGroupBy,
  getDistinctValuesForKey,
  findAllIndex,
  getRandomIntBetween,
  addressSheet,
  AddressSheet,
} from '../../../utils';
import { AddressSheetColumnKeys } from '../../../utils/google-sheets.tool/index.interface';
import { getSystemSetting } from '../../../utils';
import {
  SheetData,
  ExcelColumnKeys,
  ProductNameMapping,
  ProductNameMappingColumnKeys,
  SheetDataOriginal,
} from '../index.interface';
import { DefaultPriceSetting } from '../../../utils/setting.tool';
import { getProductNameMap } from '../../../utils/google-sheets.tool';
import { stringKeys, numbarKeys, defaultSheetData } from './service.const';

export function groupExcelDataShopee(originalData: SheetData[]) {
  const systemSetting = getSystemSetting();
  const { KPC_NUMBER, UNIT_TRANSLATE_LIMIT } = systemSetting.SYSTEM_SETTING;
  return jsonGroupBy(
    originalData,
    [ExcelColumnKeys.ShippingOrderNumber, ExcelColumnKeys.ProductName],
    (datas) => {
      const SHOPEE_UNIT_PRICE_RANGE = [10, 15];
      const SHOPEE_UNIT_PRICE_LIMIT = 10;
      const SHOPEE_UNIT_PRICE_RATE = 0.7;
      const {
        totalNetWeight,
        totalGrossWeight,
        totalQuantity,
        totalBoxes,
        summaryTotalAmount,
      } = getDataSummary(datas);
      const minUnitPrice = findMinUnitPrice(datas) * SHOPEE_UNIT_PRICE_RATE;
      const _newPrice =
        minUnitPrice < SHOPEE_UNIT_PRICE_LIMIT
          ? getRandomIntBetween(
              SHOPEE_UNIT_PRICE_RANGE[0],
              SHOPEE_UNIT_PRICE_RANGE[1],
            )
          : minUnitPrice;
      const newPrice = Math.ceil(_newPrice);

      const { newQuantity, newUnit } = unitTranslate(totalQuantity);

      return {
        ...datas[0],
        [ExcelColumnKeys.UnitPrice]: newPrice,
        [ExcelColumnKeys.QuantityUnit]: newUnit,
        [ExcelColumnKeys.NetWeight]: totalNetWeight,
        [ExcelColumnKeys.GrossWeight]: totalGrossWeight,
        [ExcelColumnKeys.Quantity]: newQuantity,
        [ExcelColumnKeys.TotalBoxes]: totalBoxes,
        [ExcelColumnKeys.TotalAmount]: newPrice * newQuantity,
        [ExcelColumnKeys.OriginalAmount]: summaryTotalAmount,
      };
    },
  );

  function findMinUnitPrice(datas: SheetData[]) {
    let minUnitPrice = Infinity;
    datas.forEach((data) => {
      const unitPrice = Number(data[ExcelColumnKeys.UnitPrice]);
      if (unitPrice < minUnitPrice) {
        minUnitPrice = unitPrice;
      }
    });
    return minUnitPrice;
  }

  function getDataSummary(datas: SheetData[]) {
    let totalNetWeight = 0;
    let totalGrossWeight = 0;
    let totalQuantity = 0;
    let totalBoxes = 0;
    let summaryTotalAmount = 0;

    datas.forEach((data) => {
      totalNetWeight += Number(data[ExcelColumnKeys.NetWeight] ?? 0);
      totalGrossWeight += Number(data[ExcelColumnKeys.GrossWeight] ?? 0);
      totalQuantity += Number(data[ExcelColumnKeys.Quantity] ?? 0);
      totalBoxes += Number(data[ExcelColumnKeys.TotalBoxes] ?? 0);
      summaryTotalAmount += Number(data[ExcelColumnKeys.TotalAmount] ?? 0);
    });

    return {
      totalNetWeight,
      totalGrossWeight,
      totalQuantity,
      totalBoxes,
      summaryTotalAmount,
    };
  }

  function unitTranslate(totalQuantity: number): {
    newUnit: 'KPC' | 'PCE';
    newQuantity: number;
  } {
    if (totalQuantity > UNIT_TRANSLATE_LIMIT) {
      return {
        newUnit: 'KPC',
        newQuantity: totalQuantity / KPC_NUMBER,
      };
    }
    return {
      newUnit: 'PCE',
      newQuantity: totalQuantity,
    };
  }
}

export function groupExcelDataShopeeNew(originalData: SheetData[]) {
  const systemSetting = getSystemSetting();
  const { KPC_NUMBER, UNIT_TRANSLATE_LIMIT } = systemSetting.SYSTEM_SETTING;
  return jsonGroupBy(
    originalData,
    [ExcelColumnKeys.ShippingOrderNumber, ExcelColumnKeys.ProductName],
    (datas) => {
      const {
        totalNetWeight,
        totalGrossWeight,
        totalQuantity,
        totalBoxes,
        summaryTotalAmount,
      } = getDataSummary(datas);
      const _newPrice = summaryTotalAmount / totalQuantity;

      const newPrice = Math.round(_newPrice);

      const { newQuantity, newUnit } = unitTranslate(totalQuantity);

      return {
        ...datas[0],
        [ExcelColumnKeys.UnitPrice]: newPrice,
        [ExcelColumnKeys.QuantityUnit]: newUnit,
        [ExcelColumnKeys.NetWeight]: totalNetWeight,
        [ExcelColumnKeys.GrossWeight]: totalGrossWeight,
        [ExcelColumnKeys.Quantity]: newQuantity,
        [ExcelColumnKeys.TotalBoxes]: totalBoxes,
        [ExcelColumnKeys.TotalAmount]: newPrice * newQuantity,
        [ExcelColumnKeys.OriginalAmount]: summaryTotalAmount,
      };
    },
  );

  function getDataSummary(datas: SheetData[]) {
    let totalNetWeight = 0;
    let totalGrossWeight = 0;
    let totalQuantity = 0;
    let totalBoxes = 0;
    let summaryTotalAmount = 0;

    datas.forEach((data) => {
      totalNetWeight += Number(data[ExcelColumnKeys.NetWeight] ?? 0);
      totalGrossWeight += Number(data[ExcelColumnKeys.GrossWeight] ?? 0);
      totalQuantity += Number(data[ExcelColumnKeys.Quantity] ?? 0);
      totalBoxes += Number(data[ExcelColumnKeys.TotalBoxes] ?? 0);
      summaryTotalAmount += Number(data[ExcelColumnKeys.TotalAmount] ?? 0);
    });

    return {
      totalNetWeight,
      totalGrossWeight,
      totalQuantity,
      totalBoxes,
      summaryTotalAmount,
    };
  }

  function unitTranslate(totalQuantity: number): {
    newUnit: 'KPC' | 'PCE';
    newQuantity: number;
  } {
    if (totalQuantity > UNIT_TRANSLATE_LIMIT) {
      return {
        newUnit: 'KPC',
        newQuantity: totalQuantity / KPC_NUMBER,
      };
    }
    return {
      newUnit: 'PCE',
      newQuantity: totalQuantity,
    };
  }
}
