/**
 * 艙單編號產生器單元測試
 *
 * 測試純函數：incrementNumber, isBlacklisted, getNextValidNumber, generateFirstNumber
 */

import type {
  ManifestNumberFormat,
  BlacklistRule,
} from '../../../../shared/manifest-number.types';

// Mock electron（避免 app.isPackaged 報錯）
jest.mock('electron', () => ({
  app: { isPackaged: false, getPath: jest.fn(() => '') },
}));

// Mock 外部依賴（避免載入 Google Sheets 等模組）
jest.mock('../../../utils/typed-ipc-handler', () => ({
  createHandler: jest.fn(),
  IpcError: class IpcError extends Error {
    code: string;

    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

jest.mock('../../../utils/google-sheets.tool', () => ({
  manifestNumberConfigSheet: { get: jest.fn(() => []), set: jest.fn() },
  updateSheetData: jest.fn(),
  initGoogleSheetData: jest.fn(),
  client: { get: jest.fn() },
}));

jest.mock('../../../utils/logger.tool', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../../shared/ipc-contracts', () => ({
  ipcContracts: {
    manifestNumber: {
      getConfigs: {},
      getConfig: {},
      saveConfig: {},
      deleteConfig: {},
      generate: {},
      validate: {},
      updateCurrentNumber: {},
      reload: {},
    },
  },
}));

// eslint-disable-next-line import/first
import {
  generateFirstNumber,
  incrementNumber,
  isBlacklisted,
  getNextValidNumber,
} from '../index';

describe('艙單編號產生器', () => {
  // ============================================
  // generateFirstNumber 測試
  // ============================================
  describe('generateFirstNumber', () => {
    it('純數字格式應產生全 0', () => {
      const format: ManifestNumberFormat = {
        segments: [{ type: 'numeric', length: 4 }],
      };
      expect(generateFirstNumber(format)).toBe('0000');
    });

    it('純英文格式應產生全 A', () => {
      const format: ManifestNumberFormat = {
        segments: [{ type: 'alpha', length: 2 }],
      };
      expect(generateFirstNumber(format)).toBe('AA');
    });

    it('混合格式應產生正確的初始值', () => {
      const format: ManifestNumberFormat = {
        segments: [
          { type: 'alpha', length: 2 },
          { type: 'numeric', length: 4 },
        ],
      };
      expect(generateFirstNumber(format)).toBe('AA0000');
    });

    it('多區段混合格式', () => {
      const format: ManifestNumberFormat = {
        segments: [
          { type: 'alpha', length: 1 },
          { type: 'numeric', length: 3 },
          { type: 'alpha', length: 1 },
        ],
      };
      expect(generateFirstNumber(format)).toBe('A000A');
    });
  });

  // ============================================
  // incrementNumber 測試
  // ============================================
  describe('incrementNumber', () => {
    const numericFormat: ManifestNumberFormat = {
      segments: [{ type: 'numeric', length: 4 }],
    };

    const alphaFormat: ManifestNumberFormat = {
      segments: [{ type: 'alpha', length: 2 }],
    };

    const mixedFormat: ManifestNumberFormat = {
      segments: [
        { type: 'alpha', length: 2 },
        { type: 'numeric', length: 4 },
      ],
    };

    it('數字遞增：0000 → 0001', () => {
      expect(incrementNumber('0000', numericFormat)).toBe('0001');
    });

    it('數字遞增：0009 → 0010', () => {
      expect(incrementNumber('0009', numericFormat)).toBe('0010');
    });

    it('數字遞增：0099 → 0100', () => {
      expect(incrementNumber('0099', numericFormat)).toBe('0100');
    });

    it('數字遞增：0999 → 1000', () => {
      expect(incrementNumber('0999', numericFormat)).toBe('1000');
    });

    it('數字溢出：9999 → null', () => {
      expect(incrementNumber('9999', numericFormat)).toBeNull();
    });

    it('英文遞增：AA → AB', () => {
      expect(incrementNumber('AA', alphaFormat)).toBe('AB');
    });

    it('英文遞增：AZ → BA', () => {
      expect(incrementNumber('AZ', alphaFormat)).toBe('BA');
    });

    it('英文溢出：ZZ → null', () => {
      expect(incrementNumber('ZZ', alphaFormat)).toBeNull();
    });

    it('混合格式遞增數字部分：AA0000 → AA0001', () => {
      expect(incrementNumber('AA0000', mixedFormat)).toBe('AA0001');
    });

    it('混合格式數字區段滿進位到英文區段：AA9999 → AB0000', () => {
      expect(incrementNumber('AA9999', mixedFormat)).toBe('AB0000');
    });

    it('混合格式正常進位：AZ9999 → BA0000', () => {
      expect(incrementNumber('AZ9999', mixedFormat)).toBe('BA0000');
    });

    it('混合格式全滿溢出：ZZ9999 → null', () => {
      expect(incrementNumber('ZZ9999', mixedFormat)).toBeNull();
    });

    it('混合格式中間值：AA1234 → AA1235', () => {
      expect(incrementNumber('AA1234', mixedFormat)).toBe('AA1235');
    });
  });

  // ============================================
  // isBlacklisted 測試
  // ============================================
  describe('isBlacklisted', () => {
    const emptyBlacklist: BlacklistRule = { ranges: [], singles: [] };

    it('空黑名單應返回 false', () => {
      expect(isBlacklisted('AA0001', emptyBlacklist)).toBe(false);
    });

    it('在 singles 中應返回 true', () => {
      const blacklist: BlacklistRule = {
        ranges: [],
        singles: ['AA0001', 'AA0005'],
      };
      expect(isBlacklisted('AA0001', blacklist)).toBe(true);
      expect(isBlacklisted('AA0005', blacklist)).toBe(true);
    });

    it('不在 singles 中應返回 false', () => {
      const blacklist: BlacklistRule = {
        ranges: [],
        singles: ['AA0001'],
      };
      expect(isBlacklisted('AA0002', blacklist)).toBe(false);
    });

    it('在 ranges 區間內應返回 true', () => {
      const blacklist: BlacklistRule = {
        ranges: [{ start: 'AA0010', end: 'AA0020' }],
        singles: [],
      };
      expect(isBlacklisted('AA0010', blacklist)).toBe(true);
      expect(isBlacklisted('AA0015', blacklist)).toBe(true);
      expect(isBlacklisted('AA0020', blacklist)).toBe(true);
    });

    it('不在 ranges 區間內應返回 false', () => {
      const blacklist: BlacklistRule = {
        ranges: [{ start: 'AA0010', end: 'AA0020' }],
        singles: [],
      };
      expect(isBlacklisted('AA0009', blacklist)).toBe(false);
      expect(isBlacklisted('AA0021', blacklist)).toBe(false);
    });

    it('多個 ranges 區間', () => {
      const blacklist: BlacklistRule = {
        ranges: [
          { start: 'AA0010', end: 'AA0020' },
          { start: 'AA0050', end: 'AA0060' },
        ],
        singles: [],
      };
      expect(isBlacklisted('AA0015', blacklist)).toBe(true);
      expect(isBlacklisted('AA0055', blacklist)).toBe(true);
      expect(isBlacklisted('AA0030', blacklist)).toBe(false);
    });

    it('同時有 ranges 和 singles', () => {
      const blacklist: BlacklistRule = {
        ranges: [{ start: 'AA0010', end: 'AA0020' }],
        singles: ['AA0005'],
      };
      expect(isBlacklisted('AA0005', blacklist)).toBe(true);
      expect(isBlacklisted('AA0015', blacklist)).toBe(true);
      expect(isBlacklisted('AA0025', blacklist)).toBe(false);
    });
  });

  // ============================================
  // getNextValidNumber 測試
  // ============================================
  describe('getNextValidNumber', () => {
    const format: ManifestNumberFormat = {
      segments: [
        { type: 'alpha', length: 2 },
        { type: 'numeric', length: 4 },
      ],
    };

    const emptyBlacklist: BlacklistRule = { ranges: [], singles: [] };

    it('無黑名單時直接遞增', () => {
      const result = getNextValidNumber('AA0000', format, emptyBlacklist);
      expect(result).toEqual({ number: 'AA0001', skipped: [] });
    });

    it('跳過黑名單中的單個編號', () => {
      const blacklist: BlacklistRule = {
        ranges: [],
        singles: ['AA0001'],
      };
      const result = getNextValidNumber('AA0000', format, blacklist);
      expect(result).toEqual({ number: 'AA0002', skipped: ['AA0001'] });
    });

    it('跳過連續黑名單', () => {
      const blacklist: BlacklistRule = {
        ranges: [],
        singles: ['AA0001', 'AA0002', 'AA0003'],
      };
      const result = getNextValidNumber('AA0000', format, blacklist);
      expect(result).toEqual({
        number: 'AA0004',
        skipped: ['AA0001', 'AA0002', 'AA0003'],
      });
    });

    it('跳過黑名單區間', () => {
      const blacklist: BlacklistRule = {
        ranges: [{ start: 'AA0001', end: 'AA0005' }],
        singles: [],
      };
      const result = getNextValidNumber('AA0000', format, blacklist);
      expect(result).toEqual({
        number: 'AA0006',
        skipped: ['AA0001', 'AA0002', 'AA0003', 'AA0004', 'AA0005'],
      });
    });

    it('到達最大值時返回 null', () => {
      const smallFormat: ManifestNumberFormat = {
        segments: [{ type: 'numeric', length: 1 }],
      };
      const result = getNextValidNumber('9', smallFormat, emptyBlacklist);
      expect(result).toBeNull();
    });
  });
});
