import {
  ipcMain as electronIpcMain,
  dialog as electronDialog,
  BrowserWindow as electronBrowserWindow,
} from 'electron';
// import { json } from 'node:stream/consumers';
import { excelToJSON } from '../../util';
import {
  ExcelColumnKeys,
  OriginalExcelData,
  CompletedExcelData,
  ProductNameMapping,
  ProductNameMappingColumnKeys,
  columnOrder,
} from './index.interface';
import path from 'path';
// import * as XLSX from 'xlsx';
import { Workbook, Cell, Worksheet } from 'exceljs';

const STATIC_RESOURCE_PATH = path.join(__dirname, '../static-resource');
const PRODUCT_FILE_PATH = path.join(
  STATIC_RESOURCE_PATH,
  '/product-name-mapping.xls',
);
const ORIGINAL_DATA_TEMPLATE_PATH = path.join(
  STATIC_RESOURCE_PATH,
  '/original-data-template.xlsx',
);

export async function setupExcelHandlers(mainWindow: electronBrowserWindow) {
  electronIpcMain.on('select-excel-file', async (event) => {
    console.log('select-excel-file');
    const result = await electronDialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const productNameMap: ProductNameMapping[] =
        await excelToJSON(PRODUCT_FILE_PATH);

      const originalData: OriginalExcelData[] = await excelToJSON(filePath, {
        range: 2,
      });

      const completedData = mappingRealProductName(
        originalData,
        productNameMap,
      );

      const newFilePath = generateNewFileName(filePath);
      const complatedWorkbook = await addJsonToExcelTemplate(completedData);
 
      complatedWorkbook.xlsx.writeFile(newFilePath);
      event.reply('excel-data', { path: newFilePath, data: completedData });
    }
  });
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


function mappingRealProductName(
  originalDataJson: OriginalExcelData[],
  productNameMap: ProductNameMapping[],
): CompletedExcelData[] {
  const completedData: CompletedExcelData[] = [];

  originalDataJson.forEach((originalData) => {
    const realNameItem = productNameMap.find(
      (item) =>
        item[ProductNameMappingColumnKeys.OriginalProductName] ===
        originalData[ExcelColumnKeys.ProductName],
    );

    if (realNameItem) {
      completedData.push({
        ...originalData,
        [ExcelColumnKeys.RealProductName]:
          realNameItem[ProductNameMappingColumnKeys.CorrectProductName],
        [ExcelColumnKeys.ProductClassNumber]:
          realNameItem[ProductNameMappingColumnKeys.TariffCode],
      });
    }
  });
  return completedData;
}

async function addJsonToExcelTemplate(
  jsonData: CompletedExcelData[],
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

    Object.keys(row).forEach((key, colIndex) => {
      const columnInfo = columnOrder.find((col) => col.valueKey === key);

      if (!columnInfo) return;

      const cell: Cell = worksheet.getCell(
        currentRow + 1,
        columnInfo?.columnIndex,
      );
      cell.value = row[key as keyof CompletedExcelData];
    });
  });

  return workbook;
}
