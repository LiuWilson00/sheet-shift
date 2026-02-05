/**
 * 問題件檢查服務單元測試
 *
 * 測試 checkProblemItems 函數的完全匹配邏輯和標記行為
 */

// Mock electron（避免 app.isPackaged 報錯）
jest.mock('electron', () => ({
  app: { isPackaged: false, getPath: jest.fn(() => '') },
}));

// Mock Google Sheets 工具
jest.mock('../../../../utils/google-sheets.tool', () => ({
  problemItemsSheet: { get: jest.fn(() => []) },
}));

// eslint-disable-next-line import/first
import { SheetData, ExcelColumnKeys } from '../../index.interface';
// eslint-disable-next-line import/first
import {
  ProblemItemSheet,
  ProblemItemColumnKeys,
} from '../../../../utils/google-sheets.tool/index.interface';
// eslint-disable-next-line import/first
import { STYLE_COLORS, STYLE_PRIORITY } from '../../index.const';
// eslint-disable-next-line import/first
import { checkProblemItems } from '../problem-items.service';

// 建立測試用 SheetData
function createRow(overrides: Partial<SheetData> = {}): SheetData {
  return {
    [ExcelColumnKeys.ShippingOrderNumber]: 'ORDER001',
    [ExcelColumnKeys.CourierTaxNumber]: '12345678',
    [ExcelColumnKeys.ProductName]: '測試商品',
    [ExcelColumnKeys.Brand]: '',
    [ExcelColumnKeys.Specification]: '',
    [ExcelColumnKeys.NetWeight]: 1,
    [ExcelColumnKeys.GrossWeight]: 2,
    [ExcelColumnKeys.Quantity]: 1,
    [ExcelColumnKeys.QuantityUnit]: 'PCE',
    [ExcelColumnKeys.TradeConditionCode]: 'CIF',
    [ExcelColumnKeys.CurrencyCode]: 'USD',
    [ExcelColumnKeys.TotalBoxes]: 1,
    [ExcelColumnKeys.BoxUnit]: 'CT',
    [ExcelColumnKeys.CountryOfOriginCode]: 'CN',
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
    [ExcelColumnKeys.UnitPrice]: 100,
    [ExcelColumnKeys.TotalAmount]: 100,
    [ExcelColumnKeys.OriginalAmount]: '',
    [ExcelColumnKeys.ProcessedAmount]: '',
    [ExcelColumnKeys.index]: 0,
    ...overrides,
  };
}

describe('problem-items.service', () => {
  // ============================================
  // checkProblemItems 測試
  // ============================================
  describe('checkProblemItems', () => {
    const mockProblemItems: ProblemItemSheet[] = [
      { [ProblemItemColumnKeys.ProductName]: '危險品A' },
      { [ProblemItemColumnKeys.ProductName]: '危險品B' },
      { [ProblemItemColumnKeys.ProductName]: '管制物品' },
    ];

    it('匹配到問題件時應返回紅色背景樣式', () => {
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.ProductName]: '危險品A' }),
      ];

      const result = checkProblemItems(data, mockProblemItems);

      expect(result.has(0)).toBe(true);
      const styles = result.get(0)!;
      expect(styles).toHaveLength(1);
      expect(styles[0].backgroundColor).toBe(STYLE_COLORS.RED);
      expect(styles[0].priority).toBe(STYLE_PRIORITY.PROBLEM_ITEM);
    });

    it('未匹配到問題件時應返回空 Map', () => {
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.ProductName]: '安全商品' }),
      ];

      const result = checkProblemItems(data, mockProblemItems);

      expect(result.size).toBe(0);
    });

    it('應使用完全匹配（部分匹配不應命中）', () => {
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.ProductName]: '危險品' }), // 部分匹配
        createRow({ [ExcelColumnKeys.ProductName]: '危險品A超大' }), // 包含但不完全
        createRow({ [ExcelColumnKeys.ProductName]: '危險品A' }), // 完全匹配
      ];

      const result = checkProblemItems(data, mockProblemItems);

      // 只有 index 2 完全匹配
      expect(result.size).toBe(1);
      expect(result.has(2)).toBe(true);
    });

    it('多行匹配到問題件', () => {
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.ProductName]: '危險品A' }),
        createRow({ [ExcelColumnKeys.ProductName]: '安全商品' }),
        createRow({ [ExcelColumnKeys.ProductName]: '管制物品' }),
      ];

      const result = checkProblemItems(data, mockProblemItems);

      expect(result.size).toBe(2);
      expect(result.has(0)).toBe(true);
      expect(result.has(2)).toBe(true);
    });

    it('空資料應返回空 Map', () => {
      const result = checkProblemItems([], mockProblemItems);
      expect(result.size).toBe(0);
    });

    it('空問題件列表應返回空 Map', () => {
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.ProductName]: '危險品A' }),
      ];

      const result = checkProblemItems(data, []);
      expect(result.size).toBe(0);
    });

    it('產品名稱為空時應跳過', () => {
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.ProductName]: '' }),
      ];

      const result = checkProblemItems(data, mockProblemItems);
      expect(result.size).toBe(0);
    });

    it('應忽略前後空白進行匹配（trim）', () => {
      const itemsWithSpaces: ProblemItemSheet[] = [
        { [ProblemItemColumnKeys.ProductName]: '  危險品A  ' },
      ];
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.ProductName]: '危險品A' }),
      ];

      const result = checkProblemItems(data, itemsWithSpaces);

      // trim 後應可匹配
      expect(result.size).toBe(1);
    });
  });
});
