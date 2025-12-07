# IPC 架構遷移指南（安全漸進式）

## ⚠️ 重要安全保證

✅ **100% 向後兼容**：
- 所有舊代碼繼續正常工作
- 新舊系統並行運行，互不影響
- 可以隨時回退，零風險

✅ **隔離策略**：
- 新系統使用不同的 channel 名稱（`settings-v2/*` vs `save-settings`）
- 新文件與舊文件完全分離
- 共享相同的底層工具函數（`getSettings`, `saveSettings`）

## 📋 遷移階段概覽

```
階段 0: Logger 準備        ← ✅ 已完成
  ↓
階段 1: 基礎設施            ← ✅ 已完成（本步驟）
  ↓
階段 2: Settings API 試點   ← 👉 你現在在這裡
  ↓
階段 3: 驗證和測試
  ↓
階段 4: 逐步擴展（未來）
```

## 階段 1：基礎設施搭建（已完成）

以下文件已經創建：

### ✅ 已創建的文件

```
src/
├── shared/
│   └── ipc-contracts.ts                          # IPC 契約定義
├── main/
│   ├── utils/
│   │   ├── logger.tool.ts                        # Logger（Main）
│   │   └── typed-ipc-handler.ts                  # Handler 工具
│   └── modules/
│       ├── logger-handlers/
│       │   └── index.ts                          # Logger Handler
│       └── settings-handlers-v2/
│           └── index.ts                          # Settings V2 Handler
└── renderer/
    ├── utils/
    │   ├── logger.tool.ts                        # Logger（Renderer）
    │   └── typed-ipc-client.ts                   # Client 工具
    └── api/
        └── ipc-api.ts                            # 統一 API 入口
```

### 🔍 與舊系統的對比

| 組件 | 舊系統（保持不變） | 新系統（新增） |
|------|------------------|--------------|
| Channel 定義 | `src/constants/ipc-channels.ts` | `src/shared/ipc-contracts.ts` |
| Bridge | `src/main/context-bridge/setting.bridge.ts` | `src/renderer/api/ipc-api.ts` |
| Handler | `src/main/modules/save-settings-handlers/` | `src/main/modules/settings-handlers-v2/` |
| Channel 名稱 | `save-settings`, `get-settings` | `settings-v2/save`, `settings-v2/get` |

## 階段 2：註冊新系統（安全試點）

### 步驟 1：註冊 Logger Handlers

編輯 `src/main/main.ts`，在文件頂部添加導入：

```typescript
// ============================================
// 🆕 新增：Logger System
// ============================================
import { setupLoggerHandlers } from './modules/logger-handlers';
import { logger } from './utils/logger.tool';
```

在 `app.whenReady()` 中**最早**註冊：

```typescript
app.whenReady().then(() => {
  // ============================================
  // 🆕 步驟 1：首先註冊 Logger
  // ============================================
  setupLoggerHandlers();
  logger.info('='.repeat(60));
  logger.info('Application starting...');
  logger.info('='.repeat(60));

  // ============================================
  // ✅ 原有代碼（保持不變）
  // ============================================
  if (isDebug) {
    await installExtensions();
  }

  mainWindow = createMainWindow();

  // 原有的 handlers（繼續正常工作）
  setupExcelHandlers(mainWindow);
  setupSaveSettingsHandlers(mainWindow);
  setupAppStatusHandlers();
  setupAuthHandlers();

  new AppUpdater();

  logger.info('Application started successfully ✓');
});
```

### 步驟 2：註冊 Settings V2 Handlers（試點）

繼續編輯 `src/main/main.ts`，添加導入：

```typescript
// ============================================
// 🆕 新增：Settings V2 Handlers（試點）
// ============================================
import { setupSettingsHandlersV2 } from './modules/settings-handlers-v2';
```

在舊 handlers 之後註冊：

```typescript
app.whenReady().then(() => {
  setupLoggerHandlers();
  logger.info('Application starting...');

  mainWindow = createMainWindow();

  // ✅ 原有 handlers（繼續工作）
  setupExcelHandlers(mainWindow);
  setupSaveSettingsHandlers(mainWindow);  // ← 舊的，保持不變
  setupAppStatusHandlers();
  setupAuthHandlers();

  // ============================================
  // 🆕 步驟 2：註冊新的 Settings V2 Handlers
  // 與舊系統並行運行，互不影響
  // ============================================
  setupSettingsHandlersV2();  // ← 新的，試點

  logger.info('All handlers registered ✓');
  new AppUpdater();
});
```

