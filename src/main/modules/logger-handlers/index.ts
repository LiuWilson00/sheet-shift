/**
 * Logger Handlers - 处理来自 Renderer 的日志
 */

import { ipcMain, shell } from 'electron';
import { logger, LogLevel } from '../../utils/logger.tool';
import { createHandler } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import { ensureDirExists } from './log-folder.util';

/**
 * 日志消息格式
 */
interface LogMessage {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  data?: any;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  source: 'renderer' | 'main';
}

/**
 * 设置 Logger Handlers
 */
export function setupLoggerHandlers() {
  // 处理来自 Renderer 的日志消息
  ipcMain.on('LOGGER_MESSAGE', (_event, logMessage: LogMessage) => {
    try {
      const { level, message, data, error } = logMessage;

      // 添加来源标识
      const fullMessage = `[Renderer] ${message}`;

      // 根据级别记录日志
      switch (level) {
        case LogLevel.DEBUG:
          logger.debug(fullMessage, data);
          break;
        case LogLevel.INFO:
          logger.info(fullMessage, data);
          break;
        case LogLevel.WARN:
          logger.warn(fullMessage, data);
          break;
        case LogLevel.ERROR:
          // 重建 Error 对象
          const errorObj = error
            ? Object.assign(new Error(error.message), {
                name: error.name,
                stack: error.stack,
              })
            : undefined;
          logger.error(fullMessage, errorObj, data);
          break;
      }
    } catch (error) {
      console.error('[Logger Handler] Failed to process log message:', error);
    }
  });

  // 開啟 log 資料夾（隱藏功能，入口在系統設定最下方）
  createHandler(ipcContracts.logs.openFolder, async () => {
    try {
      const dir = ensureDirExists(logger.getLogDir());
      // shell.openPath 成功回傳空字串，失敗回傳錯誤訊息
      const errMessage = await shell.openPath(dir);
      if (errMessage) {
        logger.error('[Logger Handlers] Failed to open log folder', undefined, {
          dir,
          errMessage,
        });
        return { success: false, path: dir, message: errMessage };
      }
      return { success: true, path: dir };
    } catch (error) {
      logger.error('[Logger Handlers] open-folder handler error', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });

  logger.info('[Logger Handlers] Registered successfully');
}
