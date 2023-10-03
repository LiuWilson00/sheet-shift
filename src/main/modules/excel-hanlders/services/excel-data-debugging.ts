import { excelToJSON, tariffCodeSheet } from "../../../utils";
import { TariffCodeSheetColumnKeys } from "../../../utils/google-sheets.tool/index.interface";
import { ExcelColumnKeys, SheetData } from "../index.interface";


export function findUnMappingData(filePath: string){

    const productNameMap = tariffCodeSheet.get();

    const originalData: SheetData[] = excelToJSON(filePath, {
      xlsxOpts: { range: 2 },
    });

    const unMappingData = originalData.filter(entry => {
        const productName = entry[ExcelColumnKeys.ProductName];
        return !productNameMap.find(map => map[TariffCodeSheetColumnKeys.OriginalProductName] === productName);
    })

    return unMappingData;
}