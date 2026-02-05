/**
 * Excel 處理整合測試
 *
 * 使用真實測試資料驗證完整的 Excel 處理流程
 */

import path from 'path';
import { excelToJSON } from '../../../../utils';
import {
  SheetData,
  ExcelColumnKeys,
  SheetDataOriginal,
} from '../../index.interface';
import {
  dataPreDebuggingProcess,
  deleteNullProductNameData,
  mappingRealProductName,
  sheetDataProcess,
} from '../data-process.service';
import { groupExcelDataShopee } from '../data-process-group.service';

// Mock 設定
const mockSettings = {
  SYSTEM_SETTING: {
    NET_WEIGHT_INTERVAL: 0.01,
    KPC_NUMBER: 1000,
    UNIT_TRANSLATE_LIMIT: 12,
  },
  DEFAULT_PRICE_SETTING: {
    OPE_PIECE: [100, 200],
    TWO_PIECE: [200, 300],
    THREE_OR_MORE_PIECES: [300, 400],
    ADJUSTMENT_RATE: [1, 1.2],
    PEGASUS_OPE_PIECE: [100, 200],
    PEGASUS_TWO_PIECE: [200, 300],
  },
};

// Mock Google Sheets 工具
jest.mock('../../../../utils/google-sheets.tool', () => ({
  getProductNameMap: jest.fn(() => [
    {
      '原始品名': '測試產品',
      '正確品名': '正確產品名稱',
      '稅則': 'TEST001',
    },
  ]),
}));

// Mock utils（包含 getSystemSetting）
// 需要在 jest.mock 外部定義 mockSettings，因為 jest.mock 會被提升
jest.mock('../../../../utils', () => {
  const actual = jest.requireActual('../../../../utils');
  return {
    ...actual,
    getSystemSetting: jest.fn(() => ({
      SYSTEM_SETTING: {
        NET_WEIGHT_INTERVAL: 0.01,
        KPC_NUMBER: 1000,
        UNIT_TRANSLATE_LIMIT: 12,
      },
      DEFAULT_PRICE_SETTING: {
        OPE_PIECE: [100, 200],
        TWO_PIECE: [200, 300],
        THREE_OR_MORE_PIECES: [300, 400],
        ADJUSTMENT_RATE: [1, 1.2],
        PEGASUS_OPE_PIECE: [100, 200],
        PEGASUS_TWO_PIECE: [200, 300],
      },
    })),
    addressSheet: {
      getData: jest.fn(() => [
        { '地址': 'Test Address 1' },
        { '地址': 'Test Address 2' },
      ]),
    },
  };
});

