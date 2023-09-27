/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { app } from 'electron';
import os from 'os';
// import { localDebug } from "./modules/debug";

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

export function jsonToExcel(data: any[], outputPath: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1'); // "Sheet1" is the sheet name
  XLSX.writeFile(workbook, outputPath);
}

export function excelToJSON(
  filePath: string,
  opts?: XLSX.Sheet2JSONOpts,
): any[] {
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

    const sheetName = workbook.SheetNames[0]; // Assuming you want the first sheet

    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet, opts);

    return data;
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

export enum ComputerPlatform {
  Windows = 'win32',
  Mac = 'darwin',
  Linux = 'linux',
}

export function getPlatform(): ComputerPlatform {
  switch (os.platform()) {
    case 'darwin': // macOS
      return ComputerPlatform.Mac;
    case 'win32': // Windows
      return ComputerPlatform.Windows;
    case 'linux': // Linux
      return ComputerPlatform.Linux;
    default:
      throw new Error('Unsupported platform');
  }
}

export enum Arch {
  x64 = 'x64',
  ia32 = 'ia32',
  x86 = 'x86',
  arm = 'armv7l',
}

export function getCpuArch() {
  const ArchMap: { [key: string]: Arch } = {
    x64: Arch.x64,
    ia32: Arch.ia32,
    arm: Arch.arm,
    arm64: Arch.arm,
    arm32: Arch.arm,
  };

  return ArchMap[os.arch()] ?? Arch.x86;
}
type GroupedResult<T> = {
  [key: string]: T[];
};

export function jsonGroupBy<T, U = T>(
  jsonData: T[],
  keys: (keyof T)[],
  groupHandler: (items: T[]) => U,
): U[] {
  if (keys.length === 0) {
    return [groupHandler(jsonData)];
  }

  const key = keys[0];
  const nextKeys = keys.slice(1);
  const groupedData: GroupedResult<T> = {};

  // 分組
  jsonData.forEach((item) => {
    const keyValue = item[key] as unknown as string; // 假定 key 指向的屬性為字串型別
    if (!groupedData[keyValue]) {
      groupedData[keyValue] = [];
    }
    groupedData[keyValue].push(item);
  });

  const resultArray: U[] = [];
  for (const groupKey in groupedData) {
    resultArray.push(
      ...jsonGroupBy(groupedData[groupKey], nextKeys, groupHandler),
    );
  }

  return resultArray;
}

// 示範

interface TestData {
  id: number;
  category: string;
  tag: number;
  name: string;
}

const testData: TestData[] = [
  { id: 1, category: 'Fruit', tag: 1, name: 'Apple' },
  { id: 2, category: 'Fruit', tag: 1, name: 'Banana' },
  { id: 3, category: 'Vegetable', tag: 1, name: 'Carrot' },
  { id: 4, category: 'Fruit', tag: 2, name: 'Date' },
  { id: 5, category: 'Vegetable', tag: 1, name: 'Eggplant' },
];

// 使用 jsonGroupBy 方法分組
const groupedData: TestData[] = jsonGroupBy(
  testData,
  ['category', 'tag'],
  (items) => {
    return {
      ...items[0],
    };
  },
);

console.log(groupedData);
