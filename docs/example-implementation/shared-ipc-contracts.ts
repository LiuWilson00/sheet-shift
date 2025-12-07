/**
 * IPC API 契約定義
 *
 * 這個文件定義了所有 Main Process 和 Renderer Process 之間的通信契約
 * 確保類型安全和 API 的一致性
 *
 * 使用方式：
 * - Main Process: 使用 createHandler(ipcContracts.xxx.yyy, handler)
 * - Renderer Process: 使用 ipcApi.xxx.yyy(input)
 */

import type { Settings } from '../../src/main/utils/setting.tool';
import type { GoogleSheetConnectionSetting } from '../../src/main/utils/google-sheets.tool';

/**
 * IPC 契約介面
 *
 * @template TInput 輸入參數類型（void 表示無參數）
 * @template TOutput 輸出結果類型
 */
export interface IpcContract<TInput = void, TOutput = void> {
  /** IPC Channel 名稱 */
  channel: string;
  /** 輸入類型（僅用於類型推導，不會在運行時使用） */
  _input?: TInput;
  /** 輸出類型（僅用於類型推導，不會在運行時使用） */
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
 * Excel 數據結果
 */
export interface ExcelDataResult<T = unknown> extends ApiResponse<T> {
  path: string;
  data: Array<T>;
}

/**
 * 產品名稱映射
 */
export interface ProductNameMapping {
  originalProductName: string;
  correctProductName: string;
  tariffCode: string;
}

/**
 * 產品關稅代碼映射
 */
export interface ProductTariffCodeMap {
  correctProductName: string;
  tariffCode: string;
}

/**
 * Sheet 數據
 */
export interface SheetData {
  productName: string;
  [key: string]: any;
}

/**
 * 產品分類結果
 */
export interface ProductNameClassify {
  productName: string;
  realProductName: string;
  tariffcode: string;
}

/**
 * 所有 IPC API 的類型安全契約
 *
 * 組織結構：
 * - settings: 設置相關 API
 * - excel: Excel 文件處理相關 API
 * - auth: 認證相關 API
 * - app: 應用程序狀態相關 API
 */
export const ipcContracts = {
  /**
   * 設置相關 API
   */
  settings: {
    /**
     * 獲取設置
     */
    get: {
      channel: 'settings/get',
    } as IpcContract<{ settingName?: string }, Settings>,

    /**
     * 保存設置
     */
    save: {
      channel: 'settings/save',
    } as IpcContract<{ data: Settings; settingName?: string }, boolean>,

    /**
     * 獲取 Google Sheets 設置
     */
    getSheet: {
      channel: 'settings/get-sheet',
    } as IpcContract<{ settingName?: string }, GoogleSheetConnectionSetting>,

    /**
     * 保存 Google Sheets 設置
     */
    saveSheet: {
      channel: 'settings/save-sheet',
    } as IpcContract<GoogleSheetConnectionSetting, boolean>,

    /**
     * 導入 Google Sheets 設置
     */
    importSheet: {
      channel: 'settings/import-sheet',
    } as IpcContract<GoogleSheetConnectionSetting, boolean>,

    /**
     * 獲取系統設置 Sheet 名稱列表
     */
    getSystemSheetNames: {
      channel: 'settings/get-system-sheet-names',
    } as IpcContract<void, string[]>,
  },

  /**
   * Excel 處理相關 API
   */
  excel: {
    /**
     * 選擇 Excel 文件
     */
    selectFile: {
      channel: 'excel/select-file',
    } as IpcContract<void, ExcelDataResult>,

    /**
     * 導出預設格式
     */
    exportDefault: {
      channel: 'excel/export-default',
    } as IpcContract<{ settingName: string }, ExcelDataResult>,

    /**
     * 導出預設格式（帶重量處理）
     */
    exportDefaultWithWeight: {
      channel: 'excel/export-default-with-weight',
    } as IpcContract<{ settingName: string }, ExcelDataResult>,

    /**
     * 導出 Pegasus 格式
     */
    exportPegasus: {
      channel: 'excel/export-pegasus',
    } as IpcContract<{ settingName: string }, ExcelDataResult>,

    /**
     * 導出 Shopee 格式
     */
    exportShopee: {
      channel: 'excel/export-shopee',
    } as IpcContract<{ settingName: string }, ExcelDataResult>,

    /**
     * 導出 Shopee 新格式
     */
    exportShopeeNew: {
      channel: 'excel/export-shopee-new',
    } as IpcContract<{ settingName: string }, ExcelDataResult>,

    /**
     * 獲取錯誤數據
     */
    getWrongData: {
      channel: 'excel/get-wrong-data',
    } as IpcContract<
      { aiClassify: boolean },
      ApiResponse<{ unMappingData: SheetData[] }>
    >,

    /**
     * 添加新的產品映射
     */
    addProductMap: {
      channel: 'excel/add-product-map',
    } as IpcContract<{ mappings: ProductNameMapping[] }, ApiResponse<boolean>>,

    /**
     * 獲取產品映射
     */
    getProductMap: {
      channel: 'excel/get-product-map',
    } as IpcContract<void, ApiResponse<ProductTariffCodeMap[]>>,

    /**
     * 分類產品名稱
     */
    classifyProductName: {
      channel: 'excel/classify-product-name',
    } as IpcContract<{ productName: string }, ApiResponse<ProductNameClassify>>,
  },

  /**
   * 認證相關 API
   */
  auth: {
    /**
     * 登入
     */
    login: {
      channel: 'auth/login',
    } as IpcContract<
      { account: string; password: string },
      false | { name: string; account: string; password: string }
    >,

    /**
     * 登出
     */
    logout: {
      channel: 'auth/logout',
    } as IpcContract<void, boolean>,
  },

  /**
   * 應用程序狀態相關 API
   */
  app: {
    /**
     * 獲取數據初始化狀態
     */
    getDataInitialized: {
      channel: 'app/get-data-initialized',
    } as IpcContract<void, boolean>,

    /**
     * 應用啟動初始化
     */
    startInit: {
      channel: 'app/start-init',
    } as IpcContract<
      void,
      {
        isConnected: boolean;
        error?: string;
        code?: 'AUTHORIZE_ERROR' | 'INIT_GOOGLE_SHEET_DATA_ERROR' | 'NO_GOOGLE_SHEET_SETTING';
      }
    >,
  },
} as const;

/**
 * IPC 契約類型（供 TypeScript 類型推導使用）
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
