/**
 * IPC API 契約定義（新架構）
 *
 * ⚠️ 注意：這是新的類型安全 IPC 系統
 * 與舊的 src/constants/ipc-channels.ts 並存，互不影響
 *
 * 使用方式：
 * - Main Process: 使用 createHandler(ipcContracts.xxx.yyy, handler)
 * - Renderer Process: 使用 ipcApi.xxx.yyy(input)
 */

import type { Settings } from '../main/utils/setting.tool';
import type {
  GoogleSheetConnectionSetting,
  GoogleSheetConnectionResult,
} from '../main/utils/google-sheets.tool';
import type { UsersSheet } from '../main/utils/google-sheets.tool/index.interface';

/**
 * IPC 契約介面
 */
export interface IpcContract<TInput = void, TOutput = void> {
  channel: string;
  _input?: TInput;
  _output?: TOutput;
}

/**
 * 標準化的 API 響應格式
 */
export interface ApiResponse<T = unknown> {
  isError: boolean;
  data?: T;
  message?: string;
}

/**
 * 所有 IPC API 的類型安全契約
 *
 * 遷移策略：
 * 1. 先遷移 Settings API（最簡單）
 * 2. 驗證無問題後再遷移其他 API
 * 3. 舊的 IPC_CHANNELS 保持不變，繼續工作
 */
export const ipcContracts = {
  /**
   * 設置相關 API（新）
   *
   * 使用新的 channel 名稱，避免與舊系統衝突：
   * - 舊: 'save-settings' / 'get-settings'
   * - 新: 'settings-v2/get' / 'settings-v2/save'
   */
  settingsV2: {
    /**
     * 獲取設置（新 API）
     */
    get: {
      channel: 'settings-v2/get',
    } as IpcContract<{ settingName?: string }, Settings>,

    /**
     * 保存設置（新 API）
     */
    save: {
      channel: 'settings-v2/save',
    } as IpcContract<{ data: Settings; settingName?: string }, boolean>,

    /**
     * 獲取 Google Sheets 設置（新 API）
     */
    getSheet: {
      channel: 'settings-v2/get-sheet',
    } as IpcContract<{ settingName?: string }, GoogleSheetConnectionSetting>,

    /**
     * 保存 Google Sheets 設置（新 API）
     */
    saveSheet: {
      channel: 'settings-v2/save-sheet',
    } as IpcContract<GoogleSheetConnectionSetting, boolean>,

    /**
     * 匯入設置檔案（開啟檔案對話框選擇 JSON 檔案）
     */
    importSheet: {
      channel: 'settings-v2/import-sheet',
    } as IpcContract<void, boolean>,

    /**
     * 取得系統設置表單名稱列表
     */
    getSheetNames: {
      channel: 'settings-v2/get-sheet-names',
    } as IpcContract<void, string[]>,
  },

  /**
   * 應用程式狀態相關 API
   */
  app: {
    /**
     * 應用程式初始化（連接 Google Sheets）
     */
    init: {
      channel: 'app-v2/init',
    } as IpcContract<void, GoogleSheetConnectionResult>,

    /**
     * 檢查資料是否已初始化
     */
    isInitialized: {
      channel: 'app-v2/is-initialized',
    } as IpcContract<void, boolean>,
  },

  /**
   * 認證相關 API
   */
  auth: {
    /**
     * 登入
     */
    login: {
      channel: 'auth-v2/login',
    } as IpcContract<{ account: string; password: string }, UsersSheet | false>,

    /**
     * 登出
     */
    logout: {
      channel: 'auth-v2/logout',
    } as IpcContract<void, boolean>,
  },
} as const;

/**
 * IPC 契約類型
 */
export type IpcContracts = typeof ipcContracts;

/**
 * 從契約中提取輸入類型
 */
export type ExtractInput<T extends IpcContract<any, any>> = T extends IpcContract<infer I, any>
  ? I
  : never;

/**
 * 從契約中提取輸出類型
 */
export type ExtractOutput<T extends IpcContract<any, any>> = T extends IpcContract<any, infer O>
  ? O
  : never;
