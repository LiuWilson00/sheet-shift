/**
 * Logger System - Main Process
 *
 * 功能：
 * - 支援不同日誌級別（debug, info, warn, error）
 * - 開發環境：輸出到控制台 + 寫入本地檔案
 * - 生產環境：只記錄 error 級別到檔案
 * - 自動日誌輪轉（避免檔案過大）
 * - 自動清理舊日誌
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

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * 日誌級別
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日誌級別名稱對映
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
  /** 最低日誌級別 */
  level: LogLevel;
  /** 是否輸出到控制台 */
  console: boolean;
  /** 是否寫入檔案 */
  file: boolean;
  /** 日誌檔案目錄 */
  logDir: string;
  /** 單個日誌檔案最大大小（位元組），預設 10MB */
  maxFileSize: number;
  /** 保留的日誌檔案數量，預設 7 天 */
  maxFiles: number;
  /** 是否包含時間戳 */
  timestamp: boolean;
  /** 是否美化輸出（開發環境） */
  prettyPrint: boolean;
}

/**
 * 日誌條目
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  error?: Error;
}

/**
 * Logger 類別
 */
class Logger {
  private config: LoggerConfig;
  private currentLogFile: string;
  private currentFileSize: number = 0;

  constructor(config?: Partial<LoggerConfig>) {
    const isDev = process.env.NODE_ENV === 'development';

    // 預設配置
    this.config = {
      level: isDev ? LogLevel.DEBUG : LogLevel.ERROR,
      console: isDev,
      file: true,
      logDir: path.join(app.getPath('userData'), 'logs'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 7,
      timestamp: true,
      prettyPrint: isDev,
      ...config,
    };

    // 確保日誌目錄存在
    this.ensureLogDir();

    // 初始化當前日誌檔案
    this.currentLogFile = this.getCurrentLogFilePath();
    this.currentFileSize = this.getFileSize(this.currentLogFile);

    // 清理舊日誌
    this.cleanOldLogs();

    // 記錄啟動資訊
    this.info('Logger initialized', {
      isDev,
      level: LogLevelName[this.config.level],
      logFile: this.currentLogFile,
    });
  }

  /**
   * Debug 級別日誌
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info 級別日誌
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warning 級別日誌
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error 級別日誌
   */
  error(message: string, error?: Error | any, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * 核心日誌方法
   */
  private log(level: LogLevel, message: string, data?: any, error?: Error | any): void {
    // 檢查日誌級別
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error: error instanceof Error ? error : undefined,
    };

    // 輸出到控制台
    if (this.config.console) {
      this.logToConsole(entry);
    }

    // 寫入檔案
    if (this.config.file) {
      this.logToFile(entry);
    }
  }

  /**
   * 輸出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevelName[entry.level];
    const timestamp = this.config.timestamp
      ? `[${new Date(entry.timestamp).toLocaleTimeString()}]`
      : '';

    const prefix = `${timestamp} [${levelName}]`;

    // Windows 控制台輸出（避免亂碼，不使用顏色）
    const consoleMethod = {
      [LogLevel.DEBUG]: console.log,
      [LogLevel.INFO]: console.log,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
    }[entry.level];

    consoleMethod(`${prefix} ${entry.message}`);

    if (entry.data) {
      consoleMethod('  Data:', entry.data);
    }

    if (entry.error) {
      console.error('  Error:', entry.error);
      if (entry.error.stack) {
        console.error('  Stack:', entry.error.stack);
      }
    }
  }

  /**
   * 寫入檔案
   */
  private logToFile(entry: LogEntry): void {
    try {
      // 檢查檔案大小，需要輪轉嗎？
      if (this.currentFileSize >= this.config.maxFileSize) {
        this.rotateLogFile();
      }

      // 格式化日誌內容
      const logLine = this.formatLogEntry(entry);

      // 寫入檔案（追加模式）
      fs.appendFileSync(this.currentLogFile, logLine + '\n', 'utf8');

      // 更新檔案大小
      this.currentFileSize += Buffer.byteLength(logLine + '\n', 'utf8');
    } catch (error) {
      // 寫入失敗，只輸出到控制台（避免無限迴圈）
      console.error('[Logger] Failed to write to log file:', error);
    }
  }

  /**
   * 格式化日誌條目
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts: string[] = [
      entry.timestamp,
      `[${LogLevelName[entry.level]}]`,
      entry.message,
    ];

    if (entry.data) {
      try {
        parts.push(`Data: ${JSON.stringify(entry.data)}`);
      } catch (e) {
        parts.push(`Data: [Circular or Non-serializable]`);
      }
    }

    if (entry.error) {
      parts.push(`Error: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`Stack: ${entry.error.stack}`);
      }
    }

    return parts.join(' | ');
  }

  /**
   * 取得當前日誌檔案路徑
   */
  private getCurrentLogFilePath(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.config.logDir, `app-${dateStr}.log`);
  }

  /**
   * 日誌輪轉
   */
  private rotateLogFile(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const oldFile = this.currentLogFile;
    const archiveFile = path.join(
      this.config.logDir,
      `app-${timestamp}.log`
    );

    try {
      // 重新命名當前檔案
      if (fs.existsSync(oldFile)) {
        fs.renameSync(oldFile, archiveFile);
      }

      // 建立新檔案
      this.currentLogFile = this.getCurrentLogFilePath();
      this.currentFileSize = 0;

      this.info('Log file rotated', {
        oldFile: archiveFile,
        newFile: this.currentLogFile,
      });

      // 清理舊日誌
      this.cleanOldLogs();
    } catch (error) {
      console.error('[Logger] Failed to rotate log file:', error);
    }
  }

  /**
   * 清理舊日誌檔案
   */
  private cleanOldLogs(): void {
    try {
      const files = fs.readdirSync(this.config.logDir);
      const logFiles = files
        .filter((file) => file.endsWith('.log'))
        .map((file) => ({
          name: file,
          path: path.join(this.config.logDir, file),
          mtime: fs.statSync(path.join(this.config.logDir, file)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // 新檔案在前

      // 保留最新的 N 個檔案
      const filesToDelete = logFiles.slice(this.config.maxFiles);

      filesToDelete.forEach((file) => {
        try {
          fs.unlinkSync(file.path);
          console.log(`[Logger] Deleted old log file: ${file.name}`);
        } catch (error) {
          console.error(`[Logger] Failed to delete log file ${file.name}:`, error);
        }
      });
    } catch (error) {
      console.error('[Logger] Failed to clean old logs:', error);
    }
  }

  /**
   * 確保日誌目錄存在
   */
  private ensureLogDir(): void {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  /**
   * 取得檔案大小
   */
  private getFileSize(filePath: string): number {
    try {
      if (fs.existsSync(filePath)) {
        return fs.statSync(filePath).size;
      }
    } catch (error) {
      // 忽略錯誤
    }
    return 0;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.info('Logger config updated', config);
  }

  /**
   * 取得日誌檔案路徑
   */
  getLogFilePath(): string {
    return this.currentLogFile;
  }

  /**
   * 取得所有日誌檔案
   */
  getAllLogFiles(): string[] {
    try {
      const files = fs.readdirSync(this.config.logDir);
      return files
        .filter((file) => file.endsWith('.log'))
        .map((file) => path.join(this.config.logDir, file));
    } catch (error) {
      this.error('Failed to get log files', error);
      return [];
    }
  }
}

/**
 * 全域 Logger 實例
 */
export const logger = new Logger();

/**
 * 匯出 Logger 類別（用於建立自訂實例）
 */
export { Logger, LoggerConfig };
