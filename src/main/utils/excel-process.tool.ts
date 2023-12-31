/* eslint import/prefer-default-export: off */
import fs from 'fs';
import * as XLSX from 'xlsx';
import { app } from 'electron';

export function jsonToExcel(data: any[], outputPath: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1'); // "Sheet1" is the sheet name
  XLSX.writeFile(workbook, outputPath);
}

export function excelToJSON<I, O = I>(
  filePath: string,
  options?: {
    sheetName?: string;
    sheetIndex?: number;
    xlsxOpts?: XLSX.Sheet2JSONOpts;
    resultProcess?: (datas: I[]) => O[];
  },
): O[] {
  try {
    if (!fs.existsSync(filePath)) {
      throw {
        err: {},
        message: 'File not found',
        appPath: app.getAppPath(),
        filePath: filePath,
      };
    }
    // 讀取檔案到 buffer
    const fileBuffer = fs.readFileSync(filePath);

    // 使用 xlsx 的 read 函數而不是 readFile，並傳遞 buffer 和選項
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const sheetName =
      options?.sheetName ?? workbook.SheetNames[options?.sheetIndex ?? 0]; // Assuming you want the first sheet

    const worksheet = workbook.Sheets[sheetName];

    const data: any[] = XLSX.utils.sheet_to_json(worksheet, options?.xlsxOpts);

    return options?.resultProcess ? options.resultProcess(data) : (data as O[]);
  } catch (error) {
    const _error = error as Error;
    console.error('Error reading the Excel file:', error);
    throw {
      err: {
        name: _error.name,
        message: _error.message,
        stack: _error.stack,
      },
      message: 'Error reading the Excel file',
      appPath: app.getAppPath(),
      filePath: filePath,
    };
  }
}
