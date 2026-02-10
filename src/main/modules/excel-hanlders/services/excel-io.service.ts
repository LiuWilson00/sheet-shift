import {
  dialog as electronDialog,
  BrowserWindow as electronBrowserWindow,
} from 'electron';
import path from 'path';
import { Cell, Row, Workbook, Worksheet } from 'exceljs';
import { ExcelColumnKeys, SheetData } from '../index.interface';
import {
  ORIGINAL_DATA_TEMPLATE_PATH,
  SHOPEE_DATA_TEMPLATE_PATH,
  defaultColumnOrder,
  shopeeColumnOrder,
  RowStyleMap,
  RowStyleInfo,
  STYLE_COLORS,
  STYLE_PRIORITY,
  getBestStyle,
  TRANSACTION_CODE_COLUMN_INDEX,
} from '../index.const';

/**
 * 動態搜尋交易代碼欄位位置
 *
 * 在模板表頭中搜尋「申報繳納稅款註記」欄位的位置
 * 如果找不到，使用預設的 TRANSACTION_CODE_COLUMN_INDEX
 */
function findTransactionCodeColumn(worksheet: Worksheet): number {
  // 搜尋 row 3（表頭行）和 row 2
  const rowsToSearch = [3, 2];

  // eslint-disable-next-line no-restricted-syntax
  for (const rowIndex of rowsToSearch) {
    const headerRow = worksheet.getRow(rowIndex);
    let found = 0;

    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString().trim();
      if (value && value.includes('申報繳納稅款註記')) {
        found = colNumber;
      }
    });

    if (found > 0) return found;
  }

  // 未找到時使用預設值
  return TRANSACTION_CODE_COLUMN_INDEX;
}

let FILL_YELLOW_TO_NEXT_ORDER_NOT_NULL_ROW = false;

function init() {
  FILL_YELLOW_TO_NEXT_ORDER_NOT_NULL_ROW = false;
}

export async function selectExcelFile(mainWindow: electronBrowserWindow) {
  const result = await electronDialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
}

