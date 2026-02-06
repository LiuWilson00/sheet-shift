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

import path from 'path';
import { BrowserWindow } from 'electron';
import { Workbook, Worksheet } from 'exceljs';
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
  processExcelDataTaipeiBay,
  processExcelDataKaohsiungChaofeng,
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
 * 動態搜尋欄位位置
 *
 * 根據表頭名稱找到對應的欄位索引
 */
function findColumnByHeader(
  worksheet: Worksheet,
  headerNames: string[],
  headerRowIndex: number = 2,
): number | null {
  const headerRow = worksheet.getRow(headerRowIndex);
  let columnIndex: number | null = null;

  headerRow.eachCell((cell, colNumber) => {
    const cellValue = cell.value?.toString().trim();
    if (cellValue && headerNames.some((name) => cellValue.includes(name))) {
      columnIndex = colNumber;
    }
  });

  return columnIndex;
}

/**
 * 僅帶入艙單編號到 Excel 檔案（不做資料轉換）
 *
 * 處理邏輯：
 * 1. 讀取用戶選擇的已處理過的 Excel 檔案
 * 2. 動態搜尋目標欄位位置（艙單、分艙）
 * 3. 帶入艙單編號到找到的欄位
 * 4. 輸出新檔案
 */
async function applyManifestNumberToExcel(
  filePath: string,
  transactionCode?: string,
): Promise<{
  path: string;
  rowCount: number;
  isError: boolean;
  message?: string;
}> {
  if (!transactionCode) {
    return {
      path: '',
      rowCount: 0,
      isError: true,
      message: '未提供交易代碼',
    };
  }

  // 讀取 Excel 檔案
  const workbook = new Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return {
      path: '',
      rowCount: 0,
      isError: true,
      message: '無法讀取工作表',
    };
  }

  // 動態搜尋目標欄位位置（嘗試多種表頭名稱）
  let targetColumn = findColumnByHeader(worksheet, [
    '艙單',
    '分艙',
    '交易代碼',
  ]);

  // 如果找不到，使用預設欄位（AG 欄 = column 33）
  if (targetColumn === null) {
    targetColumn = 33;
    logger.warn('[Excel V2] 未找到艙單欄位，使用預設欄位 AG (column 33)');
  } else {
    logger.info('[Excel V2] 找到艙單欄位', { columnIndex: targetColumn });
  }

  // 計算資料行數（從第 3 行開始，跳過表頭）
  let rowCount = 0;
  const startRow = 3;

  // eslint-disable-next-line no-plusplus
  for (let rowIndex = startRow; rowIndex <= worksheet.rowCount; rowIndex++) {
    const row = worksheet.getRow(rowIndex);

    // 檢查是否為空行（第一個 cell 是否有值）
    const firstCellValue = row.getCell(1).value;
    if (
      firstCellValue === null ||
      firstCellValue === undefined ||
      firstCellValue === ''
    ) {
      // 跳過空行
      // eslint-disable-next-line no-continue
      continue;
    }

    // 帶入交易代碼
    const targetCell = row.getCell(targetColumn);
    targetCell.value = transactionCode;
    // eslint-disable-next-line no-plusplus
    rowCount++;
  }

  if (rowCount === 0) {
    return {
      path: '',
      rowCount: 0,
      isError: true,
      message: '檔案中沒有資料行',
    };
  }

  // 產生新檔案名稱
  const originalFilename = path.basename(filePath, path.extname(filePath));
  const timestamp = Date.now();
  const newFileName = `${originalFilename}-manifest-${timestamp}.xlsx`;
  const newFilePath = path.join(path.dirname(filePath), newFileName);

  // 寫入新檔案
  await workbook.xlsx.writeFile(newFilePath);

  return {
    path: newFilePath,
    rowCount,
    isError: false,
  };
}

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
      const newFilePath = await saveProcessedData(
        completedData,
        currentPath,
        false,
        {
          templateOptions: { transactionCode: input.transactionCode },
        },
      );

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
      const newFilePath = await saveProcessedData(
        completedData,
        currentPath,
        false,
        {
          templateOptions: { transactionCode: input.transactionCode },
        },
      );

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
        { templateOptions: { transactionCode: input.transactionCode } },
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
            transactionCode: input.transactionCode,
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
        disableRandomAddress: false, // 啟用雲端地址
        calculateTotalAmountByBoxesDisableThreeOrMore: true,
        usePegasusSetting: true,
      });
      const newFilePath = await saveProcessedData(
        completedData,
        currentPath,
        false,
        {
          templateOptions: { transactionCode: input.transactionCode },
        },
      );

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
  // 匯出台北港格式工作表
  // ==========================================
  createHandler(ipcContracts.excel.exportTaipeiBay, async (input) => {
    logger.debug('[Excel V2] Exporting Taipei Bay sheet', {
      settingName: input.settingName,
    });

    try {
      setSystemSettingName(input.settingName);
      const currentPath = currentSelectedFilePathV2.get();

      if (!currentPath) {
        logger.warn('[Excel V2] No file selected for export');
        return { path: '', data: [], isError: true, message: '未選擇檔案' };
      }

      const { data: completedData, rowStyles } =
        await processExcelDataTaipeiBay(currentPath);
      const newFilePath = await saveProcessedData(
        completedData,
        currentPath,
        false,
        {
          templateOptions: {
            rowStyles,
            transactionCode: input.transactionCode,
          },
        },
      );

      logger.info('[Excel V2] Taipei Bay sheet exported', {
        newPath: newFilePath,
      });
      return { path: newFilePath, data: completedData, isError: false };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Taipei Bay sheet export failed', {
        error: err.message,
      });
      return { path: '', data: [], isError: true, message: err.message };
    }
  });

  // ==========================================
  // 匯出高雄超峰格式工作表
  // ==========================================
  createHandler(ipcContracts.excel.exportKaohsiungChaofeng, async (input) => {
    logger.debug('[Excel V2] Exporting Kaohsiung Chaofeng sheet', {
      settingName: input.settingName,
    });

    try {
      setSystemSettingName(input.settingName);
      const currentPath = currentSelectedFilePathV2.get();

      if (!currentPath) {
        logger.warn('[Excel V2] No file selected for export');
        return { path: '', data: [], isError: true, message: '未選擇檔案' };
      }

      const { data: completedData, rowStyles } =
        await processExcelDataKaohsiungChaofeng(currentPath);
      const newFilePath = await saveProcessedData(
        completedData,
        currentPath,
        true,
        {
          templateOptions: {
            highlightTotalBoxes: false,
            highlightTotalAmount2000: true,
            rowStyles,
            transactionCode: input.transactionCode,
          },
        },
      );

      logger.info('[Excel V2] Kaohsiung Chaofeng sheet exported', {
        newPath: newFilePath,
      });
      return { path: newFilePath, data: completedData, isError: false };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Kaohsiung Chaofeng sheet export failed', {
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
    logger.debug('[Excel V2] Current file path', { currentPath });

    if (!currentPath) {
      logger.warn('[Excel V2] No file selected');
      return { data: { unMappingData: [] }, isError: true };
    }

    logger.debug('[Excel V2] Calling findUnMappingData...');
    const unMappingData = findUnMappingData(currentPath);
    logger.debug('[Excel V2] findUnMappingData result', {
      count: unMappingData.length,
      firstItem: unMappingData[0],
    });

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

  // ==========================================
  // 僅帶入艙單編號（不做資料轉換）
  // ==========================================
  createHandler(ipcContracts.excel.applyManifestNumberOnly, async (input) => {
    logger.debug('[Excel V2] Applying manifest number only', {
      configName: input.configName,
      hasTransactionCode: !!input.transactionCode,
    });

    try {
      const currentPath = currentSelectedFilePathV2.get();

      if (!currentPath) {
        logger.warn('[Excel V2] No file selected for manifest number');
        return { path: '', rowCount: 0, isError: true, message: '未選擇檔案' };
      }

      const result = await applyManifestNumberToExcel(
        currentPath,
        input.transactionCode,
      );

      if (result.isError) {
        logger.error('[Excel V2] Apply manifest number failed', {
          error: result.message,
        });
        return result;
      }

      logger.info('[Excel V2] Manifest number applied', {
        newPath: result.path,
        rowCount: result.rowCount,
      });
      return result;
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Apply manifest number failed', {
        error: err.message,
      });
      return { path: '', rowCount: 0, isError: true, message: err.message };
    }
  });

  logger.info('[Excel V2] All handlers registered successfully [OK]');
}

export default setupExcelHandlersV2;
