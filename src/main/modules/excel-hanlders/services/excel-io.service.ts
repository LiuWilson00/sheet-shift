import {
  dialog as electronDialog,
  BrowserWindow as electronBrowserWindow,
} from 'electron';
import path from 'path';
import { ExcelColumnKeys, SheetData } from '../index.interface';
import { Cell, Workbook, Worksheet } from 'exceljs';
import { ORIGINAL_DATA_TEMPLATE_PATH, columnOrder } from '../index.const';

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
) {
  const newFilePath = generateNewFileName(filePath);
  const completedWorkbook = await addJsonToExcelTemplate(completedData);
  await addStatisticsSheet(completedWorkbook, completedData);
  await completedWorkbook.xlsx.writeFile(newFilePath);
  return newFilePath;
}
async function addJsonToExcelTemplate(
  jsonData: SheetData[],
  startRow: number = 3,
): Promise<Workbook> {
  // 1. 讀取現有的Excel模板
  const workbook = new Workbook();
  await workbook.xlsx.readFile(ORIGINAL_DATA_TEMPLATE_PATH);

  // 2. 獲取第一個工作表
  const worksheet: Worksheet = workbook.worksheets[0];

  // 3. 將 JSON 數據添加到工作表中
  jsonData.forEach((row, index) => {
    const currentRow = startRow + index; // 根據起始行和當前索引計算要插入的行

    Object.keys(row).forEach((key) => {
      const columnInfo = columnOrder.find((col) => col.valueKey === key);

      if (!columnInfo) return;

      const cell: Cell = worksheet.getCell(
        currentRow + 1,
        columnInfo?.columnIndex,
      );
      cell.value = row[key as keyof SheetData];
    });
  });

  return workbook;
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
