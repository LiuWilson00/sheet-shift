/**
 * Excel Handlers V2 - 新的類型安全實作
 *
 * 舊系統：src/main/modules/excel-hanlders（保持不變）
 * 新系統：這個文件（並行運行）
 *
 * 使用新的 channel 名稱避免衝突：
 * - 舊：'select-excel-file', 'export-default-sheet' 等
 * - 新：'excel-v2/*'
 */

import { BrowserWindow } from 'electron';
import { createHandler } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import { logger } from '../../utils/logger.tool';
import { DataStore } from '../../utils/data-store.tool';
import {
  saveProcessedData,
  selectExcelFile,
} from '../excel-hanlders/services/excel-io.service';
import {
  processExcelData,
  processExcelDataShopee,
  processExcelDataShopeeNew,
} from '../excel-hanlders/services/data-controller.service';
import {
  classifyData,
  findUnMappingData,
} from '../excel-hanlders/services/excel-data-debugging';
import { ProductNameMappingColumnKeys } from '../excel-hanlders/index.interface';
import {
  addSheetData,
  getProductNameMap,
  systemTariffCodeSheet,
} from '../../utils/google-sheets.tool';
import { SheetRangeName } from '../../utils/google-sheets.tool/index.const';
import { jsonGroupBy } from '../../utils';
import { setSystemSettingName } from '../../utils/setting.tool';
import { runClassifier } from '../../utils/model-run';

// 當前選擇的檔案路徑（與舊系統共用狀態）
const currentSelectedFilePathV2 = new DataStore<string>('');

/**
 * 設置 Excel V2 相關的所有 IPC Handlers
 */
