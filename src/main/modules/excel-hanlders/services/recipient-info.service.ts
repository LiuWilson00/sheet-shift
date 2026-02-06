/**
 * 收貨人資訊處理服務
 *
 * 功能：
 * - 根據統一編號比對收貨人資訊
 * - 自動帶入英文名稱和電話
 * - 標記有海關註記的項目（紅色背景）
 * - 收集新的收貨人資訊以新增到 Google Sheets
 */

import { SheetData, ExcelColumnKeys } from '../index.interface';
import {
  recipientInfoSheet,
  addSheetData,
} from '../../../utils/google-sheets.tool';
import {
  RecipientInfoSheet,
  RecipientInfoColumnKeys,
} from '../../../utils/google-sheets.tool/index.interface';
import { SheetRangeName } from '../../../utils/google-sheets.tool/index.const';
import { RowStyleMap, STYLE_COLORS, STYLE_PRIORITY } from '../index.const';
import { logger } from '../../../utils/logger.tool';

/** 收貨人資訊處理結果 */
export interface RecipientInfoProcessResult {
  /** 處理後的資料（已帶入收貨人資訊） */
  data: SheetData[];
  /** 行樣式映射（海關註記標紅） */
  rowStyles: RowStyleMap;
  /** 新發現的收貨人（需新增到 Google Sheets） */
  newRecipients: RecipientInfoSheet[];
}

/**
 * 處理收貨人資訊：比對、帶入、標記
 *
 * 流程：
 * 1. 用統一編號比對收貨人資訊表
 * 2. 匹配到：帶入英文名稱、電話；有海關註記則標紅
 * 3. 未匹配到：收集為新收貨人
 */
export function processRecipientInfo(
  data: SheetData[],
  recipientInfoList?: RecipientInfoSheet[],
): RecipientInfoProcessResult {
  const recipients = recipientInfoList ?? recipientInfoSheet.get();
  const rowStyles: RowStyleMap = new Map();
  const newRecipients: RecipientInfoSheet[] = [];

  // 建立統一編號索引以提高查詢效率
  const recipientMap = new Map<string, RecipientInfoSheet>();
  recipients.forEach((r) => {
    const taxNumber = r[RecipientInfoColumnKeys.TaxNumber];
    if (taxNumber) {
      recipientMap.set(taxNumber, r);
    }
  });

  // 追蹤已見過的新統一編號（避免重複新增）
  const seenNewTaxNumbers = new Set<string>();

  const processedData = data.map((row, index) => {
    const taxNumber = row[ExcelColumnKeys.RecipientTaxNumber];
    if (!taxNumber) return row;

    const match = recipientMap.get(taxNumber);

    if (match) {
      // 找到匹配 - 帶入資訊
      const updatedRow = { ...row };

      const englishName = match[RecipientInfoColumnKeys.EnglishName];
      if (englishName) {
        updatedRow[ExcelColumnKeys.RecipientEnglishName] = englishName;
      }

      const phone = match[RecipientInfoColumnKeys.Phone];
      if (phone) {
        updatedRow[ExcelColumnKeys.RecipientPhone] = phone;
      }

      // 檢查海關註記
      const customsNote = match[RecipientInfoColumnKeys.CustomsNote];
      if (customsNote && customsNote.trim() !== '') {
        const styles = rowStyles.get(index) || [];
        styles.push({
          backgroundColor: STYLE_COLORS.RED,
          priority: STYLE_PRIORITY.CUSTOMS_NOTE,
          columnIndex: 26, // 只標記「收貨人英文名稱」欄位
        });
        rowStyles.set(index, styles);
      }

      return updatedRow;
    }

    // 未找到匹配 - 收集新收貨人
    if (!seenNewTaxNumbers.has(taxNumber)) {
      seenNewTaxNumbers.add(taxNumber);
      newRecipients.push({
        [RecipientInfoColumnKeys.TaxNumber]: taxNumber,
        [RecipientInfoColumnKeys.EnglishName]:
          row[ExcelColumnKeys.RecipientEnglishName] || '',
        [RecipientInfoColumnKeys.Phone]:
          row[ExcelColumnKeys.RecipientPhone] || '',
        [RecipientInfoColumnKeys.CustomsNote]: '',
      });
    }
    return row;
  });

  return {
    data: processedData,
    rowStyles,
    newRecipients,
  };
}

/**
 * 將新收貨人資訊新增到 Google Sheets
 */
export async function addNewRecipientsToSheet(
  newRecipients: RecipientInfoSheet[],
): Promise<boolean> {
  if (newRecipients.length === 0) return true;

  try {
    // 過濾掉已存在的
    const existingTaxNumbers = new Set(
      recipientInfoSheet
        .get()
        .map((item) => item[RecipientInfoColumnKeys.TaxNumber]),
    );
    const filteredRecipients = newRecipients.filter(
      (r) => !existingTaxNumbers.has(r[RecipientInfoColumnKeys.TaxNumber]),
    );

    if (filteredRecipients.length === 0) return true;

    const success = await addSheetData(
      SheetRangeName.RecipientInfo,
      filteredRecipients,
      { jsonTransfromOptions: { disableAddTitle: true } },
    );

    if (success) {
      // 更新本地快取
      const currentData = recipientInfoSheet.get();
      recipientInfoSheet.set([...currentData, ...filteredRecipients]);
    }

    return success;
  } catch (error) {
    logger.error('[RecipientInfo] 新增收貨人至 Google Sheets 失敗', error);
    return false;
  }
}
