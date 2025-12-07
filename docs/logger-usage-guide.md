# Logger System 使用指南

## 功能特性

✅ **开发环境**：
- 输出到控制台（带颜色）
- 写入本地日志文件
- 自动日志轮转（单文件最大 10MB）
- 保留最近 7 天的日志

✅ **生产环境**：
- 只记录 ERROR 级别
- 写入本地日志文件
- 不输出到控制台（性能优化）

✅ **自动管理**：
- 日志文件自动清理
- 文件大小自动轮转
- Renderer 日志自动转发到 Main Process

## 安装步骤

### 1. 在 Main Process 注册 Logger Handler

编辑 `src/main/main.ts`：

```typescript
// 在文件顶部导入
import { setupLoggerHandlers } from './modules/logger-handlers';
import { logger } from './utils/logger.tool';

// 在 app.whenReady() 中注册（越早越好）
app.whenReady().then(() => {
  // 1️⃣ 首先注册 logger handlers
  setupLoggerHandlers();

  logger.info('Application starting...');

  // 2️⃣ 然后创建窗口
  const mainWindow = createMainWindow();

  // 3️⃣ 注册其他 handlers
  setupExcelHandlers(mainWindow);
  setupSaveSettingsHandlers(mainWindow);
  setupAppStatusHandlers();
  setupAuthHandlers();

  logger.info('Application started successfully');
});
```

### 2. 更新 Preload Script（可选）

如果需要在 Renderer 中使用 logger，确保 IPC 通道已暴露。

编辑 `src/main/preload.ts`：

```typescript
// logger 已经使用 sendMessage，无需额外配置
// 现有的 electronHandler 已经包含 sendMessage 方法
```

## 使用方式

### Main Process 中使用

```typescript
import { logger } from './utils/logger.tool';

// Debug 级别（只在开发环境显示）
logger.debug('Processing Excel file...', { fileName: 'test.xlsx' });

// Info 级别
logger.info('User logged in', { userName: 'admin' });

// Warning 级别
logger.warn('Large file detected', { size: '50MB' });

// Error 级别（总是记录到文件）
try {
  await processData();
} catch (error) {
  logger.error('Failed to process data', error, { context: 'Excel processing' });
}
```

### Renderer Process 中使用

```typescript
import { logger } from '@/utils/logger.tool';

// 组件中使用
function MyComponent() {
  const handleClick = async () => {
    logger.info('Button clicked', { buttonId: 'export' });

    try {
      const result = await window.electron.excelBridge.sendSelectExcelFile();
      logger.debug('File selected', { path: result.path });
    } catch (error) {
      logger.error('Failed to select file', error);
    }
  };

  return <button onClick={handleClick}>Export</button>;
}
```

### 创建带上下文的 Logger

```typescript
// Renderer Process
import { logger } from '@/utils/logger.tool';

function HomePage() {
  // 创建带上下文的 logger
  const pageLogger = logger.createChildLogger('HomePage');

  useEffect(() => {
    pageLogger.info('Page mounted');

    return () => {
      pageLogger.info('Page unmounted');
    };
  }, []);

  const handleExport = async () => {
    pageLogger.debug('Starting export...');
    // 日志会显示为：[HomePage] Starting export...
  };
}
```

## 日志文件位置

### Windows
```
C:\Users\<用户名>\AppData\Roaming\<你的应用名>\logs\
```

### macOS
```
~/Library/Application Support/<你的应用名>/logs/
```

### Linux
```
~/.config/<你的应用名>/logs/
```

### 日志文件命名
```
app-2025-12-07.log          # 当天的日志
app-2025-12-07T10-30-45.log # 轮转后的日志（带时间戳）
```

## 高级配置

### 自定义 Logger 配置

在 `src/main/main.ts` 中：

```typescript
import { logger } from './utils/logger.tool';

// 更新配置
logger.updateConfig({
  level: LogLevel.INFO,      // 最低日志级别
  maxFileSize: 20 * 1024 * 1024,  // 20MB
  maxFiles: 14,              // 保留 14 天
});
```

### 获取日志文件

```typescript
import { logger } from './utils/logger.tool';

// 获取当前日志文件路径
const currentLogFile = logger.getLogFilePath();
console.log('Current log file:', currentLogFile);

// 获取所有日志文件
const allLogFiles = logger.getAllLogFiles();
console.log('All log files:', allLogFiles);
```

### 在 UI 中显示日志文件路径

可以添加一个菜单项或按钮来打开日志目录：

```typescript
// Main Process
import { shell } from 'electron';
import { logger } from './utils/logger.tool';
import path from 'path';

ipcMain.on('OPEN_LOG_DIR', () => {
  const logFile = logger.getLogFilePath();
  const logDir = path.dirname(logFile);
  shell.openPath(logDir);
});
```

