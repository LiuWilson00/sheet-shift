# IPC 架構遷移範例

本文檔展示如何使用自定義類型安全層遷移現有的兩個 API。

## 範例一：Settings API 遷移

### 原始實作

**IPC Channels**
```typescript
// src/constants/ipc-channels.ts
export enum IPC_CHANNELS {
  SAVE_SETTINGS = 'save-settings',
  SETTINGS_SAVED = 'settings-saved',
  GET_SETTINGS = 'get-settings',
  SETTINGS_RESPONSE = 'settings-response',
  // ...
}
```

**Bridge Layer**
```typescript
// src/main/context-bridge/setting.bridge.ts
function sendSetting(data: Settings, settingName?: string) {
  ipcRenderer.send(IPC_CHANNELS.SAVE_SETTINGS, data, settingName);

  return new Promise<boolean>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.SETTINGS_SAVED, (_event, data) => {
      resolve(data);
    });
  });
}

function getSetting(settingName?: string) {
  ipcRenderer.send(IPC_CHANNELS.GET_SETTINGS, settingName);

  return new Promise<Settings>((resolve, reject) => {
    ipcRenderer.once(IPC_CHANNELS.SETTINGS_RESPONSE, (_event, data) => {
      resolve(data);
    });
  });
}
```

**Handler**
```typescript
// src/main/modules/save-settings-handlers/index.ts
electronIpcMain.on(
  IPC_CHANNELS.SAVE_SETTINGS,
  async (event, data: Settings, settingName?: string) => {
    const result = await saveSettings(data, settingName);
    event.reply(IPC_CHANNELS.SETTINGS_SAVED, result);
  }
);

electronIpcMain.on(
  IPC_CHANNELS.GET_SETTINGS,
  async (event, settingName?: string) => {
    const settings = await getSettings(settingName);
    event.reply(IPC_CHANNELS.SETTINGS_RESPONSE, settings);
  }
);
```

### 新實作

#### 步驟 1：創建共享契約定義

```typescript
// src/shared/ipc-contracts.ts
import { Settings } from '../main/utils/setting.tool';

/**
 * IPC 契約介面
 * TInput: 輸入參數類型
 * TOutput: 輸出結果類型
 */
export interface IpcContract<TInput = void, TOutput = void> {
  channel: string;
  _input?: TInput;
  _output?: TOutput;
}

/**
 * 所有 IPC API 的類型安全契約
 * 集中管理所有 API 定義，確保前後端類型一致
 */
export const ipcContracts = {
  settings: {
    get: {
      channel: 'settings/get',
    } as IpcContract<
      { settingName?: string },
      Settings
    >,

    save: {
      channel: 'settings/save',
    } as IpcContract<
      { data: Settings; settingName?: string },
      boolean
    >,
  },

  excel: {
    selectFile: {
      channel: 'excel/select-file',
    } as IpcContract<
      void,
      { path: string; isError: boolean; message?: string }
    >,
  },
} as const;

export type IpcContracts = typeof ipcContracts;
```

#### 步驟 2：Main Process Helper

```typescript
// src/main/utils/typed-ipc-handler.ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IpcContract } from '../../shared/ipc-contracts';

/**
 * 創建類型安全的 IPC Handler
 *
 * @param contract API 契約定義
 * @param handler 處理函數
 *
 * 自動處理：
 * - 錯誤捕獲和轉換
 * - 類型推導
 * - 日誌記錄（可選）
 */
export function createHandler<TInput, TOutput>(
  contract: IpcContract<TInput, TOutput>,
  handler: (input: TInput, event?: IpcMainInvokeEvent) => Promise<TOutput>
) {
  ipcMain.handle(contract.channel, async (event, input: TInput) => {
    try {
      console.log(`[IPC Handler] ${contract.channel}`, input);
      const result = await handler(input, event);
      console.log(`[IPC Handler] ${contract.channel} ✓`, result);
      return result;
    } catch (error) {
      console.error(`[IPC Handler] ${contract.channel} ✗`, error);
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 批量註冊 handlers
 */
export function registerHandlers(
  handlers: Array<{ contract: IpcContract<any, any>; handler: (input: any) => Promise<any> }>
) {
  handlers.forEach(({ contract, handler }) => {
    createHandler(contract, handler);
  });
}
```

#### 步驟 3：重構 Handlers

```typescript
// src/main/modules/settings-handlers/index.ts
import { createHandler } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import { getSettings, saveSettings } from '../../utils/setting.tool';

/**
 * 設置 Settings 相關的 IPC Handlers
 */
export function setupSettingsHandlers() {
  // GET Settings
  createHandler(ipcContracts.settings.get, async (input) => {
    return await getSettings(input.settingName);
  });

  // SAVE Settings
  createHandler(ipcContracts.settings.save, async (input) => {
    return await saveSettings(input.data, input.settingName);
  });
}
```

