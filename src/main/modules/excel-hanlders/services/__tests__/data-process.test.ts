/**
 * 資料處理服務單元測試
 *
 * 測試 data-process.service.ts 中的核心函數
 */

import {
  dataPreDebuggingProcess,
  dataAddIndex,
  fillDownColumn,
  mappingRealProductName,
  deleteNullProductNameData,
  formatRecipientPhone,
  determineRecipientIDCode,
} from '../data-process.service';
import {
  SheetData,
  ExcelColumnKeys,
  ProductNameMapping,
  ProductNameMappingColumnKeys,
} from '../../index.interface';

// Mock Google Sheets 工具
jest.mock('../../../../utils/google-sheets.tool', () => ({
  getProductNameMap: jest.fn(() => []),
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
    },
  })),
}));

// Mock 地址表
jest.mock('../../../../utils', () => ({
  ...jest.requireActual('../../../../utils'),
  addressSheet: {
    getData: jest.fn(() => []),
  },
}));

describe('data-process.service', () => {
  // ============================================
  // dataAddIndex 測試
  // ============================================
  describe('dataAddIndex', () => {
    it('應該為每筆資料添加正確的 index', () => {
      const input: SheetData[] = [
        { [ExcelColumnKeys.ProductName]: 'Product A' } as SheetData,
        { [ExcelColumnKeys.ProductName]: 'Product B' } as SheetData,
        { [ExcelColumnKeys.ProductName]: 'Product C' } as SheetData,
      ];

      const result = dataAddIndex(input);

      expect(result[0]).toHaveProperty('index', 0);
      expect(result[1]).toHaveProperty('index', 1);
      expect(result[2]).toHaveProperty('index', 2);
    });

    it('空陣列應該返回空陣列', () => {
      const result = dataAddIndex([]);
      expect(result).toEqual([]);
    });
  });

  // ============================================
  // fillDownColumn 測試
  // ============================================
  describe('fillDownColumn', () => {
    it('應該正確填充空值', () => {
      const input: SheetData[] = [
        { [ExcelColumnKeys.ShippingOrderNumber]: 'ORDER001' } as SheetData,
        { [ExcelColumnKeys.ShippingOrderNumber]: '' } as SheetData,
        { [ExcelColumnKeys.ShippingOrderNumber]: '' } as SheetData,
        { [ExcelColumnKeys.ShippingOrderNumber]: 'ORDER002' } as SheetData,
        { [ExcelColumnKeys.ShippingOrderNumber]: '' } as SheetData,
      ];

      const result = fillDownColumn(input, ExcelColumnKeys.ShippingOrderNumber);

      expect(result[0][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER001');
      expect(result[1][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER001');
      expect(result[2][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER001');
      expect(result[3][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER002');
      expect(result[4][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER002');
    });

    it('首個值為空時不應該填充', () => {
      const input: SheetData[] = [
        { [ExcelColumnKeys.ShippingOrderNumber]: '' } as SheetData,
        { [ExcelColumnKeys.ShippingOrderNumber]: 'ORDER001' } as SheetData,
        { [ExcelColumnKeys.ShippingOrderNumber]: '' } as SheetData,
      ];

      const result = fillDownColumn(input, ExcelColumnKeys.ShippingOrderNumber);

      expect(result[0][ExcelColumnKeys.ShippingOrderNumber]).toBe('');
      expect(result[1][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER001');
      expect(result[2][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER001');
    });

    it('應該處理 undefined 值', () => {
      const input: SheetData[] = [
        { [ExcelColumnKeys.ShippingOrderNumber]: 'ORDER001' } as SheetData,
        {
          [ExcelColumnKeys.ShippingOrderNumber]: undefined,
        } as unknown as SheetData,
        { [ExcelColumnKeys.ShippingOrderNumber]: 'ORDER002' } as SheetData,
      ];

      const result = fillDownColumn(input, ExcelColumnKeys.ShippingOrderNumber);

      expect(result[0][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER001');
      expect(result[1][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER001');
      expect(result[2][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER002');
    });
  });

  // ============================================
  // deleteNullProductNameData 測試
  // ============================================
  describe('deleteNullProductNameData', () => {
    it('應該過濾掉產品名稱為空的資料', () => {
      const input: SheetData[] = [
        { [ExcelColumnKeys.ProductName]: 'Product A' } as SheetData,
        { [ExcelColumnKeys.ProductName]: '' } as SheetData,
        { [ExcelColumnKeys.ProductName]: 'Product B' } as SheetData,
        { [ExcelColumnKeys.ProductName]: null } as unknown as SheetData,
      ];

      const result = deleteNullProductNameData(input);

      expect(result).toHaveLength(2);
      expect(result[0][ExcelColumnKeys.ProductName]).toBe('Product A');
      expect(result[1][ExcelColumnKeys.ProductName]).toBe('Product B');
    });

    it('全部為空時應該返回空陣列', () => {
      const input: SheetData[] = [
        { [ExcelColumnKeys.ProductName]: '' } as SheetData,
        { [ExcelColumnKeys.ProductName]: null } as unknown as SheetData,
      ];

      const result = deleteNullProductNameData(input);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // mappingRealProductName 測試
  // ============================================
  describe('mappingRealProductName', () => {
    const mockProductMap: ProductNameMapping[] = [
      {
        [ProductNameMappingColumnKeys.OriginalProductName]: '原始品名A',
        [ProductNameMappingColumnKeys.CorrectProductName]: '正確品名A',
        [ProductNameMappingColumnKeys.TariffCode]: 'CODE001',
      },
      {
        [ProductNameMappingColumnKeys.OriginalProductName]: '原始品名B',
        [ProductNameMappingColumnKeys.CorrectProductName]: '正確品名B',
        [ProductNameMappingColumnKeys.TariffCode]: 'CODE002',
      },
    ];

    it('應該正確對應產品名稱和稅則編號', () => {
      const input: SheetData[] = [
        { [ExcelColumnKeys.ProductName]: '原始品名A' } as SheetData,
        { [ExcelColumnKeys.ProductName]: '原始品名B' } as SheetData,
      ];

      const result = mappingRealProductName(input, mockProductMap);

      expect(result[0][ExcelColumnKeys.RealProductName]).toBe('正確品名A');
      expect(result[0][ExcelColumnKeys.ProductClassNumber]).toBe('CODE001');
      expect(result[1][ExcelColumnKeys.RealProductName]).toBe('正確品名B');
      expect(result[1][ExcelColumnKeys.ProductClassNumber]).toBe('CODE002');
    });

    it('未對應的產品應該設為空字串', () => {
      const input: SheetData[] = [
        { [ExcelColumnKeys.ProductName]: '未知品名' } as SheetData,
      ];

      const result = mappingRealProductName(input, mockProductMap);

      expect(result[0][ExcelColumnKeys.RealProductName]).toBe('');
      expect(result[0][ExcelColumnKeys.ProductClassNumber]).toBe('');
    });

    it('混合對應情況', () => {
      const input: SheetData[] = [
        { [ExcelColumnKeys.ProductName]: '原始品名A' } as SheetData,
        { [ExcelColumnKeys.ProductName]: '未知品名' } as SheetData,
        { [ExcelColumnKeys.ProductName]: '原始品名B' } as SheetData,
      ];

      const result = mappingRealProductName(input, mockProductMap);

      expect(result[0][ExcelColumnKeys.RealProductName]).toBe('正確品名A');
      expect(result[1][ExcelColumnKeys.RealProductName]).toBe('');
      expect(result[2][ExcelColumnKeys.RealProductName]).toBe('正確品名B');
    });

    it('空產品名稱應該被跳過', () => {
      const input: SheetData[] = [
        { [ExcelColumnKeys.ProductName]: '' } as SheetData,
        { [ExcelColumnKeys.ProductName]: '原始品名A' } as SheetData,
      ];

      const result = mappingRealProductName(input, mockProductMap);

      // 空產品名被跳過，只有1筆結果
      expect(result).toHaveLength(1);
      expect(result[0][ExcelColumnKeys.RealProductName]).toBe('正確品名A');
    });
  });

  // ============================================
  // formatRecipientPhone 測試
  // 實際行為：移除 () 和 -，不足 10 位時前面補 0
  // ============================================
  describe('formatRecipientPhone', () => {
    it('應該移除括號和減號', () => {
      expect(formatRecipientPhone('(09)12-345-678')).toBe('0912345678');
    });

    it('應該保持 10 位數號碼不變', () => {
      expect(formatRecipientPhone('0912345678')).toBe('0912345678');
    });

    it('不足 10 位時應該前面補 0', () => {
      expect(formatRecipientPhone('912345678')).toBe('0912345678');
      expect(formatRecipientPhone('12345678')).toBe('0012345678');
    });

    it('空值應該返回空字串', () => {
      expect(formatRecipientPhone('')).toBe('');
      expect(formatRecipientPhone(null as unknown as string)).toBe('');
    });
  });

  // ============================================
  // determineRecipientIDCode 測試
  // 實際行為：首字母是英文返回 '174'，否則返回 '58'，空值返回 ''
  // ============================================
  describe('determineRecipientIDCode', () => {
    it('純數字應該返回 58', () => {
      expect(determineRecipientIDCode('12345678')).toBe('58');
    });

    it('首字母是英文應該返回 174', () => {
      expect(determineRecipientIDCode('A123456789')).toBe('174');
      expect(determineRecipientIDCode('B987654321')).toBe('174');
    });

    it('空字串應該返回空字串', () => {
      expect(determineRecipientIDCode('')).toBe('');
    });
  });

  // ============================================
  // dataPreDebuggingProcess 整合測試
  // ============================================
  describe('dataPreDebuggingProcess', () => {
    it('應該填充空值並添加 index', () => {
      const input: SheetData[] = [
        {
          [ExcelColumnKeys.ShippingOrderNumber]: 'ORDER001',
          [ExcelColumnKeys.ProductName]: 'Product A',
          [ExcelColumnKeys.Specification]: 'Spec 1',
        } as SheetData,
        {
          [ExcelColumnKeys.ShippingOrderNumber]: '',
          [ExcelColumnKeys.ProductName]: 'Product B',
          [ExcelColumnKeys.Specification]: '',
        } as SheetData,
      ];

      const result = dataPreDebuggingProcess(input);

      // 驗證填充
      expect(result[1][ExcelColumnKeys.ShippingOrderNumber]).toBe('ORDER001');
      expect(result[1][ExcelColumnKeys.Specification]).toBe('Spec 1');

      // 驗證 index
      expect(result[0]).toHaveProperty('index', 0);
      expect(result[1]).toHaveProperty('index', 1);
    });
  });
});
