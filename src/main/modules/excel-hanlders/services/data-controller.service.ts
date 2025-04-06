import { excelToJSON } from '../../../utils';
import {
  SheetData,
  ExcelColumnKeys,
  SheetDataOriginal,
} from '../index.interface';
import { getProductNameMap } from '../../../utils/google-sheets.tool';
import {
  sheetDataProcess,
  deleteNullProductNameData,
  dataPreDebuggingProcess,
  summarizeAndUpdateGroupedDataShopee,
  formatRecipientPhone,
  mappingRealProductName,
  groupExcelData,
  processRecipientDetails,
  summarizeAndUpdateGroupedData,
  determineRecipientIDCode,
} from './data-process.service';
import {
  groupExcelDataShopeeNew,
  groupExcelDataShopee,
} from './data-process-group.service';

export async function processExcelDataShopee(filePath: string) {
  const productNameMap = getProductNameMap();
  const originalData: SheetData[] = excelToJSON<SheetDataOriginal, SheetData>(
    filePath,
    {
      xlsxOpts: { range: 2 },
      resultProcess: sheetDataProcess,
    },
  );

  const preDebugedData = deleteNullProductNameData(
    dataPreDebuggingProcess(originalData),
  );

  const groupedData = groupExcelDataShopee(preDebugedData);
  const dataBeforeSummaryUpdate =
    summarizeAndUpdateGroupedDataShopee(groupedData);
  const dataProcessPhone = dataBeforeSummaryUpdate.map((entry) => {
    return {
      ...entry,
      [ExcelColumnKeys.RecipientPhone]: formatRecipientPhone(
        entry[ExcelColumnKeys.RecipientPhone] as string,
      ),
    };
  });

  const dataProcessEnglishAddress = dataProcessPhone.map((entry) => {
    return {
      ...entry,
      [ExcelColumnKeys.RecipientEnglishAddress]: entry[
        ExcelColumnKeys.RecipientEnglishAddress
      ]
        .toString()
        .replace(/\(.*?\)/g, ''),
    };
  });

  // 將 RecipientIDNumber 做判斷處裡
  const dataProcessIDNumber = dataProcessEnglishAddress.map((entry) => {
    return {
      ...entry,
      [ExcelColumnKeys.RecipientIDNumber]: determineRecipientIDCode(
        entry[ExcelColumnKeys.RecipientIDNumber],
      ),
    };
  });

  return mappingRealProductName(dataProcessIDNumber, productNameMap);
}

export async function processExcelDataShopeeNew(filePath: string) {
  const productNameMap = getProductNameMap();
  const originalData: SheetData[] = excelToJSON<SheetDataOriginal, SheetData>(
    filePath,
    {
      xlsxOpts: { range: 2 },
      resultProcess: sheetDataProcess,
    },
  );

  const preDebugedData = deleteNullProductNameData(
    dataPreDebuggingProcess(originalData),
  );

  const groupedData = groupExcelDataShopeeNew(preDebugedData);
  const dataBeforeSummaryUpdate =
    summarizeAndUpdateGroupedDataShopee(groupedData);
  const dataProcessPhone = dataBeforeSummaryUpdate.map((entry) => {
    return {
      ...entry,
      [ExcelColumnKeys.RecipientPhone]: formatRecipientPhone(
        entry[ExcelColumnKeys.RecipientPhone] as string,
      ),
    };
  });
  // 將 RecipientEnglishAddress 中 '(' 和 ')' 之間的內容刪除
  const dataProcessEnglishAddress = dataProcessPhone.map((entry) => {
    return {
      ...entry,
      [ExcelColumnKeys.RecipientEnglishAddress]: entry[
        ExcelColumnKeys.RecipientEnglishAddress
      ]
        .toString()
        .replace(/\(.*?\)/g, ''),
    };
  });

  // 將 RecipientIDNumber 做判斷處裡
  const dataProcessIDNumber = dataProcessEnglishAddress.map((entry) => {
    return {
      ...entry,
      [ExcelColumnKeys.RecipientIDNumber]: determineRecipientIDCode(
        entry[ExcelColumnKeys.RecipientIDNumber],
      ),
    };
  });

  return mappingRealProductName(dataProcessIDNumber, productNameMap);
}

export async function processExcelData(
  filePath: string,
  options?: {
    sheetPricesVersion?: 'v2' | 'v3';
    disableRandomAddress?: boolean;
    calculateTotalAmountByBoxesDisableThreeOrMore?: boolean;
    usePegasusSetting?: boolean;
  },
) {
  const {
    sheetPricesVersion,
    disableRandomAddress,
    calculateTotalAmountByBoxesDisableThreeOrMore,
    usePegasusSetting,
  } = options ?? {};
  function countOfShoppingOrderNumber(
    jsonData: SheetData[],
  ): Map<string, number> {
    const stats: Map<string, number> = new Map();

    jsonData.forEach((data) => {
      const orderNumber = data[ExcelColumnKeys.ShippingOrderNumber];

      if (!orderNumber) return;

      if (stats.has(orderNumber)) {
        stats.set(orderNumber, stats.get(orderNumber)! + 1);
      } else {
        stats.set(orderNumber, 1);
      }
    });

    return stats;
  }

  const productNameMap = getProductNameMap();
  const originalData: SheetData[] = excelToJSON(filePath, {
    xlsxOpts: { range: 2 },
    resultProcess: sheetDataProcess,
  });
  const shoppingOrderNumberCountMap = countOfShoppingOrderNumber(originalData);

  const preDebugedData = deleteNullProductNameData(
    dataPreDebuggingProcess(originalData),
  );

  const groupedData = groupExcelData(preDebugedData);
  const dataBeforeSummaryUpdate = summarizeAndUpdateGroupedData(
    groupedData,
    shoppingOrderNumberCountMap,
    {
      sheetPricesVersion,
      calculateTotalAmountByBoxesDisableThreeOrMore,
      usePegasusSetting,
    },
  );
  const dataWithRecipientAndRealName = processRecipientDetails(
    dataBeforeSummaryUpdate,
    {
      disableRandomAddress: disableRandomAddress ?? false,
    },
  );

  return mappingRealProductName(dataWithRecipientAndRealName, productNameMap);
}
