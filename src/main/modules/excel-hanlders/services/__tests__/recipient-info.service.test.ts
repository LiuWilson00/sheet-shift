/**
 * 收貨人資訊處理服務單元測試
 *
 * 測試 processRecipientInfo 函數的比對、帶入、標記邏輯
 */

// Mock electron（避免 app.isPackaged 報錯）
jest.mock('electron', () => ({
  app: { isPackaged: false, getPath: jest.fn(() => '') },
}));

// Mock Google Sheets 工具
jest.mock('../../../../utils/google-sheets.tool', () => ({
  recipientInfoSheet: { get: jest.fn(() => []), set: jest.fn() },
  addSheetData: jest.fn(() => Promise.resolve(true)),
}));

// eslint-disable-next-line import/first
import { SheetData, ExcelColumnKeys } from '../../index.interface';
// eslint-disable-next-line import/first
import {
  RecipientInfoSheet,
  RecipientInfoColumnKeys,
} from '../../../../utils/google-sheets.tool/index.interface';
// eslint-disable-next-line import/first
import { STYLE_COLORS, STYLE_PRIORITY } from '../../index.const';
// eslint-disable-next-line import/first
import { processRecipientInfo } from '../recipient-info.service';

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

describe('recipient-info.service', () => {
  // ============================================
  // processRecipientInfo 測試
  // ============================================
  describe('processRecipientInfo', () => {
    const mockRecipientList: RecipientInfoSheet[] = [
      {
        [RecipientInfoColumnKeys.ManifestNumber]: 'MN001',
        [RecipientInfoColumnKeys.TaxNumber]: 'TAX001',
        [RecipientInfoColumnKeys.EnglishName]: 'JOHN DOE',
        [RecipientInfoColumnKeys.Phone]: '0912345678',
        [RecipientInfoColumnKeys.CustomsNote]: '',
      },
      {
        [RecipientInfoColumnKeys.ManifestNumber]: 'MN002',
        [RecipientInfoColumnKeys.TaxNumber]: 'TAX002',
        [RecipientInfoColumnKeys.EnglishName]: 'JANE SMITH',
        [RecipientInfoColumnKeys.Phone]: '0987654321',
        [RecipientInfoColumnKeys.CustomsNote]: '注意查驗',
      },
    ];

    it('匹配到收貨人時不應覆蓋原始英文名稱和電話', () => {
      const data: SheetData[] = [
        createRow({
          [ExcelColumnKeys.RecipientTaxNumber]: 'TAX001',
          [ExcelColumnKeys.RecipientEnglishName]: 'ORIGINAL NAME',
          [ExcelColumnKeys.RecipientPhone]: '0900000000',
        }),
      ];

      const result = processRecipientInfo(data, mockRecipientList);

      // 應保留原始資料，不被雲端覆蓋
      expect(result.data[0][ExcelColumnKeys.RecipientEnglishName]).toBe(
        'ORIGINAL NAME',
      );
      expect(result.data[0][ExcelColumnKeys.RecipientPhone]).toBe('0900000000');
    });

    it('有海關註記時應標記紅色背景', () => {
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.RecipientTaxNumber]: 'TAX002' }),
      ];

      const result = processRecipientInfo(data, mockRecipientList);

      expect(result.rowStyles.has(0)).toBe(true);
      const styles = result.rowStyles.get(0)!;
      expect(styles).toHaveLength(1);
      expect(styles[0].backgroundColor).toBe(STYLE_COLORS.RED);
      expect(styles[0].priority).toBe(STYLE_PRIORITY.CUSTOMS_NOTE);
    });

    it('無海關註記時不應有 rowStyles', () => {
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.RecipientTaxNumber]: 'TAX001' }),
      ];

      const result = processRecipientInfo(data, mockRecipientList);

      expect(result.rowStyles.size).toBe(0);
    });

    it('未匹配到收貨人時應收集為新收貨人', () => {
      const data: SheetData[] = [
        createRow({
          [ExcelColumnKeys.RecipientTaxNumber]: 'TAX_NEW',
          [ExcelColumnKeys.RecipientEnglishName]: 'NEW PERSON',
          [ExcelColumnKeys.RecipientPhone]: '0911111111',
        }),
      ];

      const result = processRecipientInfo(data, mockRecipientList);

      expect(result.newRecipients).toHaveLength(1);
      expect(result.newRecipients[0][RecipientInfoColumnKeys.TaxNumber]).toBe(
        'TAX_NEW',
      );
      expect(result.newRecipients[0][RecipientInfoColumnKeys.EnglishName]).toBe(
        'NEW PERSON',
      );
      expect(result.newRecipients[0][RecipientInfoColumnKeys.Phone]).toBe(
        '0911111111',
      );
    });

    it('相同統一編號的新收貨人不應重複收集', () => {
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.RecipientTaxNumber]: 'TAX_NEW' }),
        createRow({ [ExcelColumnKeys.RecipientTaxNumber]: 'TAX_NEW' }),
        createRow({ [ExcelColumnKeys.RecipientTaxNumber]: 'TAX_NEW' }),
      ];

      const result = processRecipientInfo(data, mockRecipientList);

      expect(result.newRecipients).toHaveLength(1);
    });

    it('沒有統一編號的行應直接返回不處理', () => {
      const data: SheetData[] = [
        createRow({ [ExcelColumnKeys.RecipientTaxNumber]: '' }),
      ];

      const result = processRecipientInfo(data, mockRecipientList);

      expect(result.newRecipients).toHaveLength(0);
      expect(result.rowStyles.size).toBe(0);
    });

    it('混合場景：有匹配、有新收貨人、有海關註記', () => {
      const data: SheetData[] = [
        createRow({
          [ExcelColumnKeys.RecipientTaxNumber]: 'TAX001',
          [ExcelColumnKeys.RecipientEnglishName]: 'ORIG_NAME_1',
        }), // 匹配，無海關註記
        createRow({
          [ExcelColumnKeys.RecipientTaxNumber]: 'TAX002',
          [ExcelColumnKeys.RecipientEnglishName]: 'ORIG_NAME_2',
        }), // 匹配，有海關註記
        createRow({
          [ExcelColumnKeys.RecipientTaxNumber]: 'TAX_NEW',
          [ExcelColumnKeys.ShippingOrderNumber]: 'SHIP001',
        }), // 新收貨人
        createRow({ [ExcelColumnKeys.RecipientTaxNumber]: '' }), // 無統一編號
      ];

      const result = processRecipientInfo(data, mockRecipientList);

      // 驗證不覆蓋原始資料
      expect(result.data[0][ExcelColumnKeys.RecipientEnglishName]).toBe(
        'ORIG_NAME_1',
      );
      expect(result.data[1][ExcelColumnKeys.RecipientEnglishName]).toBe(
        'ORIG_NAME_2',
      );

      // 驗證紅色標記（只有 index 1 有海關註記）
      expect(result.rowStyles.size).toBe(1);
      expect(result.rowStyles.has(1)).toBe(true);

      // 驗證新收貨人（含艙提單號）
      expect(result.newRecipients).toHaveLength(1);
      expect(result.newRecipients[0][RecipientInfoColumnKeys.TaxNumber]).toBe(
        'TAX_NEW',
      );
      expect(
        result.newRecipients[0][RecipientInfoColumnKeys.ManifestNumber],
      ).toBe('SHIP001');
    });

    it('空資料應返回空結果', () => {
      const result = processRecipientInfo([], mockRecipientList);

      expect(result.data).toHaveLength(0);
      expect(result.rowStyles.size).toBe(0);
      expect(result.newRecipients).toHaveLength(0);
    });
  });
});
