/**
 * 權限工具函式（前後端共用）
 *
 * 負責 Google Sheet 原始字串 ↔ 應用層模型之間的解析/序列化，
 * 以及匯出按鈕的可見性判定。
 */

import {
  AppUser,
  ExportPermissionKey,
  EXPORT_PERMISSION_ITEMS,
  UserRecord,
  UserRole,
} from './permission.types';
import type { UsersSheet } from '../main/utils/google-sheets.tool/index.interface';

/** 合法的權限 key 集合（用於過濾髒資料） */
const VALID_KEYS = new Set<string>(EXPORT_PERMISSION_ITEMS.map((i) => i.key));

/** 正規化角色：去除空白、不分大小寫；'admin' → 'admin'，其餘 → 'user' */
export function normalizeRole(role?: string): UserRole {
  return (role ?? '').trim().toLowerCase() === 'admin' ? 'admin' : 'user';
}

/**
 * 解析逗號分隔的權限字串 → 陣列或 null
 *
 * 空白（含 undefined / 全空白）視為「全部可見」回傳 null；
 * 否則切割、trim、過濾掉非法 key。
 */
export function parsePermissions(raw?: string): ExportPermissionKey[] | null {
  if (!raw || !raw.trim()) return null;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => VALID_KEYS.has(s)) as ExportPermissionKey[];
}

/** 序列化權限陣列 → 字串（null → 空字串） */
export function serializePermissions(
  permissions: ExportPermissionKey[] | null,
): string {
  return permissions ? permissions.join(',') : '';
}

/** Sheet 列 → 應用層 AppUser（不含密碼） */
export function toAppUser(row: UsersSheet): AppUser {
  return {
    name: row.name,
    account: row.account,
    role: normalizeRole(row.role),
    permissions: parsePermissions(row.permissions),
  };
}

/** Sheet 列 → 完整 UserRecord（含密碼，供 admin 管理） */
export function toUserRecord(row: UsersSheet): UserRecord {
  return { ...toAppUser(row), password: row.password };
}

/**
 * UserRecord → Sheet 列
 *
 * 以固定 key 順序建構物件，確保寫回 Google Sheets 時標頭穩定
 * （updateSheetData 以第一個物件的 Object.keys 產生標頭列）。
 */
export function toUsersSheet(user: UserRecord): UsersSheet {
  return {
    name: user.name,
    account: user.account,
    password: user.password,
    role: user.role === 'admin' ? 'admin' : '',
    permissions: serializePermissions(user.permissions),
  };
}

/** 權限判定：該使用者是否可見某匯出按鈕 */
export function canSeeExport(
  user: Pick<AppUser, 'role' | 'permissions'>,
  key: ExportPermissionKey,
): boolean {
  if (user.role === 'admin') return true;
  if (user.permissions === null) return true;
  return user.permissions.includes(key);
}
