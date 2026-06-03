/**
 * User Handlers V2 單元測試（對應 FEATURE_SPEC §8.2，案例 9–14）
 *
 * 透過 mock createHandler 攔截註冊的 handler 函式，再直接呼叫進行測試。
 * google-sheets.tool 與 logger 皆被 mock，permission.util 維持真實邏輯。
 */

import type { UsersSheet } from '../../../utils/google-sheets.tool/index.interface';

// Mock electron（避免 app.isPackaged 報錯）
jest.mock('electron', () => ({
  app: { isPackaged: false, getPath: jest.fn(() => '') },
}));

// 攔截 createHandler 註冊的 handler
const mockHandlers: Record<string, (input: any) => Promise<any>> = {};
jest.mock('../../../utils/typed-ipc-handler', () => ({
  createHandler: (contract: any, fn: (input: any) => Promise<any>) => {
    mockHandlers[contract.channel] = fn;
  },
  IpcError: class IpcError extends Error {
    code: string;

    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = 'IpcError';
    }
  },
}));

// Mock google-sheets.tool：可變的使用者資料 + writeUsersSheet
const mockUsersData: { rows: UsersSheet[] } = { rows: [] };
const mockWriteUsersSheet = jest.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_rows: UsersSheet[]): Promise<boolean> => true,
);
jest.mock('../../../utils/google-sheets.tool', () => ({
  usersSheet: {
    get: () => mockUsersData.rows,
    set: (v: UsersSheet[]) => {
      mockUsersData.rows = v;
    },
  },
  writeUsersSheet: mockWriteUsersSheet,
}));

