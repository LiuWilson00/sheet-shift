/**
 * 問題件檢查服務
 *
 * 功能：
 * - 根據貨物名稱子字串匹配問題件清單
 * - 匹配到的項目標記為紅色背景
 */

import { SheetData, ExcelColumnKeys } from '../index.interface';
import { problemItemsSheet } from '../../../utils/google-sheets.tool';
import {
  ProblemItemSheet,
  ProblemItemColumnKeys,
} from '../../../utils/google-sheets.tool/index.interface';
import { RowStyleMap, STYLE_COLORS, STYLE_PRIORITY } from '../index.const';
import { logger } from '../../../utils/logger.tool';

/**
 * 檢查問題件並返回行樣式映射
 *
 * 使用子字串匹配（includes）比對貨物名稱
 * 只要貨物名稱包含問題件關鍵字即標記為紅色背景（最高優先級）
 */
// eslint-disable-next-line import/prefer-default-export
export function checkProblemItems(
  data: SheetData[],
  problemItems?: ProblemItemSheet[],
): RowStyleMap {
  const items = problemItems ?? problemItemsSheet.get();
  const rowStyles: RowStyleMap = new Map();

  // 建立問題件關鍵字陣列（用於子字串匹配）
  const problemKeywords = items
    .map((item) => item[ProblemItemColumnKeys.ProductName]?.trim())
    .filter(Boolean);

  logger.info('問題件檢查', {
    dataCount: data.length,
    itemsFromStore: items.length,
    keywords: problemKeywords,
  });

  if (problemKeywords.length === 0) return rowStyles;

  data.forEach((row, index) => {
    const productName = row[ExcelColumnKeys.ProductName]?.trim();
    if (!productName) return;

    // 子字串匹配：貨物名稱包含任一問題件關鍵字即標紅
    const isMatch = problemKeywords.some((keyword) =>
      productName.includes(keyword),
    );
    if (isMatch) {
      logger.info('匹配到問題件', { index, productName });
      const styles = rowStyles.get(index) || [];
      styles.push({
        backgroundColor: STYLE_COLORS.RED,
        priority: STYLE_PRIORITY.PROBLEM_ITEM,
        columnIndex: 4, // 只標記「貨物名稱」欄位
      });
      rowStyles.set(index, styles);
    }
  });

  logger.info('問題件檢查結果', { matchedRows: rowStyles.size });

  return rowStyles;
}
