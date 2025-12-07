# IPC 架構優化研究報告

## 當前架構分析

### 現有實作模式

我們的專案使用傳統的 Electron IPC 模式，分為三層：

#### 1. IPC Channels 定義 (`src/constants/ipc-channels.ts`)
```typescript
export enum IPC_CHANNELS {
  SELECT_EXCEL_FILE = 'select-excel-file',
  SELECT_EXCEL_FILE_COMPLATED = 'select-excel-file-complated',
  // ...更多 channel 定義
}
```

#### 2. Context Bridge API (`src/main/context-bridge/*.bridge.ts`)
```typescript
// excel.bridge.ts
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
```

#### 3. Main Process Handlers (`src/main/modules/*-handlers/`)
```typescript
// excel-handlers/index.ts
electronIpcMain.on(IPC_CHANNELS.SELECT_EXCEL_FILE, async (event) => {
  try {
    const filePath = await selectExcelFile(mainWindow);
    event.reply(IPC_CHANNELS.SELECT_EXCEL_FILE_COMPLATED, {
      path: filePath,
      isError: false,
    });
  } catch (error) {
    event.reply(IPC_CHANNELS.SELECT_EXCEL_FILE_COMPLATED, {
      isError: true,
      message: JSON.stringify(error),
    });
  }
});
```

#### 4. Renderer 使用方式
```typescript
// pages/home/index.tsx
const result = await window.electron.excelBridge.sendSelectExcelFile();
if (result.isError) {
  // 處理錯誤
}
```

### 當前架構的問題

1. **重複的樣板代碼**
   - 每個 API 都需要定義：請求 channel + 響應 channel
   - Bridge 層需要手動創建 Promise 並監聽響應
   - Handler 層需要手動 try-catch 並 reply

2. **類型安全不足**
   - Request 和 Response 的類型定義分散
   - Channel 名稱是字符串，容易拼錯
   - 無法自動推導返回類型

3. **錯誤處理不一致**
   - 每個 handler 都要重複寫錯誤處理邏輯
   - 錯誤格式不統一

4. **維護成本高**
   - 新增一個 API 需要修改 4 個地方：
     - IPC_CHANNELS 枚舉
     - Bridge 函數
     - Handler 註冊
     - 類型定義

## 解決方案研究

### 方案一：electron-trpc（推薦）

#### 優勢
- ✅ 端到端類型安全（TypeScript 自動推導）
- ✅ 零樣板代碼
- ✅ 支持查詢、變更和訂閱
- ✅ 與 React Query 等庫完美整合
- ✅ 內建錯誤處理

#### 基本實作

**1. 定義 Router (Main Process)**
```typescript
// src/main/trpc/router.ts
import { initTRPC } from '@trpc/server';

const t = initTRPC.create();

export const appRouter = t.router({
  excel: t.router({
    selectFile: t.procedure
      .output(z.object({
        path: z.string(),
        isError: z.boolean(),
        message: z.string().optional(),
      }))
      .query(async () => {
        const filePath = await selectExcelFile(mainWindow);
        return { path: filePath, isError: false };
      }),

    exportDefault: t.procedure
      .input(z.object({ settingName: z.string() }))
      .mutation(async ({ input }) => {
        const completedData = await processExcelData(currentSelectedFilePath.get());
        const newFilePath = await saveProcessedData(completedData, currentSelectedFilePath.get());
        return { path: newFilePath, data: completedData, isError: false };
      }),
  }),

  settings: t.router({
    get: t.procedure
      .input(z.object({ settingName: z.string().optional() }))
      .query(async ({ input }) => {
        return await getSettings(input.settingName);
      }),

    save: t.procedure
      .input(z.object({
        data: settingsSchema,
        settingName: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        await saveSettings(input.data, input.settingName);
        return true;
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

**2. Main Process Setup**
```typescript
// src/main/main.ts
import { createIPCHandler } from 'electron-trpc/main';
import { appRouter } from './trpc/router';

app.whenReady().then(() => {
  const mainWindow = createMainWindow();
  createIPCHandler({ router: appRouter, windows: [mainWindow] });
});
```

**3. Preload Script**
```typescript
// src/main/preload.ts
import { exposeElectronTRPC } from 'electron-trpc/main';

process.once('loaded', async () => {
  exposeElectronTRPC();
});
```

**4. Renderer Client**
```typescript
// src/renderer/utils/trpc.ts
import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';
import type { AppRouter } from '../../main/trpc/router';

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [ipcLink()],
});
```

**5. 使用方式**
```typescript
// src/renderer/pages/home/index.tsx
// 完全類型安全，自動補全！
const result = await trpc.excel.selectFile.query();
// result 的類型會自動推導為 { path: string; isError: boolean; message?: string }

const exportResult = await trpc.excel.exportDefault.mutate({
  settingName: 'default'
});

