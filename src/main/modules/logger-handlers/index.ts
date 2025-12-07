/**
 * Logger Handlers - 处理来自 Renderer 的日志
 */

import { ipcMain } from 'electron';
import { logger, LogLevel } from '../../utils/logger.tool';

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

  logger.info('[Logger Handlers] Registered successfully');
}
