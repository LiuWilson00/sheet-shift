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
import type {
  SheetData,
  ProductNameMapping,
  ProductTariffCodeMap,
} from '../main/modules/excel-hanlders/index.interface';
import type {
  RecipientInfo,
  RecipientInfoLookupResult,
  AddRecipientInfoInput,
} from './recipient-info.types';
import type { ProblemItem, ProblemItemCheckResult } from './problem-item.types';
import type {
  ManifestNumberConfig,
  ApplyManifestNumberInput,
  ApplyManifestNumberOutput,
  ManifestNumberValidation,
} from './manifest-number.types';

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

  /**
   * Excel 處理相關 API
   *
   * 遷移自：src/main/context-bridge/excel.bridge.ts
   */
  excel: {
    /**
     * 選擇 Excel 檔案
     */
    selectFile: {
      channel: 'excel-v2/select-file',
    } as IpcContract<
      void,
      { path: string; isError: boolean; message?: string }
    >,

    /**
     * 匯出預設格式工作表
     */
    exportDefault: {
      channel: 'excel-v2/export-default',
    } as IpcContract<
      { settingName: string; transactionCode?: string },
      { path: string; data: SheetData[]; isError: boolean; message?: string }
    >,

    /**
     * 匯出預設格式工作表（含重量計價）
     */
    exportDefaultWithWeight: {
      channel: 'excel-v2/export-default-weight',
    } as IpcContract<
      { settingName: string; transactionCode?: string },
      { path: string; data: SheetData[]; isError: boolean; message?: string }
    >,

    /**
     * 匯出 Shopee 格式工作表
     */
    exportShopee: {
      channel: 'excel-v2/export-shopee',
    } as IpcContract<
      { settingName: string; transactionCode?: string },
      { path: string; data: SheetData[]; isError: boolean; message?: string }
    >,

    /**
     * 匯出 Shopee 新格式工作表
     */
    exportShopeeNew: {
      channel: 'excel-v2/export-shopee-new',
    } as IpcContract<
      { settingName: string; transactionCode?: string },
      { path: string; data: SheetData[]; isError: boolean; message?: string }
    >,

    /**
     * 匯出 Pegasus 格式工作表
     */
    exportPegasus: {
      channel: 'excel-v2/export-pegasus',
    } as IpcContract<
      { settingName: string; transactionCode?: string },
      { path: string; data: SheetData[]; isError: boolean; message?: string }
    >,

    /**
     * 匯出台北港格式工作表
     */
    exportTaipeiBay: {
      channel: 'excel-v2/export-taipei-bay',
    } as IpcContract<
      { settingName: string; transactionCode?: string },
      { path: string; data: SheetData[]; isError: boolean; message?: string }
    >,

    /**
     * 匯出高雄超峰格式工作表
     */
    exportKaohsiungChaofeng: {
      channel: 'excel-v2/export-kaohsiung-chaofeng',
    } as IpcContract<
      { settingName: string; transactionCode?: string },
      { path: string; data: SheetData[]; isError: boolean; message?: string }
    >,

    /**
     * 取得無法對應的資料
     */
    getWrongData: {
      channel: 'excel-v2/get-wrong-data',
    } as IpcContract<
      { aiClassify?: boolean },
      { data: { unMappingData: SheetData[] }; isError: boolean }
    >,

    /**
     * 新增產品對應
     */
    addProductMap: {
      channel: 'excel-v2/add-product-map',
    } as IpcContract<
      { data: ProductNameMapping[] },
      { data: boolean; isError: boolean }
    >,

    /**
     * 取得產品對應表
     */
    getProductMap: {
      channel: 'excel-v2/get-product-map',
    } as IpcContract<void, { data: ProductTariffCodeMap[]; isError: boolean }>,

    /**
     * AI 分類產品名稱
     */
    classifyProductName: {
      channel: 'excel-v2/classify-product-name',
    } as IpcContract<
      { productName: string },
      {
        data: {
          productName: string;
          realProductName: string;
          tariffcode: string;
        };
        isError: boolean;
      }
    >,
  },

  /**
   * 收貨人資訊相關 API
   */
  recipientInfo: {
    /**
     * 取得所有收貨人資訊
     */
    getAll: {
      channel: 'recipient-info-v2/get-all',
    } as IpcContract<void, RecipientInfo[]>,

    /**
     * 根據統一編號查詢收貨人資訊
     */
    lookup: {
      channel: 'recipient-info-v2/lookup',
    } as IpcContract<{ taxNumber: string }, RecipientInfoLookupResult>,

    /**
     * 新增收貨人資訊
     */
    add: {
      channel: 'recipient-info-v2/add',
    } as IpcContract<AddRecipientInfoInput, boolean>,

    /**
     * 批量新增收貨人資訊
     */
    addBatch: {
      channel: 'recipient-info-v2/add-batch',
    } as IpcContract<AddRecipientInfoInput[], boolean>,

    /**
     * 重新載入收貨人資訊
     */
    reload: {
      channel: 'recipient-info-v2/reload',
    } as IpcContract<void, boolean>,
  },

  /**
   * 問題件相關 API
   */
  problemItems: {
    /**
     * 取得所有問題件
     */
    getAll: {
      channel: 'problem-items-v2/get-all',
    } as IpcContract<void, ProblemItem[]>,

    /**
     * 檢查貨物名稱是否為問題件
     */
    check: {
      channel: 'problem-items-v2/check',
    } as IpcContract<{ productName: string }, ProblemItemCheckResult>,

    /**
     * 批量檢查貨物名稱是否為問題件
     */
    checkBatch: {
      channel: 'problem-items-v2/check-batch',
    } as IpcContract<{ productNames: string[] }, ProblemItemCheckResult[]>,

    /**
     * 重新載入問題件
     */
    reload: {
      channel: 'problem-items-v2/reload',
    } as IpcContract<void, boolean>,
  },

  /**
   * 艙單編號相關 API
   */
  manifestNumber: {
    /**
     * 取得所有艙單編號設定
     */
    getConfigs: {
      channel: 'manifest-number-v2/get-configs',
    } as IpcContract<void, ManifestNumberConfig[]>,

    /**
     * 取得單一艙單編號設定
     */
    getConfig: {
      channel: 'manifest-number-v2/get-config',
    } as IpcContract<{ settingName: string }, ManifestNumberConfig | null>,

    /**
     * 儲存艙單編號設定（新增或更新）
     */
    saveConfig: {
      channel: 'manifest-number-v2/save-config',
    } as IpcContract<ManifestNumberConfig, boolean>,

    /**
     * 刪除艙單編號設定
     */
    deleteConfig: {
      channel: 'manifest-number-v2/delete-config',
    } as IpcContract<{ settingName: string }, boolean>,

    /**
     * 產生艙單編號
     */
    generate: {
      channel: 'manifest-number-v2/generate',
    } as IpcContract<ApplyManifestNumberInput, ApplyManifestNumberOutput>,

    /**
     * 驗證艙單編號格式
     */
    validate: {
      channel: 'manifest-number-v2/validate',
    } as IpcContract<
      { number: string; settingName: string },
      ManifestNumberValidation
    >,

    /**
     * 更新當前編號
     */
    updateCurrentNumber: {
      channel: 'manifest-number-v2/update-current-number',
    } as IpcContract<{ settingName: string; currentNumber: string }, boolean>,

    /**
     * 重新載入艙單編號設定
     */
    reload: {
      channel: 'manifest-number-v2/reload',
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
export type ExtractInput<T extends IpcContract<any, any>> =
  T extends IpcContract<infer I, any> ? I : never;

/**
 * 從契約中提取輸出類型
 */
export type ExtractOutput<T extends IpcContract<any, any>> =
  T extends IpcContract<any, infer O> ? O : never;
