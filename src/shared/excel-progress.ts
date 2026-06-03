/**
 * 資料前處理 / 智能辨識的進度回報（main → renderer 推送）共用定義。
 *
 * 純定義 + 純函式，無 electron 依賴，前後端與測試皆可直接引用。
 */

/** 進度事件的 IPC channel */
export const EXCEL_PROGRESS_CHANNEL = 'excel-v2/progress';

/** 進度階段 */
export type ExcelProgressPhase = 'read' | 'compare' | 'classify' | 'done';

/** 進度事件 payload */
export interface ExcelProgress {
  phase: ExcelProgressPhase;
  /** 目前處理到第幾筆（classify 階段使用） */
  current?: number;
  /** 總筆數（classify 階段使用） */
  total?: number;
  /** 給使用者看的友善訊息 */
  message: string;
}

/** 組出智能辨識進度訊息 */
export function classifyProgressMessage(
  current: number,
  total: number,
): string {
  return `智能辨識中 ${current}/${total} 筆…`;
}

/**
 * 判斷該筆是否要寫進度 log：
 * 第一筆、最後一筆、或每 interval 筆記一次（避免逐筆灌爆 log）。
 */
export function shouldLogClassifyProgress(
  current: number,
  total: number,
  interval: number = 25,
): boolean {
  return current === 1 || current === total || current % interval === 0;
}
