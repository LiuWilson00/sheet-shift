/**
 * Main Process - Excel Handlers 實作範例
 *
 * 這個文件展示如何使用新的類型安全 IPC Handler 系統
 * 來實現 Excel 相關的 API
 *
 * 對比舊實作：
 * - 大幅簡化代碼結構
 * - 統一的錯誤處理
 * - 更好的類型安全
 */

import { BrowserWindow } from 'electron';
import { createHandler, createVoidHandler, IpcError } from './main-typed-ipc-handler';
import { ipcContracts } from './shared-ipc-contracts';
import {
  selectExcelFile,
  saveProcessedData,
} from '../../src/main/modules/excel-hanlders/services/excel-io.service';
import {
  processExcelData,
  processExcelDataShopee,
  processExcelDataShopeeNew,
} from '../../src/main/modules/excel-hanlders/services/data-controller.service';
import {
  findUnMappingData,
  classifyData,
} from '../../src/main/modules/excel-hanlders/services/excel-data-debugging';
import {
  addSheetData,
  getProductNameMap,
  systemTariffCodeSheet,
} from '../../src/main/utils/google-sheets.tool';
import { SheetRangeName } from '../../src/main/utils/google-sheets.tool/index.const';
import { ProductNameMappingColumnKeys } from '../../src/main/modules/excel-hanlders/index.interface';
import { jsonGroupBy } from '../../src/main/utils';
import { setSystemSettingName } from '../../src/main/utils/setting.tool';
import { runClassifier } from '../../src/main/utils/model-run';

/**
 * 當前選擇的文件路徑（模塊內狀態）
 */
let currentSelectedFilePath = '';

/**
 * 設置 Excel 相關的所有 IPC Handlers
 *
 * @param mainWindow 主窗口實例（用於文件選擇對話框）
 *
 * @example
 * ```typescript
 * // main.ts
 * import { setupExcelHandlers } from './modules/excel-handlers';
 *
 * app.whenReady().then(() => {
 *   const mainWindow = createMainWindow();
 *   setupExcelHandlers(mainWindow);
 * });
 * ```
 */
