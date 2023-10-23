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

export async function processExcelData(filePath: string) {
  const productNameMap = getProductNameMap();
  const originalData: SheetData[] = excelToJSON(filePath, {
    xlsxOpts: { range: 2 },
    resultProcess: sheetDataProcess,
  });

  const preDebugedData = deleteNullProductNameData(
    dataPreDebuggingProcess(originalData),
  );

  const groupedData = groupExcelData(preDebugedData);
  const dataBeforeSummaryUpdate = summarizeAndUpdateGroupedData(groupedData);
  const dataWithRecipientAndRealName = processRecipientDetails(
    dataBeforeSummaryUpdate,
  );

  return mappingRealProductName(dataWithRecipientAndRealName, productNameMap);
}
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

  return mappingRealProductName(dataBeforeSummaryUpdate, productNameMap);
}

export function dataPreDebuggingProcess(data: SheetData[]): SheetData[] {
  const dataFilledDown = fillDownProcess(data);

  const dataWithIndex = dataAddIndex(dataFilledDown);
  return dataWithIndex;

  function fillDownProcess(data: SheetData[]) {
    const fillDownColumnKeys: ExcelColumnKeys[] = [
      ExcelColumnKeys.ShippingOrderNumber,
      ExcelColumnKeys.Specification,
      ExcelColumnKeys.Brand,
      ExcelColumnKeys.QuantityUnit,
      ExcelColumnKeys.TradeConditionCode,
      ExcelColumnKeys.CurrencyCode,
      ExcelColumnKeys.BoxUnit,
      ExcelColumnKeys.CountryOfOriginCode,
      ExcelColumnKeys.Mark,
    ];

    let newData = data;
    fillDownColumnKeys.forEach((columnKey) => {
      newData = fillDownColumn(newData, columnKey);
    });
    return newData;
  }
}

export function dataAddIndex(data: SheetData[]) {
  return data.map((entry, index) => {
    return {
      ...entry,
      index,
    };
  });
}

export function fillDownColumn(data: SheetData[], columnKey: ExcelColumnKeys) {
  let previousValue: string | number = '';
  return data.map((entry) => {
    const value =
      entry[columnKey] === undefined || entry[columnKey] === undefined
        ? ''
        : String(entry[columnKey]).trim();
    if (value === '' || value === undefined) {
      return {
        ...entry,
        [columnKey]: previousValue,
      };
    }
    previousValue = value;
    return entry;
  });
}

export function mappingRealProductName(
  originalDataJson: SheetData[],
  productNameMap: ProductNameMapping[],
): SheetData[] {
  const completedData: SheetData[] = [];

  originalDataJson.forEach((originalData) => {
    const realNameItem = productNameMap.find(
      (item) =>
        item[ProductNameMappingColumnKeys.OriginalProductName] ===
        originalData[ExcelColumnKeys.ProductName],
    );

    if (realNameItem) {
      completedData.push({
        ...originalData,
        [ExcelColumnKeys.RealProductName]:
          realNameItem[ProductNameMappingColumnKeys.CorrectProductName],
        [ExcelColumnKeys.ProductClassNumber]:
          realNameItem[ProductNameMappingColumnKeys.TariffCode],
      });
    } else {
      completedData.push({
        ...originalData,
        [ExcelColumnKeys.RealProductName]: '',
        [ExcelColumnKeys.ProductClassNumber]: '',
      });
    }
  });
  return completedData;
}