// Mock logger
jest.mock('../../../utils/logger.tool', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// eslint-disable-next-line import/first
import { setupUserHandlersV2 } from '../index';

const ADMIN_ROW: UsersSheet = {
  name: '管理員',
  account: 'admin',
  password: 'pw-admin',
  role: 'admin',
  permissions: '',
};

const USER_ROW: UsersSheet = {
  name: '王小明',
  account: 'john',
  password: 'pw-john',
  role: '',
  permissions: 'exportShopee',
};

const seed = (): UsersSheet[] => [{ ...ADMIN_ROW }, { ...USER_ROW }];

const list = (input: any) => mockHandlers['users-v2/list'](input);
const save = (input: any) => mockHandlers['users-v2/save'](input);
const del = (input: any) => mockHandlers['users-v2/delete'](input);

beforeAll(() => {
  setupUserHandlersV2();
});

beforeEach(() => {
  mockUsersData.rows = seed();
  mockWriteUsersSheet.mockClear();
  mockWriteUsersSheet.mockResolvedValue(true);
});

describe('assertAdmin 權限驗證（案例 9）', () => {
  it('非 admin 呼叫 list 丟出 FORBIDDEN', async () => {
    await expect(list({ operatorAccount: 'john' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('非 admin 呼叫 save 丟出 FORBIDDEN', async () => {
    await expect(
      save({
        operatorAccount: 'john',
        user: {
          name: 'X',
          account: 'x',
          password: '',
          role: 'user',
          permissions: null,
        },
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('非 admin 呼叫 delete 丟出 FORBIDDEN', async () => {
    await expect(
      del({ operatorAccount: 'john', account: 'admin' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('帳號不存在的 operator 丟出 FORBIDDEN', async () => {
    await expect(list({ operatorAccount: 'ghost' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('list', () => {
  it('admin 取得所有使用者（已解析為 UserRecord，含密碼）', async () => {
    const result = await list({ operatorAccount: 'admin' });
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      name: '王小明',
      account: 'john',
      password: 'pw-john',
      role: 'user',
      permissions: ['exportShopee'],
    });
  });
});

describe('save（案例 10、11、14）', () => {
  it('新增新帳號：寫回 3 列、更新快取、回 true', async () => {
    const result = await save({
      operatorAccount: 'admin',
      user: {
        name: 'Mary',
        account: 'mary',
        password: 'pw-mary',
        role: 'user',
        permissions: ['exportPegasus'],
      },
    });

    expect(result).toBe(true);
    expect(mockWriteUsersSheet).toHaveBeenCalledTimes(1);
    const written = mockWriteUsersSheet.mock.calls[0][0] as UsersSheet[];
    expect(written).toHaveLength(3);
    // 新列以正確 key 順序與序列化寫入
    expect(written[2]).toEqual({
      name: 'Mary',
      account: 'mary',
      password: 'pw-mary',
      role: '',
      permissions: 'exportPegasus',
    });
    // 本地快取已更新
    expect(mockUsersData.rows).toHaveLength(3);
  });

  it('更新既有帳號：覆寫該列、不重複新增', async () => {
    const result = await save({
      operatorAccount: 'admin',
      user: {
        name: '王大明',
        account: 'john', // 既有
        password: 'pw-new',
        role: 'user',
        permissions: null, // 全部可見
      },
    });

    expect(result).toBe(true);
    const written = mockWriteUsersSheet.mock.calls[0][0] as UsersSheet[];
    expect(written).toHaveLength(2); // 沒有新增
    const john = written.find((u) => u.account === 'john')!;
    expect(john.name).toBe('王大明');
    expect(john.password).toBe('pw-new');
    expect(john.permissions).toBe(''); // null → 空白
  });

  it('admin 角色的使用者一律寫入空白 permissions（全部可見）', async () => {
    await save({
      operatorAccount: 'admin',
      user: {
        name: '新管理員',
        account: 'boss',
        password: 'pw',
        role: 'admin',
        permissions: ['exportShopee'], // 即使有勾選，admin 也應全部可見
      },
    });
    const written = mockWriteUsersSheet.mock.calls[0][0] as UsersSheet[];
    const boss = written.find((u) => u.account === 'boss')!;
    expect(boss.role).toBe('admin');
    expect(boss.permissions).toBe('');
  });

  it('缺少 account 或 name 丟出 INVALID_INPUT（案例 14）', async () => {
    await expect(
      save({
        operatorAccount: 'admin',
        user: {
          name: '',
          account: 'x',
          password: '',
          role: 'user',
          permissions: null,
        },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });

    await expect(
      save({
        operatorAccount: 'admin',
        user: {
          name: 'X',
          account: '  ',
          password: '',
          role: 'user',
          permissions: null,
        },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });

    expect(mockWriteUsersSheet).not.toHaveBeenCalled();
  });

  it('寫回失敗時丟出 SAVE_FAILED', async () => {
    mockWriteUsersSheet.mockResolvedValueOnce(false);
    await expect(
      save({
        operatorAccount: 'admin',
        user: {
          name: 'Mary',
          account: 'mary',
          password: '',
          role: 'user',
          permissions: null,
        },
      }),
    ).rejects.toMatchObject({ code: 'SAVE_FAILED' });
  });
});

describe('delete（案例 12、13）', () => {
  it('刪除既有帳號：寫回的陣列已移除該帳號（無殘留）', async () => {
    const result = await del({ operatorAccount: 'admin', account: 'john' });

    expect(result).toBe(true);
    const written = mockWriteUsersSheet.mock.calls[0][0] as UsersSheet[];
    expect(written).toHaveLength(1);
    expect(written.find((u) => u.account === 'john')).toBeUndefined();
    expect(mockUsersData.rows).toHaveLength(1);
  });

  it('刪除自己的帳號丟出 DELETE_SELF', async () => {
    await expect(
      del({ operatorAccount: 'admin', account: 'admin' }),
    ).rejects.toMatchObject({ code: 'DELETE_SELF' });
    expect(mockWriteUsersSheet).not.toHaveBeenCalled();
  });

  it('刪除不存在的帳號回 false、不寫回', async () => {
    const result = await del({ operatorAccount: 'admin', account: 'ghost' });
    expect(result).toBe(false);
    expect(mockWriteUsersSheet).not.toHaveBeenCalled();
  });
});