export function setupExcelHandlersV2(mainWindow: BrowserWindow) {
  logger.info('[Excel V2] Setting up handlers...');

  // ==========================================
  // 選擇 Excel 檔案
  // ==========================================
  createHandler(ipcContracts.excel.selectFile, async () => {
    logger.debug('[Excel V2] Selecting Excel file...');

    try {
      const filePath = await selectExcelFile(mainWindow);
      if (filePath) {
        currentSelectedFilePathV2.set(filePath);
        logger.info('[Excel V2] File selected', { path: filePath });
        return { path: filePath, isError: false };
      }
      logger.warn('[Excel V2] No file selected');
      return { path: '', isError: true, message: '未選擇檔案' };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] File selection failed', { error: err.message });
      return { path: '', isError: true, message: err.message };
    }
  });

  // ==========================================
  // 匯出預設格式工作表
  // ==========================================
  createHandler(ipcContracts.excel.exportDefault, async (input) => {
    logger.debug('[Excel V2] Exporting default sheet', {
      settingName: input.settingName,
    });

    try {
      setSystemSettingName(input.settingName);
      const currentPath = currentSelectedFilePathV2.get();

      if (!currentPath) {
        logger.warn('[Excel V2] No file selected for export');
        return { path: '', data: [], isError: true, message: '未選擇檔案' };
      }

      const completedData = await processExcelData(currentPath);
      const newFilePath = await saveProcessedData(completedData, currentPath);

      logger.info('[Excel V2] Default sheet exported', {
        newPath: newFilePath,
      });
      return { path: newFilePath, data: completedData, isError: false };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Default sheet export failed', {
        error: err.message,
      });
      return { path: '', data: [], isError: true, message: err.message };
    }
  });

  // ==========================================
  // 匯出預設格式工作表（含重量計價）
  // ==========================================
  createHandler(ipcContracts.excel.exportDefaultWithWeight, async (input) => {
    logger.debug('[Excel V2] Exporting default sheet with weight', {
      settingName: input.settingName,
    });

    try {
      setSystemSettingName(input.settingName);
      const currentPath = currentSelectedFilePathV2.get();

      if (!currentPath) {
        logger.warn('[Excel V2] No file selected for export');
        return { path: '', data: [], isError: true, message: '未選擇檔案' };
      }

      const completedData = await processExcelData(currentPath, {
        sheetPricesVersion: 'v3',
      });
      const newFilePath = await saveProcessedData(completedData, currentPath);

      logger.info('[Excel V2] Default sheet with weight exported', {
        newPath: newFilePath,
      });
      return { path: newFilePath, data: completedData, isError: false };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Default sheet with weight export failed', {
        error: err.message,
      });
      return { path: '', data: [], isError: true, message: err.message };
    }
  });

  // ==========================================
  // 匯出 Shopee 格式工作表
  // ==========================================
  createHandler(ipcContracts.excel.exportShopee, async (input) => {
    logger.debug('[Excel V2] Exporting Shopee sheet', {
      settingName: input.settingName,
    });

    try {
      setSystemSettingName(input.settingName);
      const currentPath = currentSelectedFilePathV2.get();

      if (!currentPath) {
        logger.warn('[Excel V2] No file selected for export');
        return { path: '', data: [], isError: true, message: '未選擇檔案' };
      }

      const completedData = await processExcelDataShopee(currentPath);
      const newFilePath = await saveProcessedData(
        completedData,
        currentPath,
        true,
      );

      logger.info('[Excel V2] Shopee sheet exported', { newPath: newFilePath });
      return { path: newFilePath, data: completedData, isError: false };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Shopee sheet export failed', {
        error: err.message,
      });
      return { path: '', data: [], isError: true, message: err.message };
    }
  });

  // ==========================================
  // 匯出 Shopee 新格式工作表
  // ==========================================
  createHandler(ipcContracts.excel.exportShopeeNew, async (input) => {
    logger.debug('[Excel V2] Exporting Shopee new sheet', {
      settingName: input.settingName,
    });

    try {
      setSystemSettingName(input.settingName);
      const currentPath = currentSelectedFilePathV2.get();

      if (!currentPath) {
        logger.warn('[Excel V2] No file selected for export');
        return { path: '', data: [], isError: true, message: '未選擇檔案' };
      }

      const completedData = await processExcelDataShopeeNew(currentPath);
      const newFilePath = await saveProcessedData(
        completedData,
        currentPath,
        true,
        {
          templateOptions: {
            highlightTotalBoxes: false,
            highlightTotalAmount2000: true,
          },
        },
      );

      logger.info('[Excel V2] Shopee new sheet exported', {
        newPath: newFilePath,
      });
      return { path: newFilePath, data: completedData, isError: false };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Shopee new sheet export failed', {
        error: err.message,
      });
      return { path: '', data: [], isError: true, message: err.message };
    }
  });

  // ==========================================
  // 匯出 Pegasus 格式工作表
  // ==========================================
  createHandler(ipcContracts.excel.exportPegasus, async (input) => {
    logger.debug('[Excel V2] Exporting Pegasus sheet', {
      settingName: input.settingName,
    });

    try {
      setSystemSettingName(input.settingName);
      const currentPath = currentSelectedFilePathV2.get();

      if (!currentPath) {
        logger.warn('[Excel V2] No file selected for export');
        return { path: '', data: [], isError: true, message: '未選擇檔案' };
      }

      const completedData = await processExcelData(currentPath, {
        disableRandomAddress: true,
        calculateTotalAmountByBoxesDisableThreeOrMore: true,
        usePegasusSetting: true,
      });
      const newFilePath = await saveProcessedData(completedData, currentPath);

      logger.info('[Excel V2] Pegasus sheet exported', {
        newPath: newFilePath,
      });
      return { path: newFilePath, data: completedData, isError: false };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Pegasus sheet export failed', {
        error: err.message,
      });
      return { path: '', data: [], isError: true, message: err.message };
    }
  });

  // ==========================================
  // 取得無法對應的資料
  // ==========================================
  createHandler(ipcContracts.excel.getWrongData, async (input) => {
    logger.debug('[Excel V2] Getting wrong data', {
      aiClassify: input.aiClassify,
    });

    const currentPath = currentSelectedFilePathV2.get();
    if (!currentPath) {
      logger.warn('[Excel V2] No file selected');
      return { data: { unMappingData: [] }, isError: true };
    }

    const unMappingData = findUnMappingData(currentPath);
    const resultData = input.aiClassify
      ? await classifyData(unMappingData)
      : unMappingData;

    logger.info('[Excel V2] Wrong data retrieved', {
      count: resultData.length,
    });
    return { data: { unMappingData: resultData }, isError: false };
  });

  // ==========================================
  // 新增產品對應
  // ==========================================
  createHandler(ipcContracts.excel.addProductMap, async (input) => {
    logger.debug('[Excel V2] Adding product map', { count: input.data.length });

    try {
      await addSheetData(SheetRangeName.SystemProductMap, input.data, {
        jsonTransfromOptions: {
          disableAddTitle: true,
          keySorting: [
            ProductNameMappingColumnKeys.OriginalProductName,
            ProductNameMappingColumnKeys.CorrectProductName,
            ProductNameMappingColumnKeys.TariffCode,
          ],
        },
      });

      // 更新本地快取
      const newSystemProductMap = systemTariffCodeSheet.get();
      newSystemProductMap.push(...input.data);
      systemTariffCodeSheet.set(newSystemProductMap);

      logger.info('[Excel V2] Product map added successfully');
      return { data: true, isError: false };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Add product map failed', { error: err.message });
      return { data: false, isError: true };
    }
  });

  // ==========================================
  // 取得產品對應表
  // ==========================================
  createHandler(ipcContracts.excel.getProductMap, async () => {
    logger.debug('[Excel V2] Getting product map');

    const data = getProductNameMap();
    const dataGrouped = jsonGroupBy(
      data,
      [ProductNameMappingColumnKeys.CorrectProductName],
      (datas) => ({
        [ProductNameMappingColumnKeys.CorrectProductName]:
          datas[0][ProductNameMappingColumnKeys.CorrectProductName],
        [ProductNameMappingColumnKeys.TariffCode]:
          datas[0][ProductNameMappingColumnKeys.TariffCode],
      }),
    );

    logger.info('[Excel V2] Product map retrieved', {
      count: dataGrouped.length,
    });
    return { data: dataGrouped, isError: false };
  });

  // ==========================================
  // AI 分類產品名稱
  // ==========================================
  createHandler(ipcContracts.excel.classifyProductName, async (input) => {
    logger.debug('[Excel V2] Classifying product name', {
      productName: input.productName,
    });

    const map = getProductNameMap();
    const tryClassify = await runClassifier(input.productName);
    const tariffcode =
      map.find(
        (i) =>
          i[ProductNameMappingColumnKeys.CorrectProductName] === tryClassify,
      )?.[ProductNameMappingColumnKeys.TariffCode] ?? '';

    logger.info('[Excel V2] Product classified', {
      original: input.productName,
      result: tryClassify,
      tariffcode,
    });

    return {
      data: {
        productName: input.productName,
        realProductName: tryClassify,
        tariffcode,
      },
      isError: false,
    };
  });

  logger.info('[Excel V2] All handlers registered successfully [OK]');
}

export default setupExcelHandlersV2;
