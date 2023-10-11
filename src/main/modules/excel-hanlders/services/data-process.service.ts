import {
  excelToJSON,
  jsonGroupBy,
  getDistinctValuesForKey,
  findAllIndex,
  getRandomIntBetween,
  tariffCodeSheet,
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
} from '../index.interface';
import { DefaultPriceSetting } from '../../../utils/setting.tool';

export async function processExcelData(filePath: string) {
  const productNameMap = tariffCodeSheet.get();
  const originalData: SheetData[] = excelToJSON(filePath, {
    xlsxOpts: { range: 2 },
  });
  const preDebugedData = dataPreDebuggingProcess(originalData);

  const groupedData = groupExcelData(preDebugedData);
  // console.log('groupedData', groupedData.map((item) => item['index']));
  const dataBeforeSummaryUpdate = summarizeAndUpdateGroupedData(groupedData);
  const dataWithRecipientAndRealName = processRecipientDetails(
    dataBeforeSummaryUpdate,
  );

  return mappingRealProductName(dataWithRecipientAndRealName, productNameMap);
}
export async function processExcelDataShopee(filePath: string) {
  const productNameMap = tariffCodeSheet.get();
  const originalData: SheetData[] = excelToJSON(filePath, {
    xlsxOpts: { range: 2 },
  });
  const preDebugedData = dataPreDebuggingProcess(originalData);

  const groupedData = groupExcelData(preDebugedData);
  // console.log('groupedData', groupedData.map((item) => item['index']));
  const dataBeforeSummaryUpdate =
    summarizeAndUpdateGroupedDataShopee(groupedData);
  const dataWithRecipientAndRealName = processRecipientDetails(
    dataBeforeSummaryUpdate,
  );

  return mappingRealProductName(dataWithRecipientAndRealName, productNameMap);
}

export function dataPreDebuggingProcess(data: SheetData[]): SheetData[] {
  const datazeroPadded = zeroPaddingTotalBoxes(data);
  const dataFilledDown = fillDownProcess(datazeroPadded);
  const dataWithIndex = dataAddIndex(dataFilledDown);
  return dataWithIndex;

  function zeroPaddingTotalBoxes(data: SheetData[]) {
    return data.map((entry) => {
      const totalBoxes = entry[ExcelColumnKeys.TotalBoxes];

      if (totalBoxes === '' || totalBoxes === undefined) {
        const newTotalBoxes = 0;
        return {
          ...entry,
          [ExcelColumnKeys.TotalBoxes]: newTotalBoxes,
        };
      }
      return entry;
    });
  }

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

  function dataAddIndex(data: SheetData[]) {
    return data.map((entry, index) => {
      return {
        ...entry,
        index,
      };
    });
  }
}
function fillDownColumn(data: SheetData[], columnKey: ExcelColumnKeys) {
  let previousValue: string | number = '';
  return data.map((entry) => {
    const value = entry[columnKey];

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

function calculateTotalAmountByBoxes(
  boxes: number,
  setting: DefaultPriceSetting,
): number {
  let range: [number, number];

  if (boxes === 1) {
    range = setting.OPE_PIECE;
  } else if (boxes === 2) {
    range = setting.TWO_PIECE;
  } else {
    range = setting.THREE_OR_MORE_PIECES;
  }

  const [min, max] = range;

  return getRandomIntBetween(min, max) * boxes;
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
): {
  summaryGrossWeight: number;
  summaryBoxNumber: number;
  summaryTotalAmount: number;
  summaryTotalQuantity: number;
  summaryTotalNetWeight?: number;
} {
  return sameNameDataIndex.reduce(
    (acc, index) => ({
      summaryGrossWeight:
        acc.summaryGrossWeight +
        Number(data[index][ExcelColumnKeys.GrossWeight]),
      summaryBoxNumber:
        acc.summaryBoxNumber + Number(data[index][ExcelColumnKeys.TotalBoxes]),
      summaryTotalAmount:
        acc.summaryTotalAmount +
        Number(data[index][ExcelColumnKeys.TotalAmount]),
      summaryTotalQuantity:
        acc.summaryTotalQuantity +
        Number(data[index][ExcelColumnKeys.Quantity]),
      summaryTotalNetWeight:
        acc.summaryTotalNetWeight +
        Number(data[index][ExcelColumnKeys.NetWeight]),
    }),
    {
      summaryGrossWeight: 0,
      summaryBoxNumber: 0,
      summaryTotalAmount: 0,
      summaryTotalQuantity: 0,
      summaryTotalNetWeight: 0,
    },
  );
}

function setSteetPrices(
  index: number,
  data: SheetData[],
  totalAmount: number,
  itemCount: number,
  setting: DefaultPriceSetting,
): void {
  const quantity = Number(data[index][ExcelColumnKeys.Quantity]);
  const newUnitPrice = calculateOriginalAmountAndUnitPrice(
    totalAmount / itemCount,
    quantity,
    setting,
  );
  data[index][ExcelColumnKeys.UnitPrice] = newUnitPrice;
  data[index][ExcelColumnKeys.TotalAmount] = newUnitPrice * quantity;
}

function summarizeAndUpdateGroupedData(groupedData: SheetData[]): SheetData[] {
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
    const { summaryGrossWeight, summaryBoxNumber } = getSummaries(
      sameNameDataIndex,
      groupedData,
    );

    const systemSetting = getSystemSetting();

    const totalItemCount = sameNameDataIndex.length;
    const totalAmount = calculateTotalAmountByBoxes(
      summaryBoxNumber,
      systemSetting.DEFAULT_PRICE_SETTING,
    );

    sameNameDataIndex.forEach((index, numberOfIndex) => {
      setSteetPrices(
        index,
        newGroupedData,
        totalAmount,
        totalItemCount,
        systemSetting.DEFAULT_PRICE_SETTING,
      );

      if (numberOfIndex === 0) {
        newGroupedData[index][ExcelColumnKeys.GrossWeight] = summaryGrossWeight;
        newGroupedData[index][ExcelColumnKeys.TotalBoxes] = summaryBoxNumber;
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
    const {
      summaryGrossWeight,
      summaryBoxNumber,
      summaryTotalAmount,
      summaryTotalQuantity,
      summaryTotalNetWeight,
    } = getSummaries(sameNameDataIndex, groupedData);

    sameNameDataIndex.forEach((index, numberOfIndex) => {
      if (numberOfIndex === 0) {
        newGroupedData[index][ExcelColumnKeys.GrossWeight] = summaryGrossWeight;
        newGroupedData[index][ExcelColumnKeys.TotalBoxes] = summaryBoxNumber;
        newGroupedData[index][ExcelColumnKeys.TotalAmount] = summaryTotalAmount;
        newGroupedData[index][ExcelColumnKeys.Quantity] = summaryTotalQuantity;
        newGroupedData[index][ExcelColumnKeys.NetWeight] =
          summaryTotalNetWeight as number;
      } else {
        newGroupedData[index][ExcelColumnKeys.ShippingOrderNumber] = '';
        newGroupedData[index][ExcelColumnKeys.GrossWeight] = '';
        newGroupedData[index][ExcelColumnKeys.TotalBoxes] = '';
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