#### 步驟 4：Renderer Client Helper

```typescript
// src/renderer/utils/typed-ipc-client.ts
import { ipcRenderer } from 'electron';
import { IpcContract } from '../../shared/ipc-contracts';

/**
 * 創建類型安全的 IPC Client
 *
 * @param contract API 契約定義
 * @returns 返回一個類型安全的調用函數
 */
export function createClient<TInput, TOutput>(
  contract: IpcContract<TInput, TOutput>
) {
  return async (input: TInput): Promise<TOutput> => {
    try {
      console.log(`[IPC Client] ${contract.channel}`, input);
      const result = await ipcRenderer.invoke(contract.channel, input);
      console.log(`[IPC Client] ${contract.channel} ✓`, result);
      return result;
    } catch (error) {
      console.error(`[IPC Client] ${contract.channel} ✗`, error);
      throw error;
    }
  };
}

/**
 * 創建類型安全的 void input client（無參數）
 */
export function createVoidClient<TOutput>(
  contract: IpcContract<void, TOutput>
) {
  return async (): Promise<TOutput> => {
    return await ipcRenderer.invoke(contract.channel);
  };
}
```

#### 步驟 5：創建統一的 API 客戶端

```typescript
// src/renderer/api/ipc-api.ts
import { createClient, createVoidClient } from '../utils/typed-ipc-client';
import { ipcContracts } from '../../shared/ipc-contracts';

/**
 * 統一的類型安全 IPC API
 * 使用方式：import { ipcApi } from '@/api/ipc-api'
 */
export const ipcApi = {
  settings: {
    get: createClient(ipcContracts.settings.get),
    save: createClient(ipcContracts.settings.save),
  },

  excel: {
    selectFile: createVoidClient(ipcContracts.excel.selectFile),
  },
};

// TypeScript 會自動推導類型：
// ipcApi.settings.get 的類型是：
// (input: { settingName?: string }) => Promise<Settings>
```

#### 步驟 6：在 Renderer 中使用

```typescript
// src/renderer/contexts/settings-dialog-context/index.tsx
import { ipcApi } from '../../api/ipc-api';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  const loadSettings = async (settingName?: string) => {
    try {
      // 完全類型安全！TypeScript 會自動提示和檢查
      const result = await ipcApi.settings.get({ settingName });
      setSettings(result);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (data: Settings, settingName?: string) => {
    try {
      // TypeScript 會檢查 data 的類型是否正確
      const success = await ipcApi.settings.save({ data, settingName });
      if (success) {
        await loadSettings(settingName);
      }
      return success;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loadSettings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
```

## 範例二：Excel Select File API 遷移

### 原始實作

```typescript
// Bridge
export function sendSelectExcelFile() {
  ipcRenderer.send(IPC_CHANNELS.SELECT_EXCEL_FILE);

  return new Promise<ExcelDataResult>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.SELECT_EXCEL_FILE_COMPLATED,
      (_event, data: ExcelDataResult) => {
        resolve(data);
      },
    );
  });
}

// Handler
electronIpcMain.on(IPC_CHANNELS.SELECT_EXCEL_FILE, async (event) => {
  try {
    const filePath = await selectExcelFile(mainWindow);
    if (filePath) {
      event.reply(IPC_CHANNELS.SELECT_EXCEL_FILE_COMPLATED, {
        path: filePath,
        isError: false,
      });
    } else {
      event.reply(IPC_CHANNELS.SELECT_EXCEL_FILE_COMPLATED, {
        path: '',
        message: 'No file selected',
        isError: true,
      });
    }
  } catch (error) {
    event.reply(IPC_CHANNELS.SELECT_EXCEL_FILE_COMPLATED, {
      path: '',
      isError: true,
      message: JSON.stringify(error),
    });
  }
});
```

### 新實作

#### 步驟 1：添加契約

```typescript
// src/shared/ipc-contracts.ts
export const ipcContracts = {
  // ... 其他契約

  excel: {
    selectFile: {
      channel: 'excel/select-file',
    } as IpcContract<
      void,
      { path: string; isError: boolean; message?: string }
    >,

    exportDefault: {
      channel: 'excel/export-default',
    } as IpcContract<
      { settingName: string },
      { path: string; data: any[]; isError: boolean; message?: string }
    >,
  },
} as const;
```

#### 步驟 2：重構 Handler

