/**
 * 權限工具函式單元測試（對應 FEATURE_SPEC §8.1）
 */

import {
  normalizeRole,
  parsePermissions,
  serializePermissions,
  toAppUser,
  toUserRecord,
  toUsersSheet,
  canSeeExport,
} from '../permission.util';
import type { ExportPermissionKey, UserRecord } from '../permission.types';

describe('normalizeRole', () => {
  it('空白 role 正規化為 user (案例 5)', () => {
    expect(normalizeRole('')).toBe('user');
    expect(normalizeRole(undefined)).toBe('user');
  });

  it('admin（含大小寫/空白）正規化為 admin (案例 6)', () => {
    expect(normalizeRole(' Admin ')).toBe('admin');
    expect(normalizeRole('ADMIN')).toBe('admin');
    expect(normalizeRole('admin')).toBe('admin');
  });

  it('其他值視為 user', () => {
    expect(normalizeRole('superuser')).toBe('user');
  });
});

describe('parsePermissions', () => {
  it('空白 → null（全部可見, 案例 2）', () => {
    expect(parsePermissions('')).toBeNull();
    expect(parsePermissions(undefined)).toBeNull();
    expect(parsePermissions('   ')).toBeNull();
  });

  it('解析逗號分隔字串並 trim', () => {
    expect(parsePermissions('exportShopee, exportPegasus')).toEqual([
      'exportShopee',
      'exportPegasus',
    ]);
  });

  it('過濾非法 key (案例 7)', () => {
    expect(parsePermissions('exportShopee,foo')).toEqual(['exportShopee']);
  });
});

describe('serializePermissions', () => {
  it('null → 空字串 (案例 8)', () => {
    expect(serializePermissions(null)).toBe('');
  });

  it('陣列 → 逗號分隔字串', () => {
    expect(serializePermissions(['exportShopee', 'exportPegasus'])).toBe(
      'exportShopee,exportPegasus',
    );
  });
});

describe('toAppUser', () => {
  it('解析 Sheet 列為 AppUser（不含密碼）', () => {
    const user = toAppUser({
      name: '王小明',
      account: 'john',
      password: '1234',
      role: '',
      permissions: 'exportShopee',
    });
    expect(user).toEqual({
      name: '王小明',
      account: 'john',
      role: 'user',
      permissions: ['exportShopee'],
    });
    expect(user).not.toHaveProperty('password');
  });
});

describe('toUserRecord / toUsersSheet 往返', () => {
  it('toUserRecord 含密碼', () => {
    const rec = toUserRecord({
      name: 'A',
      account: 'a',
      password: 'pw',
      role: 'admin',
      permissions: '',
    });
    expect(rec).toEqual({
      name: 'A',
      account: 'a',
      password: 'pw',
      role: 'admin',
      permissions: null,
    });
  });

  it('toUsersSheet 以固定 key 順序輸出，admin role 寫 admin，user 寫空白', () => {
    const rec: UserRecord = {
      name: 'A',
      account: 'a',
      password: 'pw',
      role: 'user',
      permissions: ['exportShopee'],
    };
    const row = toUsersSheet(rec);
    expect(Object.keys(row)).toEqual([
      'name',
      'account',
      'password',
      'role',
      'permissions',
    ]);
    expect(row.role).toBe('');
    expect(row.permissions).toBe('exportShopee');
  });

  it('toUsersSheet：null permissions 寫空白', () => {
    const row = toUsersSheet({
      name: 'A',
      account: 'a',
      password: 'pw',
      role: 'admin',
      permissions: null,
    });
    expect(row.role).toBe('admin');
    expect(row.permissions).toBe('');
  });
});

describe('canSeeExport', () => {
  const ALL_KEYS: ExportPermissionKey[] = [
    'exportTaipeiBay',
    'exportKaohsiungChaofeng',
    'exportShopee',
    'exportShopeeNew',
    'exportPegasus',
    'manifestNumber',
  ];

  it('admin 一律全部可見 (案例 1)', () => {
    const admin = { role: 'admin' as const, permissions: [] };
    ALL_KEYS.forEach((k) => expect(canSeeExport(admin, k)).toBe(true));
  });

  it('permissions=null 全部可見 (案例 2)', () => {
    const user = { role: 'user' as const, permissions: null };
    ALL_KEYS.forEach((k) => expect(canSeeExport(user, k)).toBe(true));
  });

  it('部分權限只見列表內 (案例 3)', () => {
    const user = {
      role: 'user' as const,
      permissions: ['exportShopee'] as ExportPermissionKey[],
    };
    expect(canSeeExport(user, 'exportShopee')).toBe(true);
    expect(canSeeExport(user, 'exportPegasus')).toBe(false);
  });

  it('無任何權限 → 全部不可見 (案例 4)', () => {
    const user = { role: 'user' as const, permissions: [] };
    ALL_KEYS.forEach((k) => expect(canSeeExport(user, k)).toBe(false));
  });
});
