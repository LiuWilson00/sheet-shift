import { excelToJSON, getRandomIntBetween } from '../../../utils';
import {
  SheetData,
  ExcelColumnKeys,
  SheetDataOriginal,
} from '../index.interface';
import {
  getProductNameMap,
  addressSheet,
} from '../../../utils/google-sheets.tool';
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
  getRandomAddress,
} from './data-process.service';
import {
  groupExcelDataShopeeNew,
  groupExcelDataShopee,
} from './data-process-group.service';
import {
  RowStyleMap,
  STYLE_COLORS,
  STYLE_PRIORITY,
  mergeRowStyleMaps,
} from '../index.const';
import {
  processRecipientInfo,
  addNewRecipientsToSheet,
} from './recipient-info.service';
import { checkProblemItems } from './problem-items.service';

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
        .replace(/[\(（][^）\)]*[\)）]/g, ''),
    };
  });

  // 將 RecipientIDNumber 做判斷處裡
  const dataProcessIDNumber = dataProcessEnglishAddress.map((entry) => {
    return {
      ...entry,
      [ExcelColumnKeys.RecipientIDNumber]: determineRecipientIDCode(
        entry[ExcelColumnKeys.RecipientTaxNumber],
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
        .replace(/[\(（][^）\)]*[\)）]/g, ''),
    };
  });

  // 將 RecipientIDNumber 做判斷處裡
  const dataProcessIDNumber = dataProcessEnglishAddress.map((entry) => {
    return {
      ...entry,
      [ExcelColumnKeys.RecipientIDNumber]: determineRecipientIDCode(
        entry[ExcelColumnKeys.RecipientTaxNumber],
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

/** 台北港格式處理結果 */
export interface ProcessResultWithStyles {
  data: SheetData[];
  rowStyles: RowStyleMap;
}

/**
 * 台北港格式匯出
 *
 * 基於 processExcelData()，新增：
 * 1. 收貨人資訊比對與帶入
 * 2. 問題件檢查
 * 3. 特殊條件：毛重 ≥ 40kg & 總件數 = 1 → 金額 2000-2100、黃色背景
 */
export async function processExcelDataTaipeiBay(
  filePath: string,
  options?: {
    sheetPricesVersion?: 'v2' | 'v3';
    disableRandomAddress?: boolean;
    calculateTotalAmountByBoxesDisableThreeOrMore?: boolean;
    usePegasusSetting?: boolean;
  },
): Promise<ProcessResultWithStyles> {
  // 使用現有的 processExcelData 處理基礎資料
  const baseData = await processExcelData(filePath, options);

  // 收貨人資訊處理
  const recipientResult = processRecipientInfo(baseData);

  // 問題件檢查
  const problemStyles = checkProblemItems(recipientResult.data);

  // 台北港特殊條件：毛重 ≥ 40 且 總件數 = 1
  const taipeiBayStyles = applyTaipeiBaySpecialRules(recipientResult.data);

  // 合併所有樣式
  const allStyles = mergeRowStyleMaps(
    recipientResult.rowStyles,
    problemStyles,
    taipeiBayStyles,
  );

  // 非阻塞新增新收貨人到 Google Sheets
  if (recipientResult.newRecipients.length > 0) {
    addNewRecipientsToSheet(recipientResult.newRecipients).catch(() => {});
  }

  return { data: recipientResult.data, rowStyles: allStyles };
}

/**
 * 台北港特殊條件處理
 *
 * 條件：毛重 ≥ 40kg 且 總件數 = 1
 * 處理：金額調整為 2000-2100、整個訂單標記黃色背景
 *
 * 注意：此函式會直接修改 data 中的 ProcessedAmount
 */
function applyTaipeiBaySpecialRules(data: SheetData[]): RowStyleMap {
  const rowStyles: RowStyleMap = new Map();

  let currentOrderIsSpecial = false;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // 新訂單開始（ShippingOrderNumber 不為空）
    if (row[ExcelColumnKeys.ShippingOrderNumber] !== '') {
      const grossWeight = Number(row[ExcelColumnKeys.GrossWeight]);
      const totalBoxes = Number(row[ExcelColumnKeys.TotalBoxes]);

      currentOrderIsSpecial =
        row[ExcelColumnKeys.GrossWeight] !== '' &&
        row[ExcelColumnKeys.TotalBoxes] !== '' &&
        grossWeight >= 40 &&
        totalBoxes === 1;

      if (currentOrderIsSpecial) {
        // 金額調整為隨機值 2000-2100
        data[i] = {
          ...data[i],
          [ExcelColumnKeys.ProcessedAmount]: getRandomIntBetween(2000, 2100),
        };
      }
    }

    // 標記屬於特殊訂單的所有行
    if (currentOrderIsSpecial) {
      const styles = rowStyles.get(i) || [];
      styles.push({
        backgroundColor: STYLE_COLORS.YELLOW,
        priority: STYLE_PRIORITY.TAIPEI_BAY_SPECIAL,
      });
      rowStyles.set(i, styles);
    }
  }

  return rowStyles;
}

/**
 * 高雄超峰格式匯出
 *
 * 基於 processExcelDataShopeeNew()，新增：
 * 1. 地址自動帶入（從 Google Sheets 地址表隨機選取）
 * 2. 毛重均攤（同一訂單的項目平均分配毛重）
 * 3. 收貨人資訊比對與帶入
 * 4. 問題件檢查
 */
export async function processExcelDataKaohsiungChaofeng(
  filePath: string,
): Promise<ProcessResultWithStyles> {
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

  // 電話格式處理
  const dataProcessPhone = dataBeforeSummaryUpdate.map((entry) => ({
    ...entry,
    [ExcelColumnKeys.RecipientPhone]: formatRecipientPhone(
      entry[ExcelColumnKeys.RecipientPhone] as string,
    ),
  }));

  // 地址清理（移除括號內容）
  const dataProcessAddress = dataProcessPhone.map((entry) => ({
    ...entry,
    [ExcelColumnKeys.RecipientEnglishAddress]: entry[
      ExcelColumnKeys.RecipientEnglishAddress
    ]
      .toString()
      // eslint-disable-next-line no-useless-escape
      .replace(/[\(（][^）\)]*[\)）]/g, ''),
  }));

  // 收貨人身分識別碼
  const dataProcessIDNumber = dataProcessAddress.map((entry) => ({
    ...entry,
    [ExcelColumnKeys.RecipientIDNumber]: determineRecipientIDCode(
      entry[ExcelColumnKeys.RecipientTaxNumber],
    ),
  }));

  // 地址自動帶入（從 Google Sheets 地址表隨機選取）
  const addressData = addressSheet.get();
  const dataWithAddress =
    addressData.length > 0
      ? dataProcessIDNumber.map((entry) => ({
          ...entry,
          [ExcelColumnKeys.RecipientEnglishAddress]:
            getRandomAddress(addressData),
        }))
      : dataProcessIDNumber;

  // 毛重均攤
  const dataWithDistributedWeight = distributeGrossWeight(dataWithAddress);

  // 產品名稱映射
  const finalData = mappingRealProductName(
    dataWithDistributedWeight,
    productNameMap,
  );

  // 收貨人資訊處理
  const recipientResult = processRecipientInfo(finalData);

  // 問題件檢查
  const problemStyles = checkProblemItems(recipientResult.data);

  // 合併樣式
  const allStyles = mergeRowStyleMaps(recipientResult.rowStyles, problemStyles);

  // 非阻塞新增新收貨人到 Google Sheets
  if (recipientResult.newRecipients.length > 0) {
    addNewRecipientsToSheet(recipientResult.newRecipients).catch(() => {});
  }

  return { data: recipientResult.data, rowStyles: allStyles };
}

/**
 * 毛重均攤：同一訂單的項目平均分配毛重
 *
 * 邏輯：
 * - ShippingOrderNumber 不為空表示新訂單開始
 * - 取第一行的毛重值（已匯總的總毛重）
 * - 平均分配到同一訂單的所有項目
 */
function distributeGrossWeight(data: SheetData[]): SheetData[] {
  const result = data.map((row) => ({ ...row }));

  let orderStartIndex = -1;
  let currentGrossWeight = 0;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i <= result.length; i++) {
    const isNewOrder =
      i < result.length &&
      result[i][ExcelColumnKeys.ShippingOrderNumber] !== '';
    const isEnd = i === result.length;

    // 處理前一個訂單的均攤
    if ((isNewOrder || isEnd) && orderStartIndex >= 0) {
      const itemCount = i - orderStartIndex;
      if (itemCount > 0 && currentGrossWeight > 0) {
        const weightPerItem = currentGrossWeight / itemCount;
        // eslint-disable-next-line no-plusplus
        for (let j = orderStartIndex; j < i; j++) {
          result[j][ExcelColumnKeys.GrossWeight] = weightPerItem;
        }
      }
    }

    if (isNewOrder) {
      orderStartIndex = i;
      currentGrossWeight = Number(result[i][ExcelColumnKeys.GrossWeight]) || 0;
    }
  }

  return result;
}