```typescript
// src/main/modules/excel-handlers/index.ts
import { createHandler } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';
import { selectExcelFile, saveProcessedData, processExcelData } from './services/excel-io.service';

let currentSelectedFilePath = '';

export function setupExcelHandlers(mainWindow: BrowserWindow) {
  // Select File
  createHandler(ipcContracts.excel.selectFile, async () => {
    const filePath = await selectExcelFile(mainWindow);

    if (filePath) {
      currentSelectedFilePath = filePath;
      return {
        path: filePath,
        isError: false,
      };
    } else {
      return {
        path: '',
        message: 'No file selected',
        isError: true,
      };
    }
  });

  // Export Default
  createHandler(ipcContracts.excel.exportDefault, async (input) => {
    if (!currentSelectedFilePath) {
      return {
        path: '',
        data: [],
        message: 'No file selected',
        isError: true,
      };
    }

    const completedData = await processExcelData(currentSelectedFilePath);
    const newFilePath = await saveProcessedData(completedData, currentSelectedFilePath);

    return {
      path: newFilePath,
      data: completedData,
      isError: false,
    };
  });
}
```

#### 步驟 3：更新 API 客戶端

```typescript
// src/renderer/api/ipc-api.ts
export const ipcApi = {
  settings: {
    get: createClient(ipcContracts.settings.get),
    save: createClient(ipcContracts.settings.save),
  },

  excel: {
    selectFile: createVoidClient(ipcContracts.excel.selectFile),
    exportDefault: createClient(ipcContracts.excel.exportDefault),
  },
};
```

#### 步驟 4：在組件中使用

```typescript
// src/renderer/pages/home/index.tsx
import { ipcApi } from '../../api/ipc-api';

function Hello() {
  const { showDialog, hideDialog } = useDialog();
  const { showLoading, hideLoading } = useLoading();
  const { settingName } = useSetting();

  const handleSelectFile = async () => {
    showLoading();
    try {
      // 類型安全！result 的類型會被自動推導
      const result = await ipcApi.excel.selectFile();

      if (result.isError) {
        showDialog({
          content: result.message || '上傳失敗，請確認檔案是否正確。',
          onConfirm: hideDialog,
        });
      } else {
        // result.path 的類型是 string
        console.log('Selected file:', result.path);
      }
    } catch (error) {
      showDialog({
        content: '系統錯誤',
        onConfirm: hideDialog,
      });
    } finally {
      hideLoading();
    }
  };

  const handleExport = async () => {
    showLoading();
    try {
      // TypeScript 會檢查參數類型
      const result = await ipcApi.excel.exportDefault({ settingName });

      if (result.isError) {
        showDialog({
          content: result.message || '匯出失敗',
          onConfirm: hideDialog,
        });
      } else {
        showDialog({
          content: `檔案已匯出，檔案路徑：${result.path}`,
          onConfirm: hideDialog,
        });
      }
    } finally {
      hideLoading();
    }
  };

  return (
    <div>
      <button onClick={handleSelectFile}>選擇檔案</button>
      <button onClick={handleExport}>匯出</button>
    </div>
  );
}
```

## 遷移對比總結

### 代碼量對比（以 Settings API 為例）

**舊架構：**
- IPC_CHANNELS: 4 個常量定義
- Bridge: 30 行代碼（2 個函數）
- Handler: 20 行代碼（2 個 handler）
- 總計: ~54 行 + 樣板代碼

**新架構：**
- Contract: 8 行定義
- Handler: 10 行代碼（使用 helper）
- Client: 自動生成
- 總計: ~18 行

**減少代碼量：67%** ✅

### 優勢

1. **類型安全**
   - 編譯時檢查輸入輸出類型
   - 自動補全和提示
   - 重構時自動更新

2. **集中管理**
   - 所有 API 定義在一個文件
   - 易於查找和維護
   - 契約即文檔

3. **減少錯誤**
   - 統一錯誤處理
   - 避免 channel 名稱拼錯
   - 減少 Promise 樣板代碼

4. **更好的開發體驗**
   - 新增 API 只需 3 步：定義契約 → 實現 handler → 使用
   - IDE 自動提示可用的 API
   - 類型錯誤立即發現

## 下一步

1. 在 `src/shared/` 創建 `ipc-contracts.ts`
2. 在 `src/main/utils/` 創建 `typed-ipc-handler.ts`
3. 在 `src/renderer/utils/` 創建 `typed-ipc-client.ts`
4. 在 `src/renderer/api/` 創建 `ipc-api.ts`
5. 逐步遷移現有 API

建議優先遷移：
1. Settings API（最簡單）
2. Excel Select File（中等）
3. 其他 Excel 相關 API（複雜）