### 步驟 3：重啟應用程序

```bash
npm start
```

### 步驟 4：檢查日誌

打開應用後，查看控制台應該看到：

```
[INFO] [Logger Handlers] Registered successfully
[INFO] Application starting...
[INFO] [Excel Handlers] ... (舊系統)
[INFO] [Settings Handlers] ... (舊系統)
[INFO] [Settings V2] Setting up handlers...
[INFO] [IPC Handler] Registered: settings-v2/get
[INFO] [IPC Handler] Registered: settings-v2/save
[INFO] [IPC Handler] Registered: settings-v2/get-sheet
[INFO] [IPC Handler] Registered: settings-v2/save-sheet
[INFO] [Settings V2] All handlers registered successfully ✓
[INFO] All handlers registered ✓
```

✅ 如果看到這些日誌，說明新系統已成功註冊！

## 階段 3：測試新系統

### 測試 1：在開發者工具中測試

1. 打開應用程序
2. 按 `F12` 打開開發者工具
3. 切換到 Console 標籤
4. 輸入以下代碼測試：

```javascript
// ============================================
// 🧪 測試 1：導入新 API
// ============================================
// 注意：需要先在某個組件中導入 ipcApi
// 這裡我們手動測試 IPC

// 測試新的 settings-v2/get
await window.electron.ipcRenderer.invoke('settings-v2/get', { settingName: undefined })
  .then(result => {
    console.log('✅ Settings V2 GET 成功:', result);
  })
  .catch(error => {
    console.error('❌ Settings V2 GET 失敗:', error);
  });

// 測試舊的 IPC（確保仍然工作）
window.electron.settingBridge.getSetting()
  .then(result => {
    console.log('✅ 舊 Settings API 仍然工作:', result);
  });
```

### 測試 2：創建測試組件

創建 `src/renderer/components/test-new-ipc.tsx`：

```typescript
import { useState } from 'react';
import ipcApi from '../api/ipc-api';
import { logger } from '../utils/logger.tool';

export function TestNewIPC() {
  const [result, setResult] = useState<string>('');

  const testGetSettings = async () => {
    logger.info('Testing new IPC API...');

    try {
      // 測試新 API
      const settings = await ipcApi.settingsV2.get({ settingName: undefined });
      setResult('✅ 新 API 成功: ' + JSON.stringify(settings, null, 2));
      logger.info('New API test successful', { settings });
    } catch (error) {
      setResult('❌ 新 API 失敗: ' + (error as Error).message);
      logger.error('New API test failed', error as Error);
    }
  };

  const testOldAPI = async () => {
    logger.info('Testing old API...');

    try {
      // 測試舊 API
      const settings = await window.electron.settingBridge.getSetting();
      setResult('✅ 舊 API 成功: ' + JSON.stringify(settings, null, 2));
      logger.info('Old API test successful', { settings });
    } catch (error) {
      setResult('❌ 舊 API 失敗: ' + (error as Error).message);
      logger.error('Old API test failed', error as Error);
    }
  };

  return (
    <div style={{ padding: '20px', border: '2px solid #4caf50', margin: '20px' }}>
      <h2>🧪 IPC API 測試</h2>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testGetSettings} style={{ marginRight: '10px' }}>
          測試新 API (settingsV2.get)
        </button>
        <button onClick={testOldAPI}>
          測試舊 API (settingBridge.getSetting)
        </button>
      </div>
      <pre style={{ background: '#f5f5f5', padding: '10px' }}>
        {result || '點擊按鈕開始測試...'}
      </pre>
    </div>
  );
}
```

在 `src/renderer/pages/home/index.tsx` 中添加：

```typescript
import { TestNewIPC } from '../../components/test-new-ipc';

function Hello() {
  // ... 原有代碼 ...

  return (
    <div>
      {/* 🆕 添加測試組件（僅開發環境） */}
      {process.env.NODE_ENV === 'development' && <TestNewIPC />}

      {/* ✅ 原有組件（保持不變） */}
      {/* ... 原有的 JSX ... */}
    </div>
  );
}
```

### 測試 3：檢查日誌文件

