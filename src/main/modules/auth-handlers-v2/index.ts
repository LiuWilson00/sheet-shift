/**
 * Auth Handlers V2 - 新的類型安全實作
 *
 * 舊系統：src/main/modules/auth-handlers（保持不變）
 * 新系統：這個文件（並行運行）
 *
 * 使用新的 channel 名稱避免衝突：
 * - 舊：'login', 'logout'
 * - 新：'auth-v2/login', 'auth-v2/logout'
 */

import { createHandler, IpcError } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import { usersSheet } from '../../utils/google-sheets.tool';
import { logger } from '../../utils/logger.tool';

/**
 * 設置 Auth V2 相關的所有 IPC Handlers
 */
export function setupAuthHandlersV2() {
  logger.info('[Auth V2] Setting up handlers...');

  // ==========================================
  // 登入
  // ==========================================
  createHandler(ipcContracts.auth.login, async (input) => {
    logger.debug('[Auth V2] Login attempt', { account: input.account });

    const user = usersSheet
      .get()
      .find((user) => user.account === input.account);

    if (!user) {
      logger.warn('[Auth V2] Login failed - user not found', { account: input.account });
      return false;
    }

    if (user.password !== input.password) {
      logger.warn('[Auth V2] Login failed - incorrect password', { account: input.account });
      return false;
    }

    logger.info('[Auth V2] Login successful', { account: input.account, name: user.name });
    return user;
  });

  // ==========================================
  // 登出
  // ==========================================
  createHandler(ipcContracts.auth.logout, async () => {
    logger.info('[Auth V2] User logged out');
    return true;
  });

  logger.info('[Auth V2] All handlers registered successfully [OK]');
}
