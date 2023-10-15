import { excelToJSON, jsonGroupBy, tariffCodeSheet } from '../../../utils';
import {
  getProductNameMap,
  systemTariffCodeSheet,
} from '../../../utils/google-sheets.tool';
import {
  ExcelColumnKeys,
  ProductNameMappingColumnKeys,
  SheetData,
} from '../index.interface';
import {
  dataAddIndex,
  deleteNullProductNameData,
  fillDownColumn,
  trimAllData,
} from './data-process.service';

export function findUnMappingData(filePath: string) {
  const productNameMap = getProductNameMap();

  const originalData: SheetData[] = excelToJSON(filePath, {
    xlsxOpts: { range: 2 },
  });
  const trimedData = trimAllData(originalData);
  const dataWithIndex = dataAddIndex(trimedData);
  const fillDownShopingOrderNumber = fillDownColumn(
    dataWithIndex,
    ExcelColumnKeys.ShippingOrderNumber,
  );
  const dtatDeleteNullProductName = deleteNullProductNameData(
    fillDownShopingOrderNumber,
  );
  const dataGrouped = jsonGroupBy(
    dtatDeleteNullProductName,
    [ExcelColumnKeys.ProductName],
    (datas) => ({ ...datas[0] }),
  );

  const unMappingData = dataGrouped.filter((entry) => {
    const productName = entry[ExcelColumnKeys.ProductName];
    return !productNameMap.find(
      (map) =>
        map[ProductNameMappingColumnKeys.OriginalProductName] === productName,
    );
  });

  return unMappingData;
}
