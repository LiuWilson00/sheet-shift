import { ipcRenderer } from 'electron';
import {
  EXCEL_PROGRESS_CHANNEL,
  ExcelProgress,
} from '../../shared/excel-progress';

/**
 * 進度事件監聽（renderer 端，透過 preload 暴露）
 *
 * 與 debug.bridge 同為「事件推送」模式（main → renderer）。
 * onExcelProgress 回傳一個取消訂閱函式，呼叫端用完務必取消，避免重複堆疊。
 */
export function onExcelProgress(func: (progress: ExcelProgress) => void) {
  const subscription = (_event: unknown, progress: ExcelProgress) =>
    func(progress);
  ipcRenderer.on(EXCEL_PROGRESS_CHANNEL, subscription as any);
  return () => {
    ipcRenderer.removeListener(EXCEL_PROGRESS_CHANNEL, subscription as any);
  };
}

export default { onExcelProgress };