export function groupExcelData(originalData: SheetData[]) {
  const systemSetting = getSystemSetting();
  const { NET_WEIGHT_INTERVAL, KPC_NUMBER, UNIT_TRANSLATE_LIMIT } =
    systemSetting.SYSTEM_SETTING;
  return jsonGroupBy(
    originalData,
    [ExcelColumnKeys.ShippingOrderNumber, ExcelColumnKeys.ProductName],
    (datas) => {
      const { totalNetWeight, totalGrossWeight, totalQuantity, totalBoxes } =
        getDataSummary(datas);

      const { newQuantity, newUnit } = unitTranslate(totalQuantity);

      const newNetWeight = Number(totalNetWeight) - NET_WEIGHT_INTERVAL;

      return {
        ...datas[0],
        [ExcelColumnKeys.QuantityUnit]: newUnit,
        [ExcelColumnKeys.NetWeight]: newNetWeight,
        [ExcelColumnKeys.GrossWeight]: totalGrossWeight,
        [ExcelColumnKeys.Quantity]: newQuantity,
        [ExcelColumnKeys.TotalBoxes]: totalBoxes,
      };
    },
  );

  function getDataSummary(datas: SheetData[]) {
    let totalNetWeight = 0;
    let totalGrossWeight = 0;
    let totalQuantity = 0;
    let totalBoxes = 0;

    datas.forEach((data) => {
      totalNetWeight += Number(data[ExcelColumnKeys.NetWeight] ?? 0);
      totalGrossWeight += Number(data[ExcelColumnKeys.GrossWeight] ?? 0);
      totalQuantity += Number(data[ExcelColumnKeys.Quantity] ?? 0);
      totalBoxes += Number(data[ExcelColumnKeys.TotalBoxes] ?? 0);
    });

    return {
      totalNetWeight,
      totalGrossWeight,
      totalQuantity,
      totalBoxes,
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

export function groupExcelDataShopee(originalData: SheetData[]) {
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
      const minUnitPrice = findMinUnitPrice(datas);
      const newPrice =
        minUnitPrice < 10 ? getRandomIntBetween(10, 20) : minUnitPrice;

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

function calculateTotalAmountByBoxes(
  boxes: number,
  setting: DefaultPriceSetting,
): [number, number] {
  let range: [number, number];

  if (boxes === 1) {
    range = setting.OPE_PIECE;
  } else if (boxes === 2) {
    range = setting.TWO_PIECE;
  } else {
    range = setting.THREE_OR_MORE_PIECES;
  }

  const [min, max] = range;

  return [min, max]; //getRandomIntBetween(min, max) * boxes;
}

function calculateOriginalAmountAndUnitPrice(
  originalTotalAmount: number,
  quantity: number,
  setting: DefaultPriceSetting,
): number {
  const [minRate, maxRate] = setting.ADJUSTMENT_RATE;
  const rate = minRate + Math.random() * (maxRate - minRate);
  const newTotalAmount = Math.round(originalTotalAmount * rate);
  const newUnitPrice = Math.ceil(newTotalAmount / quantity);

  return newUnitPrice;
}
function getSummaries(
  sameNameDataIndex: number[],
  data: SheetData[],
  keys: ExcelColumnKeys[],
): {
  [key in ExcelColumnKeys]: number;
} {
  const initData = keys.reduce((acc, key) => {
    return {
      ...acc,
      [key]: 0,
    };
  }, {}) as { [key in ExcelColumnKeys]: number };

  return sameNameDataIndex.reduce((acc, index) => {
    const currentData = data[index];

    keys.forEach((key) => {
      acc[key] += Number(currentData[key]);
    });

    return acc;
  }, initData);
}

function setSteetPrices(
  index: number,
  data: SheetData[],
  totalAmount: number,
  itemCount: number,
  setting: DefaultPriceSetting,
): void {
  const quantity = data[index][ExcelColumnKeys.Quantity];
  const newUnitPrice = calculateOriginalAmountAndUnitPrice(
    totalAmount / itemCount,
    quantity,
    setting,
  );
  data[index][ExcelColumnKeys.UnitPrice] = newUnitPrice;
  data[index][ExcelColumnKeys.TotalAmount] = newUnitPrice * quantity;
}
function generateRandomProportions(n: number): number[] {
  // Handle special case where n is 1
  if (n === 1) {
    return [1];
  }

  const proportions: number[] = [];
  let sum = 0;

  // Adjust the min and max based on the value of n
  const minProportion = 0.8 / n; // Ensure at least some flexibility but you can adjust as per your needs
  const maxProportion = 1.2 / n > 0.4 ? 0.4 : 1.2 / n; // Setting a dynamic max, but it should not exceed 0.4

  // Generate random proportions
  for (let i = 0; i < n; i++) {
    let prop = Math.random() * (maxProportion - minProportion) + minProportion;

    proportions.push(prop);
    sum += prop;
  }

  // Adjust each proportion based on the total sum
  return proportions.map((prop) => prop / sum);
}

function setSteetPricesNew(
  index: number,
  data: SheetData[],
  totalAmountInfo: [number, number],
  proportions: number,
  setting: DefaultPriceSetting,
) {
  const [minRate, maxRate] = setting.ADJUSTMENT_RATE;
  const quantity = data[index][ExcelColumnKeys.Quantity];
  const maxUnitPrice = Math.ceil(
    (totalAmountInfo[1] * maxRate * proportions) / quantity,
  );
  const minUnitPrice = Math.ceil(
    (totalAmountInfo[0] * minRate * proportions) / quantity,
  );
  const newUnitPrice = getRandomIntBetween(minUnitPrice, maxUnitPrice);

  data[index][ExcelColumnKeys.UnitPrice] = newUnitPrice;
  data[index][ExcelColumnKeys.TotalAmount] = newUnitPrice * quantity;
}

function summarizeAndUpdateGroupedData(groupedData: SheetData[]): SheetData[] {
  const newGroupedData: SheetData[] = JSON.parse(JSON.stringify(groupedData));
  const distinctShippingOrderNumber = getDistinctValuesForKey<string>(
    groupedData,
    ExcelColumnKeys.ShippingOrderNumber,
  );

  distinctShippingOrderNumber.forEach((shippingOrderNumber) => {
    const sameShippingOrderNumberDataIndex = findAllIndex(
      groupedData,
      (item) =>
        item[ExcelColumnKeys.ShippingOrderNumber] === shippingOrderNumber,
    );
    const summaries = getSummaries(
      sameShippingOrderNumberDataIndex,
      groupedData,
      [ExcelColumnKeys.GrossWeight, ExcelColumnKeys.TotalBoxes],
    );

    const systemSetting = getSystemSetting();

    const totalItemCount = sameShippingOrderNumberDataIndex.length;
    const totalAmountInfo = calculateTotalAmountByBoxes(
      summaries[ExcelColumnKeys.TotalBoxes],
      systemSetting.DEFAULT_PRICE_SETTING,
    );

    const randomProportions = generateRandomProportions(totalItemCount);

    sameShippingOrderNumberDataIndex.forEach((index, numberOfIndex) => {
      setSteetPricesNew(
        index,
        newGroupedData,
        totalAmountInfo,
        randomProportions[numberOfIndex],
        systemSetting.DEFAULT_PRICE_SETTING,
      );

      if (numberOfIndex === 0) {
        newGroupedData[index][ExcelColumnKeys.GrossWeight] =
          summaries[ExcelColumnKeys.GrossWeight];

        newGroupedData[index][ExcelColumnKeys.TotalBoxes] =
          summaries[ExcelColumnKeys.TotalBoxes];
      } else {
        newGroupedData[index][ExcelColumnKeys.ShippingOrderNumber] = '';
        newGroupedData[index][ExcelColumnKeys.GrossWeight] = '';
        newGroupedData[index][ExcelColumnKeys.TotalBoxes] = '';
      }
    });
  });

  return newGroupedData;
}

function summarizeAndUpdateGroupedDataShopee(
  groupedData: SheetData[],
): SheetData[] {
  const newGroupedData: SheetData[] = JSON.parse(JSON.stringify(groupedData));
  const distinctShippingOrderNumber = getDistinctValuesForKey<ExcelColumnKeys>(
    groupedData,
    ExcelColumnKeys.ShippingOrderNumber,
  );

  distinctShippingOrderNumber.forEach((name) => {
    const sameNameDataIndex = findAllIndex(
      groupedData,
      (item) => item[ExcelColumnKeys.ShippingOrderNumber] === name,
    );
    const summaries = getSummaries(sameNameDataIndex, groupedData, [
      ExcelColumnKeys.GrossWeight,
      ExcelColumnKeys.TotalBoxes,
      ExcelColumnKeys.OriginalAmount,
      ExcelColumnKeys.TotalAmount,
    ]);

    sameNameDataIndex.forEach((index, numberOfIndex) => {
      if (numberOfIndex === 0) {
        newGroupedData[index][ExcelColumnKeys.GrossWeight] =
          summaries[ExcelColumnKeys.GrossWeight];

        newGroupedData[index][ExcelColumnKeys.TotalBoxes] =
          summaries[ExcelColumnKeys.TotalBoxes];

        newGroupedData[index][ExcelColumnKeys.OriginalAmount] =
          summaries[ExcelColumnKeys.OriginalAmount];

        newGroupedData[index][ExcelColumnKeys.ProcessedAmount] =
          summaries[ExcelColumnKeys.TotalAmount];
      } else {
        newGroupedData[index][ExcelColumnKeys.ShippingOrderNumber] = '';
        newGroupedData[index][ExcelColumnKeys.GrossWeight] = '';
        newGroupedData[index][ExcelColumnKeys.TotalBoxes] = '';
        newGroupedData[index][ExcelColumnKeys.OriginalAmount] = '';
        newGroupedData[index][ExcelColumnKeys.ProcessedAmount] = '';
      }
    });
  });

  return newGroupedData;
}

function processRecipientDetails(data: SheetData[]): SheetData[] {
  return data.map((entry) => {
    return {
      ...entry,
      [ExcelColumnKeys.RecipientTaxNumber]: formatRecipientTaxNumber(
        entry[ExcelColumnKeys.RecipientTaxNumber] as string,
      ),
      [ExcelColumnKeys.RecipientIDNumber]: determineRecipientIDCode(
        entry[ExcelColumnKeys.RecipientTaxNumber] as string,
      ),
      [ExcelColumnKeys.RecipientPhone]: formatRecipientPhone(
        entry[ExcelColumnKeys.RecipientPhone] as string,
      ),
      [ExcelColumnKeys.RecipientEnglishAddress]: getRandomAddress(
        addressSheet.get(),
      ),
    };
  });
}

function formatRecipientTaxNumber(taxNumber: string): string {
  if (typeof taxNumber === 'number') return String(taxNumber);

  if (taxNumber && /[a-zA-Z]/.test(taxNumber[0])) {
    return String(taxNumber).charAt(0).toUpperCase() + taxNumber.slice(1);
  }
  return taxNumber;
}

function determineRecipientIDCode(taxNumber: string): string {
  if (taxNumber === '') return '';

  if (taxNumber && /[a-zA-Z]/.test(String(taxNumber)[0])) {
    return '174';
  }
  return '58';
}

function formatRecipientPhone(phone: string): string {
  if (!phone) return '';

  const cleanedPhone = String(phone).replace(/[()\-]/g, '');
  let formattedPhone = cleanedPhone;
  while (formattedPhone.length < 10) {
    formattedPhone = '0' + formattedPhone;
  }
  return formattedPhone;
}

function getRandomAddress(addressData: AddressSheet[]): string {
  const randomIndex = getRandomIntBetween(0, addressData.length - 1);
  return addressData[randomIndex][AddressSheetColumnKeys.Address];
}

export function deleteNullProductNameData(data: SheetData[]): SheetData[] {
  return data.filter((entry) => {
    return (
      entry[ExcelColumnKeys.ProductName] !== '' &&
      entry[ExcelColumnKeys.ProductName] !== undefined &&
      entry[ExcelColumnKeys.ProductName] !== null
    );
  });
}

const stringKeys: ExcelColumnKeys[] = [
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
const numbarKeys: ExcelColumnKeys[] = [
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
const defaultSheetData: SheetData = {
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

export function sheetDataProcess(
  originalDatas: SheetDataOriginal[],
): SheetData[] {
  return originalDatas.map((originalData) => {
    const newSheetData: any = { ...defaultSheetData, ...originalData };
    stringKeys.forEach((key) => {
      newSheetData[key] = String(originalData[key] ?? '').trim();
    });

    numbarKeys.forEach((key) => {
      if (typeof originalData[key] === 'number') {
        return;
      } else if (typeof originalData[key] === 'string') {
        if (originalData[key] === '') newSheetData[key] = 0;
        else {
          const tryToParseNumber = Number(originalData[key]);
          newSheetData[key] = Number.isNaN(tryToParseNumber)
            ? 0
            : tryToParseNumber;
        }
      } else if (
        newSheetData[key] === undefined ||
        newSheetData[key] === null
      ) {
        return;
      }
    });

    return newSheetData;
  }) as SheetData[];
}
