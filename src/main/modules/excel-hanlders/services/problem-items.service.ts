/**
 * 問題件檢查服務
 *
 * 功能：
 * - 根據貨物名稱完全匹配問題件清單
 * - 匹配到的項目標記為紅色背景
 */

import { SheetData, ExcelColumnKeys } from '../index.interface';
import { problemItemsSheet } from '../../../utils/google-sheets.tool';
import {
  ProblemItemSheet,
  ProblemItemColumnKeys,
} from '../../../utils/google-sheets.tool/index.interface';
import { RowStyleMap, STYLE_COLORS, STYLE_PRIORITY } from '../index.const';

/**
 * 檢查問題件並返回行樣式映射
 *
 * 使用完全匹配（exact match）比對貨物名稱
 * 匹配到的行標記為紅色背景（最高優先級）
 */
// eslint-disable-next-line import/prefer-default-export
export function checkProblemItems(
  data: SheetData[],
  problemItems?: ProblemItemSheet[],
): RowStyleMap {
  const items = problemItems ?? problemItemsSheet.get();
  const rowStyles: RowStyleMap = new Map();

  // 建立問題件名稱集合以提高查詢效率
  const problemItemNames = new Set(
    items
      .map((item) => item[ProblemItemColumnKeys.ProductName]?.trim())
      .filter(Boolean),
  );

  if (problemItemNames.size === 0) return rowStyles;

  data.forEach((row, index) => {
    const productName = row[ExcelColumnKeys.ProductName]?.trim();
    if (!productName) return;

    if (problemItemNames.has(productName)) {
      const styles = rowStyles.get(index) || [];
      styles.push({
        backgroundColor: STYLE_COLORS.RED,
        priority: STYLE_PRIORITY.PROBLEM_ITEM,
        columnIndex: 4, // 只標記「貨物名稱」欄位
      });
      rowStyles.set(index, styles);
    }
  });

  return rowStyles;
}