export async function saveProcessedData(
  completedData: SheetData[],
  filePath: string,
  isShopee: boolean = false,
  options?: { templateOptions?: JsonToExcelOptions },
) {
  const newFilePath = generateNewFileName(filePath);
  const completedWorkbook = await addJsonToExcelTemplate(completedData, {
    filePath: isShopee
      ? SHOPEE_DATA_TEMPLATE_PATH
      : ORIGINAL_DATA_TEMPLATE_PATH,
    columnOrder: isShopee ? shopeeColumnOrder : defaultColumnOrder,
    ...options?.templateOptions,
  });
  await addStatisticsSheet(completedWorkbook, completedData);
  // await completedWorkbook.xlsx.writeFile(newFilePath);
  const targetWorkbookHaveData =
    await copyTemplateWorksheetToNewExcelByWorkSheet(
      completedWorkbook.worksheets[0],
      filePath,
      `${completedWorkbook.worksheets[0].name}-completed`,
    );
  const targetWorkbookHaveStatistic =
    await copyTemplateWorksheetToNewExcelByWorkSheet(
      completedWorkbook.worksheets[completedWorkbook.worksheets.length - 1],
      filePath,
      '統計資料',
      targetWorkbookHaveData,
    );
  await targetWorkbookHaveStatistic.xlsx.writeFile(newFilePath);
  return newFilePath;
}
type JsonToExcelOptions = {
  startRow?: number;
  filePath?: string;
  columnOrder?: typeof defaultColumnOrder;
  highlightTotalBoxes?: boolean;
  highlightTotalAmount2000?: boolean;
  /** 外部傳入的行樣式映射（收貨人海關註記、問題件、台北港特殊條件等） */
  rowStyles?: RowStyleMap;
  /** 交易代碼（帶入 AG 欄位） */
  transactionCode?: string;
};
async function addJsonToExcelTemplate(
  jsonData: SheetData[],
  options: JsonToExcelOptions = {},
): Promise<Workbook> {
  const defaultOptions = {
    startRow: 3,
    filePath: ORIGINAL_DATA_TEMPLATE_PATH,
    columnOrder: defaultColumnOrder,
    highlightTotalBoxes: true,
    highlightTotalAmount2000: false,
    rowStyles: undefined as RowStyleMap | undefined,
    transactionCode: undefined as string | undefined,
  };
  const {
    startRow,
    filePath,
    columnOrder,
    highlightTotalBoxes,
    highlightTotalAmount2000,
    rowStyles,
    transactionCode,
  } = {
    ...defaultOptions,
    ...options,
  };
  init();

  // 1. 讀取現有的Excel模板
  const workbook = new Workbook();
  await workbook.xlsx.readFile(filePath);
  // 2. 獲取第一個工作表
  const worksheet: Worksheet = workbook.worksheets[0];

  // 動態搜尋交易代碼欄位位置（搜尋表頭「申報繳納稅款註記」）
  const transactionCodeColumn = transactionCode
    ? findTransactionCodeColumn(worksheet)
    : 0;

  let previousBoxnumber: number | '' = '';
  // 3. 將 JSON 數據添加到工作表中
  jsonData.forEach((row, index) => {
    const currentRow = startRow + index; // 根據起始行和當前索引計算要插入的行
    const currentJsonData = jsonData[index];

    Object.keys(row).forEach((key) => {
      const columnInfo = columnOrder.find((col) => col.valueKey === key);

      if (!columnInfo) return;

      const cell: Cell = worksheet.getCell(
        currentRow + 1,
        columnInfo?.columnIndex,
      );
      cell.value = row[key as keyof SheetData];
    });

    // 收集此行的所有樣式候選
    const styleCandidates: RowStyleInfo[] = [];

    // 外部傳入的樣式（收貨人海關註記、問題件、台北港特殊條件等）
    if (rowStyles) {
      const externalStyles = rowStyles.get(index);
      if (externalStyles) {
        styleCandidates.push(...externalStyles);
      }
    }

    // 現有的黃色高亮規則
    if (currentJsonData[ExcelColumnKeys.TotalBoxes] !== '') {
      previousBoxnumber = currentJsonData[ExcelColumnKeys.TotalBoxes];
    }

    if (currentJsonData[ExcelColumnKeys.ShippingOrderNumber] !== '') {
      FILL_YELLOW_TO_NEXT_ORDER_NOT_NULL_ROW = false;
    }

    if (FILL_YELLOW_TO_NEXT_ORDER_NOT_NULL_ROW) {
      styleCandidates.push({
        backgroundColor: STYLE_COLORS.YELLOW,
        priority: STYLE_PRIORITY.HIGHLIGHT_AMOUNT,
      });
    }

    if (
      highlightTotalBoxes &&
      previousBoxnumber !== '' &&
      previousBoxnumber > 1
    ) {
      styleCandidates.push({
        backgroundColor: STYLE_COLORS.YELLOW,
        priority: STYLE_PRIORITY.HIGHLIGHT_BOXES,
      });
    }

    if (
      highlightTotalAmount2000 &&
      typeof currentJsonData[ExcelColumnKeys.ProcessedAmount] === 'number' &&
      currentJsonData[ExcelColumnKeys.ProcessedAmount] > 2000
    ) {
      FILL_YELLOW_TO_NEXT_ORDER_NOT_NULL_ROW = true;
      styleCandidates.push({
        backgroundColor: STYLE_COLORS.YELLOW,
        priority: STYLE_PRIORITY.HIGHLIGHT_AMOUNT,
      });
    }

    // 分離 cell-level 和 row-level 樣式
    const cellLevelStyles = styleCandidates.filter(
      (s) => s.columnIndex !== undefined,
    );
    const rowLevelStyles = styleCandidates.filter(
      (s) => s.columnIndex === undefined,
    );

    // 先套用 row-level 樣式（整行背景色）
    const bestRowStyle = getBestStyle(rowLevelStyles);
    if (bestRowStyle) {
      const worksheetRow = worksheet.getRow(currentRow + 1);
      rowFillColor(worksheetRow, bestRowStyle.backgroundColor);
    }

    // 再套用 cell-level 樣式（問題件、海關註記等），覆蓋在 row-level 之上
    cellLevelStyles.forEach((style) => {
      const cell: Cell = worksheet.getCell(currentRow + 1, style.columnIndex!);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: style.backgroundColor },
      };
    });

    // 寫入交易代碼到「申報繳納稅款註記」欄位（動態搜尋位置）
    if (transactionCode && transactionCodeColumn > 0) {
      const agCell: Cell = worksheet.getCell(
        currentRow + 1,
        transactionCodeColumn,
      );
      agCell.value = transactionCode;
    }
  });

  return workbook;
}

/** 以指定的 ARGB 顏色填充整行 */
function rowFillColor(row: Row, argbColor: string) {
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: argbColor },
  };
  row.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
}

