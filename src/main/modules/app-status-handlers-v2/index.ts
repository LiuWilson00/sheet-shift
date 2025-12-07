/**
 * App Status Handlers V2 - 新的類型安全實作
 *
 * 舊系統：src/main/modules/app-status-handlers（保持不變）
 * 新系統：這個文件（並行運行）
 *
 * 使用新的 channel 名稱避免衝突：
 * - 舊：'app-start-init', 'get-data-initialized'
 * - 新：'app-v2/init', 'app-v2/is-initialized'
 */

import { createHandler } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import { GoogleSheetConnectionStore } from '../../status-store';
import { initGoogleConnection } from '../../utils/google-sheets.tool';
import { logger } from '../../utils/logger.tool';

/**
 * 設置 App Status V2 相關的所有 IPC Handlers
 */
export function setupAppStatusHandlersV2() {
  logger.info('[App Status V2] Setting up handlers...');

  // ==========================================
  // 應用程式初始化（連接 Google Sheets）
  // ==========================================
  createHandler(ipcContracts.app.init, async () => {
    logger.info('[App Status V2] Initializing application...');

    const result = await initGoogleConnection();

    if (result.isConnected) {
      logger.info('[App Status V2] Google Sheets connected successfully');
    } else {
      logger.warn('[App Status V2] Google Sheets connection failed', {
        error: result.error,
        code: result.code,
      });
    }

    return result;
  });

  // ==========================================
  // 檢查資料是否已初始化
  // ==========================================
  createHandler(ipcContracts.app.isInitialized, async () => {
    const connectionState = GoogleSheetConnectionStore.get();
    const isConnected = connectionState?.isConnected ?? false;

    logger.debug('[App Status V2] Checking initialization status', { isConnected });

    return isConnected;
  });

  logger.info('[App Status V2] All handlers registered successfully [OK]');
}