export function setupExcelHandlers(mainWindow: BrowserWindow) {
  // ==========================================
  // 選擇 Excel 文件
  // ==========================================
  createVoidHandler(ipcContracts.excel.selectFile, async () => {
    // 打開文件選擇對話框
    const filePath = await selectExcelFile(mainWindow);

    if (filePath) {
      // 保存選擇的文件路徑
      currentSelectedFilePath = filePath;

      return {
        path: filePath,
        data: [],
        isError: false,
      };
    } else {
      return {
        path: '',
        data: [],
        message: 'No file selected',
        isError: true,
      };
    }
  });

  // ==========================================
  // 導出預設格式
  // ==========================================
  createHandler(ipcContracts.excel.exportDefault, async (input) => {
    // 驗證是否已選擇文件
    if (!currentSelectedFilePath) {
      throw new IpcError('No file selected', 'NO_FILE_SELECTED');
    }

    try {
      // 設置系統設置名稱
      setSystemSettingName(input.settingName);

      // 處理 Excel 數據
      const completedData = await processExcelData(currentSelectedFilePath);

      // 保存處理後的數據
      const newFilePath = await saveProcessedData(completedData, currentSelectedFilePath);

      return {
        path: newFilePath,
        data: completedData,
        isError: false,
      };
    } catch (error) {
      throw new IpcError(
        error instanceof Error ? error.message : 'Export failed',
        'EXPORT_FAILED'
      );
    }
  });

  // ==========================================
  // 導出預設格式（帶重量處理）
  // ==========================================
  createHandler(ipcContracts.excel.exportDefaultWithWeight, async (input) => {
    if (!currentSelectedFilePath) {
      throw new IpcError('No file selected', 'NO_FILE_SELECTED');
    }

    try {
      setSystemSettingName(input.settingName);

      // 使用 v3 價格版本處理
      const completedData = await processExcelData(currentSelectedFilePath, {
        sheetPricesVersion: 'v3',
      });

      const newFilePath = await saveProcessedData(completedData, currentSelectedFilePath);

      return {
        path: newFilePath,
        data: completedData,
        isError: false,
      };
    } catch (error) {
      throw new IpcError(
        error instanceof Error ? error.message : 'Export with weight processing failed',
        'EXPORT_FAILED'
      );
    }
  });

  // ==========================================
  // 導出 Pegasus 格式
  // ==========================================
  createHandler(ipcContracts.excel.exportPegasus, async (input) => {
    if (!currentSelectedFilePath) {
      throw new IpcError('No file selected', 'NO_FILE_SELECTED');
    }

    try {
      setSystemSettingName(input.settingName);

      // 使用 Pegasus 特定選項處理
      const completedData = await processExcelData(currentSelectedFilePath, {
        disableRandomAddress: true,
        calculateTotalAmountByBoxesDisableThreeOrMore: true,
        usePegasusSetting: true,
      });

      const newFilePath = await saveProcessedData(completedData, currentSelectedFilePath);

      return {
        path: newFilePath,
        data: completedData,
        isError: false,
      };
    } catch (error) {
      throw new IpcError(
        error instanceof Error ? error.message : 'Pegasus export failed',
        'EXPORT_FAILED'
      );
    }
  });

  // ==========================================
  // 導出 Shopee 格式
  // ==========================================
  createHandler(ipcContracts.excel.exportShopee, async (input) => {
    if (!currentSelectedFilePath) {
      throw new IpcError('No file selected', 'NO_FILE_SELECTED');
    }

    try {
      setSystemSettingName(input.settingName);

      const completedData = await processExcelDataShopee(currentSelectedFilePath);

      // Shopee 格式使用特殊參數保存
      const newFilePath = await saveProcessedData(
        completedData,
        currentSelectedFilePath,
        true
      );

      return {
        path: newFilePath,
        data: completedData,
        isError: false,
      };
    } catch (error) {
      throw new IpcError(
        error instanceof Error ? error.message : 'Shopee export failed',
        'EXPORT_FAILED'
      );
    }
  });

  // ==========================================
  // 導出 Shopee 新格式
  // ==========================================
  createHandler(ipcContracts.excel.exportShopeeNew, async (input) => {
    if (!currentSelectedFilePath) {
      throw new IpcError('No file selected', 'NO_FILE_SELECTED');
    }

    try {
      setSystemSettingName(input.settingName);

      const completedData = await processExcelDataShopeeNew(currentSelectedFilePath);

      const newFilePath = await saveProcessedData(
        completedData,
        currentSelectedFilePath,
        true,
        {
          templateOptions: {
            highlightTotalBoxes: false,
            highlightTotalAmount2000: true,
          },
        }
      );

      return {
        path: newFilePath,
        data: completedData,
        isError: false,
      };
    } catch (error) {
      throw new IpcError(
        error instanceof Error ? error.message : 'Shopee new format export failed',
        'EXPORT_FAILED'
      );
    }
  });

  // ==========================================
  // 獲取錯誤數據
  // ==========================================
  createHandler(ipcContracts.excel.getWrongData, async (input) => {
    if (!currentSelectedFilePath) {
      return {
        data: { unMappingData: [] },
        isError: true,
        message: 'No file selected',
      };
    }

    try {
      // 查找未映射的數據
      const unMappingData = findUnMappingData(currentSelectedFilePath);

      // 如果需要 AI 分類
      const finalData = input.aiClassify
        ? await classifyData(unMappingData)
        : unMappingData;

      return {
        data: { unMappingData: finalData },
        isError: false,
      };
    } catch (error) {
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to get wrong data',
        'GET_WRONG_DATA_FAILED'
      );
    }
  });

  // ==========================================
  // 添加新的產品映射
  // ==========================================
  createHandler(ipcContracts.excel.addProductMap, async (input) => {
    if (!input.mappings || input.mappings.length === 0) {
      throw new IpcError('Product mappings are required', 'INVALID_INPUT');
    }

    try {
      // 添加到 Google Sheets
      await addSheetData(SheetRangeName.SystemProductMap, input.mappings, {
        jsonTransfromOptions: {
          disableAddTitle: true,
          keySorting: [
            ProductNameMappingColumnKeys.OriginalProductName,
            ProductNameMappingColumnKeys.CorrectProductName,
            ProductNameMappingColumnKeys.TariffCode,
          ],
        },
      });

      // 更新本地緩存
      const currentSystemMap = systemTariffCodeSheet.get();
      currentSystemMap.push(...input.mappings);
      systemTariffCodeSheet.set(currentSystemMap);

      return {
        data: true,
        isError: false,
      };
    } catch (error) {
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to add product mapping',
        'ADD_PRODUCT_MAP_FAILED'
      );
    }
  });

  // ==========================================
  // 獲取產品映射
  // ==========================================
  createVoidHandler(ipcContracts.excel.getProductMap, async () => {
    try {
      const data = getProductNameMap();

      // 按正確產品名稱分組
      const dataGrouped = jsonGroupBy(
        data,
        [ProductNameMappingColumnKeys.CorrectProductName],
        (datas) => {
          return {
            [ProductNameMappingColumnKeys.CorrectProductName]:
              datas[0][ProductNameMappingColumnKeys.CorrectProductName],
            [ProductNameMappingColumnKeys.TariffCode]:
              datas[0][ProductNameMappingColumnKeys.TariffCode],
          };
        }
      );

      return {
        data: dataGrouped,
        isError: false,
      };
    } catch (error) {
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to get product map',
        'GET_PRODUCT_MAP_FAILED'
      );
    }
  });

  // ==========================================
  // 分類產品名稱（使用 AI）
  // ==========================================
  createHandler(ipcContracts.excel.classifyProductName, async (input) => {
    if (!input.productName) {
      throw new IpcError('Product name is required', 'INVALID_INPUT');
    }

    try {
      const map = getProductNameMap();

      // 使用 ONNX 模型分類
      const classifiedName = await runClassifier(input.productName);

      // 查找對應的關稅代碼
      const tariffcode =
        map.find(
          (i) => i[ProductNameMappingColumnKeys.CorrectProductName] === classifiedName
        )?.[ProductNameMappingColumnKeys.TariffCode] ?? '';

      return {
        data: {
          productName: input.productName,
          realProductName: classifiedName,
          tariffcode: tariffcode,
        },
        isError: false,
      };
    } catch (error) {
      throw new IpcError(
        error instanceof Error ? error.message : 'Product classification failed',
        'CLASSIFY_FAILED'
      );
    }
  });

  console.log('[Excel Handlers] All handlers registered successfully');
}

/**
 * 獲取當前選擇的文件路徑（用於測試或調試）
 */
export function getCurrentSelectedFilePath(): string {
  return currentSelectedFilePath;
}

/**
 * 重置當前選擇的文件路徑
 */
export function resetCurrentSelectedFilePath(): void {
  currentSelectedFilePath = '';
}