1. 點擊測試按鈕後
2. 查看日誌文件位置：
   - Windows: `C:\Users\<用戶名>\AppData\Roaming\ElectronReact\logs\`
   - macOS: `~/Library/Application Support/ElectronReact/logs/`

3. 打開最新的 `.log` 文件，應該看到：

```
2025-12-07T12:00:00.000Z | [DEBUG] | [IPC Client] settings-v2/get | Data: {"input":{"settingName":null}}
2025-12-07T12:00:00.050Z | [DEBUG] | [IPC Handler] settings-v2/get | Data: {"input":{"settingName":null}}
2025-12-07T12:00:00.100Z | [DEBUG] | [Settings V2] Getting settings | Data: {"settingName":null}
2025-12-07T12:00:00.150Z | [DEBUG] | [Settings V2] Settings retrieved successfully
2025-12-07T12:00:00.200Z | [DEBUG] | [IPC Handler] settings-v2/get ✓ | Data: {"duration":"150ms"}
2025-12-07T12:00:00.250Z | [DEBUG] | [IPC Client] settings-v2/get ✓ | Data: {"duration":"250ms"}
```

## 階段 4：驗證舊系統仍然工作

### 重要：確保零影響

在應用中執行原有的所有操作：

1. ✅ 選擇 Excel 文件
2. ✅ 導出各種格式
3. ✅ 修改設置並保存
4. ✅ Google Sheets 連接
5. ✅ 登入/登出

**全部功能應該與之前完全一樣！**

如果有任何問題，立即執行回退步驟。

## 🔙 回退方案（零風險）

如果遇到任何問題，只需 3 步回退：

### 步驟 1：註釋掉新代碼

編輯 `src/main/main.ts`：

```typescript
app.whenReady().then(() => {
  // 🔙 註釋掉新系統
  // setupLoggerHandlers();
  // logger.info('Application starting...');

  mainWindow = createMainWindow();

  // ✅ 保留舊系統
  setupExcelHandlers(mainWindow);
  setupSaveSettingsHandlers(mainWindow);
  setupAppStatusHandlers();
  setupAuthHandlers();

  // 🔙 註釋掉新系統
  // setupSettingsHandlersV2();

  new AppUpdater();
});
```

### 步驟 2：移除測試組件

刪除或註釋 `<TestNewIPC />` 組件。

### 步驟 3：重啟應用

```bash
npm start
```

✅ 應用會恢復到原始狀態，完全不受影響。

## 📊 成功標準

新系統成功運行的標誌：

- [ ] 應用正常啟動
- [ ] 控制台顯示新的 handler 註冊日誌
- [ ] 測試組件可以調用新 API
- [ ] 新 API 返回正確的數據
- [ ] 舊 API 繼續正常工作
- [ ] 日誌文件正確記錄所有操作
- [ ] 所有原有功能完全正常

## 🎯 下一步（階段 5）

一旦新系統穩定運行 1-2 天，沒有發現任何問題：

1. 在實際組件中使用新 API（替代舊 bridge）
2. 逐步遷移其他 Settings 相關調用
3. 添加更多 API（Excel, Auth 等）
4. 最終清理舊代碼

## 📝 檢查清單

### 安裝前檢查
- [ ] 已閱讀完整的遷移指南
- [ ] 理解新舊系統並行策略
- [ ] 準備好回退方案

### 安裝步驟
- [ ] 已註冊 Logger Handlers
- [ ] 已註冊 Settings V2 Handlers
- [ ] 應用可以正常啟動

### 測試步驟
- [ ] 在開發者工具中測試成功
- [ ] 測試組件正常工作
- [ ] 日誌文件正確記錄
- [ ] 舊系統完全正常

### 驗證步驟
- [ ] 所有原有功能正常
- [ ] 無控制台錯誤
- [ ] 無性能問題

## ❓ 常見問題

### Q: 如果新 API 調用失敗怎麼辦？

A:
1. 檢查控制台和日誌文件中的錯誤信息
2. 確認 handlers 已正確註冊
3. 使用舊 API 繼續工作（不受影響）
4. 如有需要，執行回退方案

### Q: 日誌文件在哪裡？

A: 使用 `logger.getLogFilePath()` 查看，或參考上面的路徑。

### Q: 新舊系統會沖突嗎？

A: **不會**。它們使用不同的 channel 名稱：
- 舊：`save-settings`
- 新：`settings-v2/save`

### Q: 性能會受影響嗎？

A: **不會**。新系統：
- 使用相同的底層函數
- 開發環境會多一些日誌（可關閉）
- 生產環境幾乎零開銷

## 🆘 需要幫助？

如果遇到任何問題：

1. 查看日誌文件
2. 檢查控制台錯誤
3. 執行回退方案
4. 保存錯誤信息，尋求幫助

---

**記住：安全第一！新舊系統並行，隨時可以回退。** 🛡️
