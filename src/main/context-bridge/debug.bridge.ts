import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../constants/ipc-channels';

/**
 * Debug 訊息監聽模組
 *
 * 遷移評估（2025-12-07）：
 * - 此模組為開發除錯工具，用於在 UI 顯示來自 main process 的 debug 訊息
 * - 目前由 debug-console 組件使用，功能運作正常
 *
 * 暫不遷移原因：
 * 1. 這是「事件推送」模式（main → renderer），與 V2 架構的「請求-響應」模式不同
 * 2. V2 架構使用 ipcMain.handle / ipcRenderer.invoke，適用於單次請求
 * 3. 事件監聽需要 ipcRenderer.on 持續監聽，無法直接用 invoke 替代
 * 4. 若要遷移需實作獨立的「事件訂閱」機制，成本較高
 * 5. 此為開發工具，優先級較低，目前運作正常無需變更
 *
 * 如需遷移，可考慮：
 * - 使用 WebSocket 或 Server-Sent Events
 * - 在 V2 架構中新增 subscription 模式支援
 */
const debugMessages: string[] = [];
export function listenForDebugMessages(func: (message: string) => void) {
  ipcRenderer.on(IPC_CHANNELS.DEBUG_MESSAGE, (_event, message) => {
    debugMessages.push(message);
    func(message);
  });
}
export function getDebugMessages() {
  return debugMessages;
}

export default {
  listenForDebugMessages,
  getDebugMessages,
};
