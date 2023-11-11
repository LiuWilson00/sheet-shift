import { excelToJSON, jsonGroupBy } from '../../../utils';
import { getProductNameMap } from '../../../utils/google-sheets.tool';
import { runClassifier } from '../../../utils/model-run';
import {
  ExcelColumnKeys,
  ProductNameMappingColumnKeys,
  SheetData,
} from '../index.interface';
import {
  dataAddIndex,
  deleteNullProductNameData,
  fillDownColumn,
  sheetDataProcess,
} from './data-process.service';

export function findUnMappingData(filePath: string) {
  const productNameMap = getProductNameMap();

  const originalData: SheetData[] = excelToJSON(filePath, {
    xlsxOpts: { range: 2 },
    resultProcess: sheetDataProcess,
  });

  const dataWithIndex = dataAddIndex(originalData);
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

export function classifyData(data: SheetData[]): Promise<SheetData[]> {
  const map = getProductNameMap();
  return Promise.all(
    data.map(async (entry) => {
      const tryClassify = await runClassifier(
        entry[ExcelColumnKeys.ProductName] as string,
      );

      return {
        ...entry,
        [ExcelColumnKeys.RealProductName]: tryClassify,
        [ExcelColumnKeys.ProductClassNumber]:
          map.find(
            (i) =>
              i[ProductNameMappingColumnKeys.CorrectProductName] ===
              tryClassify,
          )?.[ProductNameMappingColumnKeys.TariffCode] ?? '',
      };
    }),
  );
}