```typescript
// Renderer Process
<button onClick={() => {
  window.electron.ipcRenderer.sendMessage('OPEN_LOG_DIR');
}}>
  打开日志目录
</button>
```

## 日志级别说明

| 级别 | 开发环境 | 生产环境 | 用途 |
|------|---------|---------|------|
| DEBUG | ✅ 控制台 + 文件 | ❌ 不记录 | 详细的调试信息 |
| INFO | ✅ 控制台 + 文件 | ❌ 不记录 | 一般信息 |
| WARN | ✅ 控制台 + 文件 | ❌ 不记录 | 警告信息 |
| ERROR | ✅ 控制台 + 文件 | ✅ 仅文件 | 错误信息 |

## 最佳实践

### 1. 记录关键操作
```typescript
logger.info('Starting Excel export', { settingName, fileCount: 10 });
// ... 处理 ...
logger.info('Excel export completed', { outputPath, duration: '2.5s' });
```

### 2. 记录错误上下文
```typescript
try {
  await processExcelData(filePath);
} catch (error) {
  logger.error('Excel processing failed', error, {
    filePath,
    step: 'data-validation',
    userId: currentUser.id,
  });
}
```

### 3. 不要记录敏感信息
```typescript
// ❌ 不好
logger.info('User login', { password: 'secret123' });

// ✅ 好
logger.info('User login', { username: user.username });
```

### 4. 使用合适的日志级别
```typescript
// ✅ 好
logger.debug('Cache hit', { key: 'user-123' });  // 调试信息
logger.info('File uploaded', { fileName });       // 一般信息
logger.warn('API slow response', { duration });   // 潜在问题
logger.error('Database connection failed', err);  // 错误

// ❌ 不好 - 滥用 ERROR 级别
logger.error('Button clicked');  // 应该用 DEBUG 或 INFO
```

## 性能考虑

1. **开发环境**：所有日志都会输出，性能影响可接受
2. **生产环境**：只记录 ERROR，最小化性能影响
3. **文件写入**：异步操作，不会阻塞主线程
4. **自动清理**：避免日志文件占用过多磁盘空间

## 故障排查

### 日志文件未创建

检查：
1. 日志目录权限是否正确
2. 是否调用了 `setupLoggerHandlers()`
3. 查看控制台是否有错误信息

### Renderer 日志未记录到文件

检查：
1. Main Process 是否注册了 `setupLoggerHandlers()`
2. Preload 中是否暴露了 `sendMessage` 方法
3. 查看浏览器控制台是否有 IPC 错误

### 日志文件过大

调整配置：
```typescript
logger.updateConfig({
  maxFileSize: 5 * 1024 * 1024,  // 减小到 5MB
  maxFiles: 3,                    // 只保留 3 天
});
```

## 示例：完整的错误处理流程

```typescript
// Main Process - Excel Handler
import { logger } from '../../utils/logger.tool';

electronIpcMain.on(IPC_CHANNELS.EXPORT_DEFAULT_SHEET, async (event, settingName: string) => {
  const requestId = Date.now(); // 用于追踪请求

  logger.info('Export request received', { requestId, settingName });

  try {
    if (!currentSelectedFilePath.get()) {
      logger.warn('Export failed - no file selected', { requestId });
      event.reply(IPC_CHANNELS.EXPORT_DEFAULT_SHEET_COMPLATED, {
        isError: true,
        message: 'No file selected',
      });
      return;
    }

    logger.debug('Processing Excel data', { requestId, filePath: currentSelectedFilePath.get() });

    const completedData = await processExcelData(currentSelectedFilePath.get());

    logger.debug('Saving processed data', { requestId, rowCount: completedData.length });

    const newFilePath = await saveProcessedData(completedData, currentSelectedFilePath.get());

    logger.info('Export completed successfully', {
      requestId,
      outputPath: newFilePath,
      rowCount: completedData.length,
    });

    event.reply(IPC_CHANNELS.EXPORT_DEFAULT_SHEET_COMPLATED, {
      path: newFilePath,
      data: completedData,
      isError: false,
    });
  } catch (error) {
    logger.error('Export failed', error, {
      requestId,
      settingName,
      filePath: currentSelectedFilePath.get(),
    });

    event.reply(IPC_CHANNELS.EXPORT_DEFAULT_SHEET_COMPLATED, {
      path: '',
      data: [],
      isError: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

## 下一步

✅ Logger System 已完成！

现在可以：
1. 在 main.ts 中注册 logger handlers
2. 在代码中添加日志记录
3. 开始 IPC 架构迁移（logger 已经可以帮助调试）
