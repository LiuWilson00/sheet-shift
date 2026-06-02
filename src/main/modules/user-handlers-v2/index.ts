/**
 * User Handlers V2 - 使用者管理 IPC 處理器（Admin 專用）
 *
 * 提供使用者的 CRUD 操作：
 * - list：取得所有使用者（含密碼，供 admin 管理）
 * - save：新增或更新使用者（以 account 為主鍵）
 * - delete：刪除使用者
 *
 * 所有操作皆於後端驗證 operatorAccount 的角色為 admin（縱深防禦）。
 */

import { createHandler, IpcError } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import { usersSheet, writeUsersSheet } from '../../utils/google-sheets.tool';
import { logger } from '../../utils/logger.tool';
import {
  normalizeRole,
  toUserRecord,
  toUsersSheet,
} from '../../../shared/permission.util';

/**
 * 設置 User V2 相關的所有 IPC Handlers
 */
// eslint-disable-next-line import/prefer-default-export
export function setupUserHandlersV2() {
  logger.info('[User V2] Setting up handlers...');

  /** 驗證操作者為 admin，否則丟出 FORBIDDEN */
  const assertAdmin = (operatorAccount: string) => {
    const op = usersSheet
      .get()
      .find((u) => u.account.toLowerCase() === operatorAccount.toLowerCase());
    if (!op || normalizeRole(op.role) !== 'admin') {
      logger.warn('[User V2] Forbidden operation', { operatorAccount });
      throw new IpcError('權限不足，僅限管理員操作', 'FORBIDDEN');
    }
  };

  // ==========================================
  // 取得所有使用者
  // ==========================================
  createHandler(ipcContracts.users.list, async (input) => {
    assertAdmin(input.operatorAccount);
    const result = usersSheet.get().map(toUserRecord);
    logger.debug('[User V2] Listed users', { count: result.length });
    return result;
  });

  // ==========================================
  // 新增或更新使用者
  // ==========================================
  createHandler(ipcContracts.users.save, async (input) => {
    assertAdmin(input.operatorAccount);

    const { user } = input;
    if (!user.account?.trim() || !user.name?.trim()) {
      throw new IpcError('帳號與姓名為必填', 'INVALID_INPUT');
    }

    const current = usersSheet.get();
    const idx = current.findIndex(
      (u) => u.account.toLowerCase() === user.account.toLowerCase(),
    );
    const row = toUsersSheet(user);
    const next =
      idx >= 0
        ? current.map((r, i) => (i === idx ? row : r))
        : [...current, row];

    const ok = await writeUsersSheet(next);
    if (!ok) {
      throw new IpcError('寫回 Google Sheets 失敗', 'SAVE_FAILED');
    }

    // 更新本地快取
    usersSheet.set(next);

    logger.info('[User V2] User saved', {
      account: user.account,
      isUpdate: idx >= 0,
    });
    return true;
  });

  // ==========================================
  // 刪除使用者
  // ==========================================
  createHandler(ipcContracts.users.delete, async (input) => {
    assertAdmin(input.operatorAccount);

    if (input.account.toLowerCase() === input.operatorAccount.toLowerCase()) {
      throw new IpcError('無法刪除自己的帳號', 'DELETE_SELF');
    }

    const current = usersSheet.get();
    const next = current.filter(
      (u) => u.account.toLowerCase() !== input.account.toLowerCase(),
    );

    if (next.length === current.length) {
      logger.warn('[User V2] User not found for deletion', {
        account: input.account,
      });
      return false;
    }

    const ok = await writeUsersSheet(next);
    if (!ok) {
      throw new IpcError('寫回 Google Sheets 失敗', 'DELETE_FAILED');
    }

    // 更新本地快取
    usersSheet.set(next);

    logger.info('[User V2] User deleted', { account: input.account });
    return true;
  });

  logger.info('[User V2] All handlers registered successfully [OK]');
}
