/**
 * 進度回報工具（Main Process）
 *
 * 因為 V2 的 invoke 是請求/回應，長時間操作（如批量智能辨識）過程中的進度
 * 需要另走 push 通道送到 renderer。此工具持有目前視窗，提供 reportProgress()。
 */
import { BrowserWindow } from 'electron';
import {
  EXCEL_PROGRESS_CHANNEL,
  ExcelProgress,
} from '../../shared/excel-progress';

let targetWindow: BrowserWindow | null = null;

/** 在 handler 設置時注入目前視窗 */
export function initProgress(window: BrowserWindow): void {
  targetWindow = window;
}

/** 推送一則進度事件到 renderer（視窗不存在時靜默略過） */
export function reportProgress(progress: ExcelProgress): void {
  try {
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send(EXCEL_PROGRESS_CHANNEL, progress);
    }
  } catch {
    // 進度回報失敗不應影響主流程
  }
}