function generateNewFileName(originalPath: string): string {
  const originalFilename = path.basename(
    originalPath,
    path.extname(originalPath),
  ); // gets filename without extension
  const timestamp = Date.now(); // gets current timestamp
  const newFileName = `${originalFilename}-completed-${timestamp}.xlsx`;

  return path.join(path.dirname(originalPath), newFileName);
}

function computeStatistics(jsonData: SheetData[]): Map<string, number> {
  const stats: Map<string, number> = new Map();

  jsonData.forEach((data) => {
    const name = data[ExcelColumnKeys.RecipientEnglishName] as string;
    const orderNumber = data[ExcelColumnKeys.ShippingOrderNumber];

    if (!name || !orderNumber) return;

    // 如果已存在名字, 增加計數
    if (stats.has(name)) {
      stats.set(name, stats.get(name)! + 1);
    } else {
      // 如果名字不存在, 設定初始值為 1
      stats.set(name, 1);
    }
  });

  return stats;
}

async function addStatisticsSheet(
  workbook: Workbook,
  jsonData: SheetData[],
): Promise<void> {
  const NAME_COLUMN_TITLE = '人名';
  const NAME_ROW_INDEX = 'A';
  const NAME_COLUMN_INDEX = '1';
  const ORDER_COUNT_COLUMN_TITLE = '下單次數';
  const ORDER_COUNT_ROW_INDEX = 'B';
  const ORDER_COUNT_COLUMN_INDEX = '1';

  const stats = computeStatistics(jsonData);

  // 創建新的工作表
  const worksheet = workbook.addWorksheet('完成資料');

  // 設置工作表標題
  worksheet.getCell(`${NAME_ROW_INDEX}${NAME_COLUMN_INDEX}`).value =
    NAME_COLUMN_TITLE;
  worksheet.getCell(
    `${ORDER_COUNT_ROW_INDEX}${ORDER_COUNT_COLUMN_INDEX}`,
  ).value = ORDER_COUNT_COLUMN_TITLE;

  let currentRow = 2; // 從第二行開始填充數據

  stats.forEach((count, name) => {
    worksheet.getCell(`${NAME_ROW_INDEX}${currentRow}`).value = name;
    worksheet.getCell(`${ORDER_COUNT_ROW_INDEX}${currentRow}`).value = count;
    currentRow++;
  });
}

export async function copyTemplateWorksheetToNewExcelByWorkSheet(
  templateWorksheet: Worksheet,
  targetPath: string,
  sheetName: string,
  targetWorkbook?: Workbook,
) {
  const _targetWorkbook = targetWorkbook ?? new Workbook();
  console.log('targetPath', targetPath);
  if (!targetWorkbook) await _targetWorkbook.xlsx.readFile(targetPath);

  // 複製工作表

  const targetSheet = _targetWorkbook.addWorksheet(sheetName);

  // 複製行和列數據及其樣式
  templateWorksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const newRow = targetSheet.getRow(rowNumber);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const newCell = newRow.getCell(colNumber);
      Object.assign(newCell, cell); // 使用Object.assign來複製所有屬性
    });
    newRow.commit();
  });

  // 直接複製合併的單元格
  // targetSheet.model = Object.assign(targetSheet.model, {
  //   mergeCells: sourceWorksheet.model.merges
  // });

  // 保存新的 Excel 檔案
  // await targetWorkbook.xlsx.writeFile(outputPath);
  return _targetWorkbook;
}

export async function copyTemplateWorksheetToNewExcel(
  templatePath: string,
  outputPath: string,
) {
  // 讀取模板檔案
  const sourceWorkbook = new Workbook();
  await sourceWorkbook.xlsx.readFile(templatePath);

  // 創建新的工作簿
  const targetWorkbook = new Workbook();

  // 複製工作表
  sourceWorkbook.eachSheet((sourceWorksheet, id) => {
    const targetSheet = targetWorkbook.addWorksheet(sourceWorksheet.name);

    // 複製行和列數據及其樣式
    sourceWorksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = targetSheet.getRow(rowNumber);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);
        Object.assign(newCell, cell); // 使用Object.assign來複製所有屬性
      });
      newRow.commit();
    });

    // 直接複製合併的單元格
    // targetSheet.model = Object.assign(targetSheet.model, {
    //   mergeCells: sourceWorksheet.model.merges
    // });
  });

  // 保存新的 Excel 檔案
  await targetWorkbook.xlsx.writeFile(outputPath);
}
