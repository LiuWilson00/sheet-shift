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
 * 只搜尋 Row 3（真正的表頭行），避免 Row 2 元數據行誤匹配
 */
function findColumnByHeader(
  worksheet: Worksheet,
  headerNames: string[],
  headerRowIndex: number = 3,
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
 * 找到 Row 3 最後一個有值的欄位 + 1（用於交易代碼欄位）
 *
 * 用戶檔案的交易代碼放在表頭範圍外的第一個空白欄
 */
function findLastHeaderColumnPlusOne(worksheet: Worksheet): number {
  const headerRow = worksheet.getRow(3);
  let lastCol = 0;

  headerRow.eachCell((cell, colNumber) => {
    const cellValue = cell.value?.toString().trim();
    if (cellValue) {
      lastCol = colNumber;
    }
  });

  // 最後表頭 + 1 = 交易代碼欄位
  return lastCol + 1;
}

/**
 * 僅帶入艙單編號到 Excel 檔案（不做資料轉換）
 *
 * 處理邏輯：
 * 1. 讀取用戶檔案的第一個 worksheet
 * 2. 複製到全新的 workbook（避免 ExcelJS 重寫複雜檔案導致 XML 損壞）
 * 3. 動態搜尋艙單號碼欄位 + 交易代碼欄位
 * 4. 寫入艙單號碼（每組第一行）和交易代碼（每行）
 * 5. 輸出新檔案
 */
async function applyManifestNumberToExcel(
  filePath: string,
  transactionCode?: string,
  numbers?: string[],
): Promise<{
  path: string;
  rowCount: number;
  isError: boolean;
  message?: string;
}> {
  // 讀取用戶 Excel 檔案
  const sourceWorkbook = new Workbook();
  await sourceWorkbook.xlsx.readFile(filePath);
  const sourceWorksheet = sourceWorkbook.worksheets[0];

  if (!sourceWorksheet) {
    return {
      path: '',
      rowCount: 0,
      isError: true,
      message: '無法讀取工作表',
    };
  }

  // 複製所有工作表到全新 workbook，避免重寫複雜用戶檔案導致 XML 損壞
  const newWorkbook = new Workbook();
  sourceWorkbook.worksheets.forEach((srcSheet) => {
    const destSheet = newWorkbook.addWorksheet(srcSheet.name);

    // 複製列寬
    srcSheet.columns.forEach((col, idx) => {
      if (col.width) {
        destSheet.getColumn(idx + 1).width = col.width;
      }
    });

    // 複製所有行和儲存格
    srcSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = destSheet.getRow(rowNumber);
      newRow.height = row.height;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);
        newCell.value = cell.value;
        newCell.style = { ...cell.style };
      });
      newRow.commit();
    });
  });

  // 操作第一個工作表
  const newWorksheet = newWorkbook.worksheets[0];

  // 動態搜尋艙單號碼欄位（Row 3 含「艙單號碼」）
  const manifestColumn = findColumnByHeader(newWorksheet, ['艙單號碼']);
  if (manifestColumn !== null) {
    logger.info('[Excel V2] 找到艙單號碼欄位', { columnIndex: manifestColumn });
  } else {
    logger.warn('[Excel V2] 未找到艙單號碼欄位');
  }

  // 找交易代碼欄位：Row 3 最後有值欄位 + 1
  const transactionCodeColumn = findLastHeaderColumnPlusOne(newWorksheet);
  logger.info('[Excel V2] 交易代碼欄位', {
    columnIndex: transactionCodeColumn,
  });

  // 診斷日誌
  logger.info('[Excel V2] applyManifestNumber 參數', {
    hasNumbers: !!numbers,
    numbersLength: numbers?.length ?? 0,
    firstThreeNumbers: numbers?.slice(0, 3),
    transactionCode: transactionCode ?? '(none)',
    totalRows: newWorksheet.rowCount,
  });

  // 從第 4 行開始（Row 1-2 元數據，Row 3 表頭）
  let rowCount = 0;
  let manifestIndex = 0;
  const startRow = 4;

  // eslint-disable-next-line no-plusplus
  for (let rowIndex = startRow; rowIndex <= newWorksheet.rowCount; rowIndex++) {
    const row = newWorksheet.getRow(rowIndex);

    // 用 Col 2 判斷是否為資料行（Col 1 只有群組首行有值，續行為空但仍有資料）
    const col2Value = row.getCell(2).value;
    if (col2Value === null || col2Value === undefined || col2Value === '') {
      // eslint-disable-next-line no-continue
      continue;
    }

    // Col 1 有值 = 群組首行（新訂單）→ 寫入艙單號碼
    const firstCellValue = row.getCell(1).value;
    const isGroupStart =
      firstCellValue !== null &&
      firstCellValue !== undefined &&
      firstCellValue !== '';

    if (
      isGroupStart &&
      numbers &&
      numbers.length > 0 &&
      manifestColumn !== null &&
      manifestIndex < numbers.length
    ) {
      row.getCell(manifestColumn).value = numbers[manifestIndex];
      // eslint-disable-next-line no-plusplus
      manifestIndex++;
    }

    // 寫入交易代碼到每一行（包含群組首行和續行）
    if (transactionCode) {
      row.getCell(transactionCodeColumn).value = transactionCode;
    }

    // eslint-disable-next-line no-plusplus
    rowCount++;
  }

  // 診斷日誌
  logger.info('[Excel V2] applyManifestNumber 完成', {
    totalDataRows: rowCount,
    manifestNumbersWritten: manifestIndex,
    numbersProvided: numbers?.length ?? 0,
  });

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

  // 寫入全新的 workbook（包含所有工作表，避免 XML 損壞）
  await newWorkbook.xlsx.writeFile(newFilePath);

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
  // 匯出蝦皮2轉格式工作表（台北港邏輯，無 40kg 規則）
  // ==========================================
  createHandler(ipcContracts.excel.exportShopee, async (input) => {
    logger.debug('[Excel V2] Exporting Shopee (蝦皮2轉) sheet', {
      settingName: input.settingName,
    });

    try {
      setSystemSettingName(input.settingName);
      const currentPath = currentSelectedFilePathV2.get();

      if (!currentPath) {
        logger.warn('[Excel V2] No file selected for export');
        return { path: '', data: [], isError: true, message: '未選擇檔案' };
      }

      // 使用台北港邏輯但關閉 40kg/2000 規則
      // 蝦皮2轉：使用台北港邏輯，但關閉 40kg/2000 規則且不替換地址
      const { data: completedData, rowStyles } =
        await processExcelDataTaipeiBay(currentPath, {
          disableWeightRule: true,
          disableRandomAddress: true,
        });
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

      logger.info('[Excel V2] Shopee (蝦皮2轉) sheet exported', {
        newPath: newFilePath,
      });
      return { path: newFilePath, data: completedData, isError: false };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Shopee (蝦皮2轉) sheet export failed', {
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
      numbersCount: input.numbers?.length ?? 0,
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
        input.numbers,
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

  // ==========================================
  // 計算已選取檔案的群組數量
  // ==========================================
  createHandler(ipcContracts.excel.countFileGroups, async () => {
    try {
      const currentPath = currentSelectedFilePathV2.get();

      if (!currentPath) {
        return { groupCount: 0, isError: true };
      }

      const workbook = new Workbook();
      await workbook.xlsx.readFile(currentPath);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        return { groupCount: 0, isError: true };
      }

      // 計算群組數量：Col 1 有值的資料行數
      let groupCount = 0;
      // eslint-disable-next-line no-plusplus
      for (let rowIndex = 4; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        const col1 = row.getCell(1).value;
        if (col1 !== null && col1 !== undefined && col1 !== '') {
          // eslint-disable-next-line no-plusplus
          groupCount++;
        }
      }

      logger.info('[Excel V2] 檔案群組數量', { groupCount });
      return { groupCount, isError: false };
    } catch (error) {
      const err = error as Error;
      logger.error('[Excel V2] Count file groups failed', {
        error: err.message,
      });
      return { groupCount: 0, isError: true };
    }
  });

  logger.info('[Excel V2] All handlers registered successfully [OK]');
}

export default setupExcelHandlersV2;
