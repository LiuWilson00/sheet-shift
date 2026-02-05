/**
 * 問題件相關型別定義
 */

/** 問題件 */
export interface ProblemItem {
  /** 貨物名稱 */
  貨物名稱: string;
}

/** 問題件欄位名稱 */
export enum ProblemItemColumnKeys {
  /** 貨物名稱 */
  ProductName = '貨物名稱',
}

/** 問題件檢查結果 */
export interface ProblemItemCheckResult {
  /** 是否為問題件 */
  isProblem: boolean;
  /** 匹配的問題件名稱（如果是） */
  matchedItem?: string;
}
