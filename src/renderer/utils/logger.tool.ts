/**
 * Logger System - Renderer Process
 *
 * Renderer 端的日志会通过 IPC 发送到 Main Process 进行统一处理
 *
 * 使用方式：
 * ```typescript
 * import { logger } from '@/utils/logger.tool';
 *
 * logger.debug('Debug message', { data: 'something' });
 * logger.info('Info message');
 * logger.warn('Warning message');
 * logger.error('Error message', error);
 * ```
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志级别名称映射
 */
const LogLevelName: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * Logger 配置
 */
interface LoggerConfig {
  /** 最低日志级别 */
  level: LogLevel;
  /** 是否输出到控制台 */
  console: boolean;
  /** 是否发送到 Main Process */
  sendToMain: boolean;
  /** 是否包含时间戳 */
  timestamp: boolean;
  /** 是否美化输出 */
  prettyPrint: boolean;
}

/**
 * Logger 类
 */
class RendererLogger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    const isDev = process.env.NODE_ENV === 'development';

    // 默认配置
    this.config = {
      level: isDev ? LogLevel.DEBUG : LogLevel.ERROR,
      console: isDev,
      sendToMain: true,
      timestamp: true,
      prettyPrint: isDev,
      ...config,
    };
  }

  /**
   * Debug 级别日志
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info 级别日志
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warning 级别日志
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error 级别日志
   */
  error(message: string, error?: Error | any, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * 核心日志方法
   */
  private log(level: LogLevel, message: string, data?: any, error?: Error | any): void {
    // 检查日志级别
    if (level < this.config.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevelName[level];

    // 输出到控制台
    if (this.config.console) {
      this.logToConsole(level, message, data, error, timestamp);
    }

    // 发送到 Main Process
    if (this.config.sendToMain && window.electron) {
      try {
        // 使用现有的 DEBUG_MESSAGE channel 或创建新的
        window.electron.ipcRenderer.sendMessage('LOGGER_MESSAGE', {
          timestamp,
          level,
          levelName,
          message,
          data,
          error: error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : undefined,
          source: 'renderer',
        });
      } catch (e) {
        // IPC 发送失败，只记录到控制台
        console.warn('[Logger] Failed to send log to main process:', e);
      }
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(
    level: LogLevel,
    message: string,
    data?: any,
    error?: Error | any,
    timestamp?: string
  ): void {
    const levelName = LogLevelName[level];
    const timestampStr = this.config.timestamp && timestamp
      ? `[${new Date(timestamp).toLocaleTimeString()}]`
      : '';

    const prefix = `${timestampStr} [${levelName}]`;

    if (this.config.prettyPrint) {
      // 美化输出（带颜色）
      const styles = {
        [LogLevel.DEBUG]: 'color: #00bcd4; font-weight: bold',
        [LogLevel.INFO]: 'color: #4caf50; font-weight: bold',
        [LogLevel.WARN]: 'color: #ff9800; font-weight: bold',
        [LogLevel.ERROR]: 'color: #f44336; font-weight: bold',
      };

      console.log(`%c${prefix}`, styles[level], message);

      if (data) {
        console.log('  Data:', data);
      }

      if (error) {
        console.error('  Error:', error);
      }
    } else {
      // 简单输出
      const consoleMethod = {
        [LogLevel.DEBUG]: console.log,
        [LogLevel.INFO]: console.log,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error,
      }[level];

      consoleMethod(`${prefix} ${message}`, data || '', error || '');
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 创建带上下文的 logger
   */
  createChildLogger(context: string): ContextLogger {
    return new ContextLogger(this, context);
  }
}

/**
 * 带上下文的 Logger
 */
class ContextLogger {
  constructor(
    private parent: RendererLogger,
    private context: string
  ) {}

  debug(message: string, data?: any): void {
    this.parent.debug(`[${this.context}] ${message}`, data);
  }

  info(message: string, data?: any): void {
    this.parent.info(`[${this.context}] ${message}`, data);
  }

  warn(message: string, data?: any): void {
    this.parent.warn(`[${this.context}] ${message}`, data);
  }

  error(message: string, error?: Error | any, data?: any): void {
    this.parent.error(`[${this.context}] ${message}`, error, data);
  }
}

/**
 * 全局 Logger 实例
 */
export const logger = new RendererLogger();

/**
 * 导出 Logger 类
 */
export { RendererLogger, ContextLogger, LoggerConfig };
