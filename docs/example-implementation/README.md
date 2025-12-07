# IPC 架構範例實作

這個目錄包含了新的類型安全 IPC 架構的完整實作範例。

## 文件結構

```
example-implementation/
├── README.md                           # 本文件
├── shared-ipc-contracts.ts             # 共享的 IPC 契約定義（Main + Renderer）
├── main-typed-ipc-handler.ts           # Main Process IPC Handler 工具
├── main-settings-handlers.ts           # Settings API 實作範例
├── main-excel-handlers.ts              # Excel API 實作範例
├── renderer-typed-ipc-client.ts        # Renderer Process IPC Client 工具
└── renderer-ipc-api.ts                 # 統一的 Renderer API 入口
```

## 使用方式

### 步驟 1：複製文件到專案

將以下文件複製到對應位置：

```bash
# 共享契約（Main 和 Renderer 都需要）
cp shared-ipc-contracts.ts src/shared/

# Main Process 工具
cp main-typed-ipc-handler.ts src/main/utils/

# Main Process Handlers
cp main-settings-handlers.ts src/main/modules/settings-handlers/
cp main-excel-handlers.ts src/main/modules/excel-handlers/

# Renderer Process 工具
cp renderer-typed-ipc-client.ts src/renderer/utils/
cp renderer-ipc-api.ts src/renderer/api/
```

### 步驟 2：修改 Main Process 入口

在 `src/main/main.ts` 中註冊 handlers：

```typescript
import { setupSettingsHandlers } from './modules/settings-handlers';
import { setupExcelHandlers } from './modules/excel-handlers';

app.whenReady().then(() => {
  const mainWindow = createMainWindow();

  // 註冊新的類型安全 handlers
  setupSettingsHandlers();
  setupExcelHandlers(mainWindow);

  // ... 其他初始化邏輯
});
```

### 步驟 3：在 Renderer 中使用

更新組件以使用新的 API：

```typescript
// 舊方式
import { sendSetting, getSetting } from '../context-bridge/setting.bridge';

const settings = await getSetting('default');
await sendSetting(newSettings, 'default');

// 新方式
import { ipcApi } from '@/api/ipc-api';

const settings = await ipcApi.settings.get({ settingName: 'default' });
await ipcApi.settings.save({ data: newSettings, settingName: 'default' });
```

## 優勢對比

### 代碼量減少

**舊架構（Settings API 為例）：**
- IPC Channels: 4 個常量
- Bridge 函數: ~30 行
- Handler: ~20 行
- **總計: ~54 行**

**新架構：**
- Contract 定義: ~8 行
- Handler 實作: ~10 行
- **總計: ~18 行（減少 67%）**

### 類型安全

```typescript
// ✅ TypeScript 會檢查輸入類型
await ipcApi.settings.save({
  data: { /* ... */ },
  settingName: 'default'
});

// ❌ 編譯錯誤：缺少必要參數
await ipcApi.settings.save({
  settingName: 'default'
});

// ✅ 返回類型自動推導
const settings = await ipcApi.settings.get({ settingName: 'default' });
// settings 的類型是 Settings，IDE 會自動提示可用屬性
```

### 錯誤處理

統一的錯誤處理機制：

```typescript
try {
  const result = await ipcApi.excel.exportDefault({ settingName: 'default' });
} catch (error) {
  if (error instanceof IpcClientError) {
    console.log('IPC Error:', error.message);
    console.log('Error Code:', error.code);
    console.log('Channel:', error.channel);
  }
}
```

### 開發體驗

1. **自動補全**：IDE 會提示所有可用的 API
2. **類型檢查**：編譯時發現錯誤
3. **集中管理**：所有 API 定義在一個文件
4. **易於重構**：修改 contract 會自動更新所有使用處

## 遷移策略

### 階段 1：新舊並存

新舊系統可以共存，逐步遷移：

```typescript
// main.ts
// 舊的 handlers（保持不變）
setupExcelHandlers(mainWindow);  // 舊版
setupSaveSettingsHandlers(mainWindow);  // 舊版

// 新的 handlers
import { setupSettingsHandlers as setupNewSettingsHandlers } from './modules/settings-handlers-new';
setupNewSettingsHandlers();  // 新版
```