// 訂閱更新
const settings = await trpc.settings.get.query({ settingName: 'sheet' });
```

#### 遷移策略
1. 安裝依賴：`npm install @trpc/server @trpc/client electron-trpc zod`
2. 逐步遷移：可以與現有 IPC 共存
3. 先遷移新功能，再逐步重構舊代碼

### 方案二：自定義類型安全 IPC 層（中等複雜度）

如果不想引入 tRPC 依賴，可以實現簡化版的類型安全 IPC。

#### 核心概念

```typescript
// src/shared/ipc-contracts.ts
export interface IpcContract<TInput = void, TOutput = void> {
  channel: string;
  _input?: TInput;
  _output?: TOutput;
}

// 定義所有 API 契約
export const ipcContracts = {
  excel: {
    selectFile: {
      channel: 'excel/select-file',
    } as IpcContract<void, { path: string; isError: boolean }>,

    exportDefault: {
      channel: 'excel/export-default',
    } as IpcContract<{ settingName: string }, { path: string; data: any[]; isError: boolean }>,
  },

  settings: {
    get: {
      channel: 'settings/get',
    } as IpcContract<{ settingName?: string }, Settings>,

    save: {
      channel: 'settings/save',
    } as IpcContract<{ data: Settings; settingName?: string }, boolean>,
  },
} as const;
```

**Main Process Helper**
```typescript
// src/main/utils/ipc-helper.ts
import { ipcMain, IpcMainEvent } from 'electron';

export function createHandler<TInput, TOutput>(
  contract: IpcContract<TInput, TOutput>,
  handler: (input: TInput) => Promise<TOutput>
) {
  ipcMain.handle(contract.channel, async (_event, input: TInput) => {
    try {
      return await handler(input);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  });
}

// 使用
createHandler(ipcContracts.excel.selectFile, async () => {
  const filePath = await selectExcelFile(mainWindow);
  return { path: filePath, isError: false };
});

createHandler(ipcContracts.excel.exportDefault, async (input) => {
  const completedData = await processExcelData(currentSelectedFilePath.get());
  const newFilePath = await saveProcessedData(completedData, currentSelectedFilePath.get());
  return { path: newFilePath, data: completedData, isError: false };
});
```

**Renderer Client Helper**
```typescript
// src/renderer/utils/ipc-client.ts
import { ipcRenderer } from 'electron';

export function createClient<TInput, TOutput>(
  contract: IpcContract<TInput, TOutput>
) {
  return async (input: TInput): Promise<TOutput> => {
    return await ipcRenderer.invoke(contract.channel, input);
  };
}

// 創建類型安全的客戶端
export const ipcClient = {
  excel: {
    selectFile: createClient(ipcContracts.excel.selectFile),
    exportDefault: createClient(ipcContracts.excel.exportDefault),
  },
  settings: {
    get: createClient(ipcContracts.settings.get),
    save: createClient(ipcContracts.settings.save),
  },
};

// 使用
const result = await ipcClient.excel.selectFile();
// result 類型會自動推導為 { path: string; isError: boolean }
```

#### 優勢
- ✅ 類型安全
- ✅ 集中管理 API 契約
- ✅ 減少樣板代碼
- ✅ 不需要額外依賴

#### 劣勢
- ⚠️ 需要手動維護契約定義
- ⚠️ 無內建驗證（需要額外加 zod）
- ⚠️ 功能不如 tRPC 豐富

### 方案三：保持現狀但改進（最小改動）

如果不想大規模重構，可以通過工具函數減少樣板代碼：

```typescript
// src/main/utils/ipc-helper.ts
export function createIpcHandler<TInput, TOutput>(
  requestChannel: string,
  responseChannel: string,
  handler: (input: TInput) => Promise<TOutput>
) {
  ipcMain.on(requestChannel, async (event, input: TInput) => {
    try {
      const result = await handler(input);
      event.reply(responseChannel, { isError: false, data: result });
    } catch (error) {
      event.reply(responseChannel, {
        isError: true,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

// src/renderer/utils/ipc-client.ts
export function createIpcClient<TInput, TOutput>(
  requestChannel: string,
  responseChannel: string
) {
  return (input: TInput): Promise<{ isError: boolean; data?: TOutput; message?: string }> => {
    return new Promise((resolve) => {
      ipcRenderer.once(responseChannel, (_event, result) => {
        resolve(result);
      });
      ipcRenderer.send(requestChannel, input);
    });
  };
}
```

## 建議方案對比

| 特性 | electron-trpc | 自定義類型安全層 | 改進現狀 |
|------|--------------|----------------|---------|
| 類型安全 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| 開發體驗 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 學習曲線 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 維護成本 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 遷移難度 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 功能豐富度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

## 推薦實施計畫

### 階段一：試點（1-2 週）
1. 選擇方案二（自定義類型安全層）作為起點
2. 實現核心 IPC 封裝工具
3. 遷移 1-2 個簡單接口（如 settings 相關）
4. 驗證可行性和團隊接受度

### 階段二：逐步遷移（2-4 週）
1. 遷移所有新功能使用新架構
2. 逐步重構現有 excel 相關接口
3. 更新文檔和範例

### 階段三：考慮升級（可選）
1. 如果團隊滿意類型安全效果
2. 評估升級到 electron-trpc
3. 獲得更好的開發體驗和生態系統支持

## 範例實作

下一節將提供具體的代碼範例，展示如何遷移現有的兩個接口：
1. Settings API (GET/SAVE)
2. Excel Select File API
