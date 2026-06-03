import { excelToJSON, jsonGroupBy } from '../../../utils';
import { getProductNameMap } from '../../../utils/google-sheets.tool';
import { runClassifier } from '../../../utils/model-run';
import { logger } from '../../../utils/logger.tool';
import { reportProgress } from '../../../utils/progress.tool';
import {
  classifyProgressMessage,
  shouldLogClassifyProgress,
} from '../../../../shared/excel-progress';
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
  logger.info('[findUnMappingData] 開始資料前處理', { filePath });
  reportProgress({ phase: 'read', message: '讀取檔案中…' });

  const productNameMap = getProductNameMap();
  logger.info('[findUnMappingData] 已載入產品對應表', {
    count: productNameMap.length,
  });

  const originalData: SheetData[] = excelToJSON(filePath, {
    xlsxOpts: { range: 2 },
    resultProcess: sheetDataProcess,
  });
  logger.info('[findUnMappingData] 已讀取 Excel 原始資料', {
    count: originalData.length,
  });
  reportProgress({ phase: 'compare', message: '比對產品資料中…' });

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
  const total = data.length;
  const startedAt = Date.now();
  let failedCount = 0;

  logger.info('[classifyData] 開始批量智能辨識', { total });

  for (let i = 0; i < data.length; i += 1) {
    const entry = data[i];
    const current = i + 1;
    const productName = entry[ExcelColumnKeys.ProductName] as string;

    // 推送進度給 UI（每筆），讓使用者看到「辨識中 current/total」
    reportProgress({
      phase: 'classify',
      current,
      total,
      message: classifyProgressMessage(current, total),
    });

    // eslint-disable-next-line no-await-in-loop
    const tryClassify = await runClassifier(productName);
    if (!tryClassify) {
      failedCount += 1;
    }

    // 進度 log：第一筆 / 最後一筆 / 每 25 筆，避免逐筆灌爆 log
    if (shouldLogClassifyProgress(current, total)) {
      logger.info('[classifyData] 辨識進度', {
        current,
        total,
        elapsedMs: Date.now() - startedAt,
      });
    }

    const classifiedEntry = {
      ...entry,
      [ExcelColumnKeys.RealProductName]: tryClassify,
      [ExcelColumnKeys.ProductClassNumber]:
        map.find(
          (i2) =>
            i2[ProductNameMappingColumnKeys.CorrectProductName] === tryClassify,
        )?.[ProductNameMappingColumnKeys.TariffCode] ?? '',
    };

    result.push(classifiedEntry);
  }

  reportProgress({ phase: 'done', message: '智能辨識完成，整理結果中…' });
  logger.info('[classifyData] 批量智能辨識完成', {
    total,
    failedCount,
    elapsedMs: Date.now() - startedAt,
  });

  return result;
}