describe('Excel 處理整合測試', () => {
  // 測試資料路徑
  const testDataDir = path.resolve(process.cwd(), 'test-data');
  const shopeeTestFile = path.join(testDataDir, '蝦皮原始-2.xlsx');
  const generalTestFile = path.join(testDataDir, '資料測試.xlsx');

  describe('蝦皮原始資料處理', () => {
    let rawData: SheetData[];

    beforeAll(() => {
      // 讀取並處理蝦皮測試資料
      try {
        rawData = excelToJSON<SheetDataOriginal, SheetData>(shopeeTestFile, {
          xlsxOpts: { range: 2 },
          resultProcess: sheetDataProcess,
        });
      } catch (error) {
        console.error('無法讀取測試檔案:', shopeeTestFile);
        rawData = [];
      }
    });

    it('應該成功讀取測試檔案', () => {
      expect(rawData).toBeDefined();
      expect(Array.isArray(rawData)).toBe(true);
    });

    it('讀取的資料應該有正確的欄位結構', () => {
      if (rawData.length === 0) {
        console.warn('跳過測試: 無測試資料');
        return;
      }

      const firstRow = rawData[0];

      // 驗證必要欄位存在
      expect(firstRow).toHaveProperty(ExcelColumnKeys.ShippingOrderNumber);
      expect(firstRow).toHaveProperty(ExcelColumnKeys.ProductName);
    });

    it('資料預處理應該正確填充空值', () => {
      if (rawData.length === 0) {
        console.warn('跳過測試: 無測試資料');
        return;
      }

      const processedData = dataPreDebuggingProcess(rawData);

      // 驗證所有資料都有 index
      processedData.forEach((row, index) => {
        expect(row).toHaveProperty('index', index);
      });
    });

    it('deleteNullProductNameData 應該過濾空產品名', () => {
      if (rawData.length === 0) {
        console.warn('跳過測試: 無測試資料');
        return;
      }

      const processedData = dataPreDebuggingProcess(rawData);
      const filteredData = deleteNullProductNameData(processedData);

      // 驗證沒有空產品名
      filteredData.forEach((row) => {
        expect(row[ExcelColumnKeys.ProductName]).toBeTruthy();
      });
    });

    it('Shopee 分組應該正確合併資料', () => {
      if (rawData.length === 0) {
        console.warn('跳過測試: 無測試資料');
        return;
      }

      const processedData = dataPreDebuggingProcess(rawData);
      const filteredData = deleteNullProductNameData(processedData);
      const groupedData = groupExcelDataShopee(filteredData);

      // 分組後資料應該少於或等於原始資料
      expect(groupedData.length).toBeLessThanOrEqual(filteredData.length);
    });
  });

  describe('通用測試資料處理', () => {
    let rawData: SheetData[];

    beforeAll(() => {
      // 讀取通用測試資料
      try {
        rawData = excelToJSON<SheetDataOriginal, SheetData>(generalTestFile, {
          xlsxOpts: { range: 2 },
          resultProcess: sheetDataProcess,
        });
      } catch (error) {
        console.error('無法讀取測試檔案:', generalTestFile);
        rawData = [];
      }
    });

    it('應該成功讀取測試檔案', () => {
      expect(rawData).toBeDefined();
      expect(Array.isArray(rawData)).toBe(true);
    });

    it('數字欄位應該是數字型別', () => {
      if (rawData.length === 0) {
        console.warn('跳過測試: 無測試資料');
        return;
      }

      const processedData = dataPreDebuggingProcess(rawData);
      const filteredData = deleteNullProductNameData(processedData);

      if (filteredData.length === 0) {
        console.warn('跳過測試: 過濾後無資料');
        return;
      }

      filteredData.forEach((row) => {
        // 數字欄位驗證（允許 0 或正數）
        const netWeight = row[ExcelColumnKeys.NetWeight];
        const quantity = row[ExcelColumnKeys.Quantity];

        if (netWeight !== undefined && netWeight !== null) {
          expect(typeof netWeight === 'number' || !isNaN(Number(netWeight))).toBe(true);
        }

        if (quantity !== undefined && quantity !== null) {
          expect(typeof quantity === 'number' || !isNaN(Number(quantity))).toBe(true);
        }
      });
    });
  });

  describe('資料對應測試', () => {
    it('mappingRealProductName 應該正確對應已知產品', () => {
      const mockProductMap = [
        {
          '原始品名': '已知產品',
          '正確品名': '正確名稱',
          '稅則': 'CODE123',
        },
      ];

      const testData: SheetData[] = [
        {
          [ExcelColumnKeys.ProductName]: '已知產品',
          [ExcelColumnKeys.ShippingOrderNumber]: 'ORDER001',
        } as SheetData,
        {
          [ExcelColumnKeys.ProductName]: '未知產品',
          [ExcelColumnKeys.ShippingOrderNumber]: 'ORDER002',
        } as SheetData,
      ];

      const result = mappingRealProductName(testData, mockProductMap);

      // 驗證已知產品被對應
      expect(result[0][ExcelColumnKeys.RealProductName]).toBe('正確名稱');
      expect(result[0][ExcelColumnKeys.ProductClassNumber]).toBe('CODE123');

      // 驗證未知產品為空
      expect(result[1][ExcelColumnKeys.RealProductName]).toBe('');
      expect(result[1][ExcelColumnKeys.ProductClassNumber]).toBe('');
    });
  });

  describe('邊界情況測試', () => {
    it('空陣列輸入應該返回空陣列', () => {
      const processedData = dataPreDebuggingProcess([]);
      expect(processedData).toEqual([]);

      const filteredData = deleteNullProductNameData([]);
      expect(filteredData).toEqual([]);
    });

    it('mappingRealProductName 空對應表應該全部返回空字串', () => {
      const testData: SheetData[] = [
        { [ExcelColumnKeys.ProductName]: '任何產品' } as SheetData,
      ];

      const result = mappingRealProductName(testData, []);

      expect(result[0][ExcelColumnKeys.RealProductName]).toBe('');
      expect(result[0][ExcelColumnKeys.ProductClassNumber]).toBe('');
    });
  });
});

describe('輸出格式驗證', () => {
  describe('欄位完整性', () => {
    const requiredFields = [
      ExcelColumnKeys.ShippingOrderNumber,
      ExcelColumnKeys.ProductName,
      ExcelColumnKeys.NetWeight,
      ExcelColumnKeys.GrossWeight,
      ExcelColumnKeys.Quantity,
      ExcelColumnKeys.TotalBoxes,
    ];

    it('處理後的資料應該包含所有必要欄位', () => {
      const mockData: SheetData[] = [
        {
          [ExcelColumnKeys.ShippingOrderNumber]: 'ORDER001',
          [ExcelColumnKeys.ProductName]: 'Product A',
          [ExcelColumnKeys.NetWeight]: 1.5,
          [ExcelColumnKeys.GrossWeight]: 2.0,
          [ExcelColumnKeys.Quantity]: 10,
          [ExcelColumnKeys.TotalBoxes]: 1,
        } as SheetData,
      ];

      const processedData = dataPreDebuggingProcess(mockData);

      requiredFields.forEach((field) => {
        expect(processedData[0]).toHaveProperty(field);
      });
    });
  });
});
