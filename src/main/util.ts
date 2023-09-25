/* eslint import/prefer-default-export: off */
import { URL } from "url";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { app } from "electron";
// import { localDebug } from "./modules/debug";

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, "../renderer/", htmlFileName)}`;
}

export function jsonToExcel(data: any[], outputPath: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1"); // "Sheet1" is the sheet name
  XLSX.writeFile(workbook, outputPath);
}

export function excelToJSON(
  filePath: string,
  opts?: XLSX.Sheet2JSONOpts
): any[] {
  try {
    if (!fs.existsSync(filePath)) {
      throw {
        err: {},
        message: "File not found",
        appPath: app.getAppPath(),
        filePath: filePath,
      };
    }
    // 讀取檔案到 buffer
    const fileBuffer = fs.readFileSync(filePath);

    // 使用 xlsx 的 read 函數而不是 readFile，並傳遞 buffer 和選項
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0]; // Assuming you want the first sheet

    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet, opts);

    return data;
  } catch (error) {
    const _error = error as Error;
    console.error("Error reading the Excel file:", error);
    throw {
      err: {
        name: _error.name,
        message: _error.message,
        stack: _error.stack,
      },
      message: "Error reading the Excel file",
      appPath: app.getAppPath(),
      filePath: filePath,
    };
  }
}
