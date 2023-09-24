/* eslint import/prefer-default-export: off */
import { URL } from "url";
import path from "path";
import * as XLSX from "xlsx";

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
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Assuming you want the first sheet
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, opts);
    return data;
  } catch (error) {
    console.error("Error reading the Excel file:", error);
    return [];
  }
}