### 階段 2：逐步替換

優先級建議：
1. **Settings API**（最簡單，無複雜邏輯）
2. **Auth API**（簡單，使用頻率低）
3. **Excel Select File**（中等複雜度）
4. **Excel Export APIs**（複雜，使用頻率高）

### 階段 3：清理舊代碼

當所有 API 都遷移完成後：
1. 刪除 `context-bridge/*.bridge.ts` 文件
2. 刪除舊的 handler 文件
3. 更新 `preload.ts`
4. 清理 `IPC_CHANNELS` 枚舉

## 高級功能

### 快取

某些 API 支持快取：

```typescript
// settings.get 自動快取 5 秒
const settings1 = await ipcApi.settings.get({ settingName: 'default' });
// 下次調用會使用快取（如果在 5 秒內）
const settings2 = await ipcApi.settings.get({ settingName: 'default' });
```

### 超時控制

長時間運行的操作設置了超時：

```typescript
// Excel 導出操作預設 60 秒超時
const result = await ipcApi.excel.exportDefault({ settingName: 'default' });
```

### 重試機制

可以為不穩定的操作添加重試：

```typescript
const client = createClient(ipcContracts.someApi, {
  retries: 3,          // 重試 3 次
  retryDelay: 1000,    // 每次重試等待 1 秒
});
```

### 日誌控制

開發環境自動記錄日誌，生產環境可關閉：

```typescript
// main-typed-ipc-handler.ts
import { setLoggerConfig } from './utils/typed-ipc-handler';

setLoggerConfig({
  enabled: process.env.NODE_ENV === 'development',
  logInput: true,
  logOutput: true,
  logError: true,
});
```

## 測試

### Main Process Handler 測試

```typescript
import { setupSettingsHandlers } from '../settings-handlers';
import { ipcMain } from 'electron';

describe('Settings Handlers', () => {
  beforeEach(() => {
    setupSettingsHandlers();
  });

  it('should get settings', async () => {
    const result = await ipcMain.handle(
      'settings/get',
      null as any,
      { settingName: 'default' }
    );

    expect(result).toBeDefined();
  });
});
```

### Renderer Client 測試

```typescript
import { ipcApi } from '../api/ipc-api';

describe('IPC API', () => {
  it('should get settings', async () => {
    const settings = await ipcApi.settings.get({ settingName: 'default' });
    expect(settings).toBeDefined();
  });
});
```

## 常見問題

### Q: 如何添加新的 API？

A: 三個步驟：
1. 在 `shared-ipc-contracts.ts` 中添加契約定義
2. 在對應的 handler 文件中實作
3. 在 `renderer-ipc-api.ts` 中導出

### Q: 如何處理文件上傳等二進制數據？

A: Electron IPC 支持傳輸 Buffer：

```typescript
export const ipcContracts = {
  file: {
    upload: {
      channel: 'file/upload',
    } as IpcContract<
      { fileName: string; data: Buffer },
      { success: boolean }
    >,
  },
};
```

### Q: 如何實現進度回調？

A: 使用事件監聽：

```typescript
// Main Process
import { BrowserWindow } from 'electron';

createHandler(ipcContracts.excel.exportDefault, async (input, context) => {
  const window = BrowserWindow.fromWebContents(context.event.sender);

  // 發送進度
  window?.webContents.send('export-progress', { progress: 0.5 });

  const result = await processExcelData(currentSelectedFilePath);
  return result;
});

// Renderer Process
ipcRenderer.on('export-progress', (_, data) => {
  console.log('Progress:', data.progress);
});
```

### Q: 性能會受影響嗎？

A: 不會。新架構：
- 使用 `ipcMain.handle` 和 `ipcRenderer.invoke`（Electron 原生支持）
- 沒有額外的序列化開銷
- 日誌可在生產環境關閉

## 下一步

1. ✅ 閱讀 `docs/ipc-architecture-optimization.md`
2. ✅ 查看本目錄的範例代碼
3. ⬜ 複製文件到專案
4. ⬜ 選擇一個簡單的 API 開始遷移
5. ⬜ 逐步遷移其他 API
6. ⬜ 享受更好的開發體驗！

## 參考資料

- [Electron IPC 文檔](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [electron-trpc](https://electron-trpc.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
