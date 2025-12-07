import { excelToJSON, jsonGroupBy } from '../../../utils';
import { getProductNameMap } from '../../../utils/google-sheets.tool';
import { runClassifier } from '../../../utils/model-run';
import { logger } from '../../../utils/logger.tool';
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
  logger.debug('[findUnMappingData] 開始處理', { filePath });

  const productNameMap = getProductNameMap();
  logger.debug('[findUnMappingData] productNameMap 數量', {
    count: productNameMap.length,
  });

  const originalData: SheetData[] = excelToJSON(filePath, {
    xlsxOpts: { range: 2 },
    resultProcess: sheetDataProcess,
  });
  logger.debug('[findUnMappingData] originalData 數量', {
    count: originalData.length,
  });

  const dataWithIndex = dataAddIndex(originalData);
  const fillDownShopingOrderNumber = fillDownColumn(
    dataWithIndex,
    ExcelColumnKeys.ShippingOrderNumber,
  );
  const dtatDeleteNullProductName = deleteNullProductNameData(
    fillDownShopingOrderNumber,
  );
  logger.debug('[findUnMappingData] 處理後資料數量', {
    afterDeleteNull: dtatDeleteNullProductName.length,
  });

  const dataGrouped = jsonGroupBy(
    dtatDeleteNullProductName,
    [ExcelColumnKeys.ProductName],
    (datas) => ({ ...datas[0] }),
  );
  logger.debug('[findUnMappingData] 分組後資料數量', {
    grouped: dataGrouped.length,
  });

  const unMappingData = dataGrouped.filter((entry) => {
    const productName = entry[ExcelColumnKeys.ProductName];
    return !productNameMap.find(
      (map) =>
        map[ProductNameMappingColumnKeys.OriginalProductName] === productName,
    );
  });

  logger.info('[findUnMappingData] 找到未對應資料', {
    unMappingCount: unMappingData.length,
    totalGrouped: dataGrouped.length,
  });

  return unMappingData;
}

export async function classifyData(data: SheetData[]): Promise<SheetData[]> {
  const map = getProductNameMap();
  const result: SheetData[] = [];

  for (const entry of data) {
    const tryClassify = await runClassifier(
      entry[ExcelColumnKeys.ProductName] as string,
    );

    const classifiedEntry = {
      ...entry,
      [ExcelColumnKeys.RealProductName]: tryClassify,
      [ExcelColumnKeys.ProductClassNumber]:
        map.find(
          (i) =>
            i[ProductNameMappingColumnKeys.CorrectProductName] ===
            tryClassify,
        )?.[ProductNameMappingColumnKeys.TariffCode] ?? '',
    };

    result.push(classifiedEntry);
  }

  return result;
}
