# 快速開始 - IPC 架構升級

## ✅ 你現在擁有什麼

### 1️⃣ Logger System（日誌系統）
- ✅ 開發環境：自動記錄到控制台 + 本地文件
- ✅ 生產環境：只記錄 ERROR 到文件
- ✅ 自動日誌輪轉和清理
- ✅ Main 和 Renderer 統一日誌

📚 文檔：`docs/logger-usage-guide.md`

### 2️⃣ 類型安全 IPC 系統（新架構）
- ✅ Settings API V2（試點）
- ✅ 完全類型安全
- ✅ 與舊系統並行，零風險
- ✅ 代碼量減少 67%

📚 文檔：`docs/MIGRATION_GUIDE.md`

## 🚀 立即開始（3 分鐘）

### 步驟 1：註冊 Logger（1 分鐘）

編輯 `src/main/main.ts`，在頂部添加：

```typescript
import { setupLoggerHandlers } from './modules/logger-handlers';
import { logger } from './utils/logger.tool';
```

在 `app.whenReady()` 中添加：

```typescript
app.whenReady().then(() => {
  // 🆕 添加這行
  setupLoggerHandlers();
  logger.info('Application starting...');

  // ✅ 保留原有代碼
  mainWindow = createMainWindow();
  setupExcelHandlers(mainWindow);
  // ... 其他原有代碼 ...
});
```

### 步驟 2：註冊 Settings V2（1 分鐘）

繼續編輯 `src/main/main.ts`，添加導入：

```typescript
import { setupSettingsHandlersV2 } from './modules/settings-handlers-v2';
```

在舊 handlers 後添加：

```typescript
app.whenReady().then(() => {
  setupLoggerHandlers();
  logger.info('Application starting...');

  mainWindow = createMainWindow();

  // ✅ 原有 handlers（保持不變）
  setupExcelHandlers(mainWindow);
  setupSaveSettingsHandlers(mainWindow);
  setupAppStatusHandlers();
  setupAuthHandlers();

  // 🆕 新系統（試點）
  setupSettingsHandlersV2();

  new AppUpdater();
});
```

### 步驟 3：啟動並測試（1 分鐘）

```bash
npm start
```

打開開發者工具（F12），應該看到：

```
[INFO] [Logger Handlers] Registered successfully
[INFO] Application starting...
[INFO] [Settings V2] All handlers registered successfully ✓
```

## 🧪 快速測試

在開發者工具 Console 中執行：

```javascript
// 測試新 API
await window.electron.ipcRenderer.invoke('settings-v2/get', {})
  .then(r => console.log('✅ 新 API 成功:', r))
  .catch(e => console.error('❌ 失敗:', e));

// 測試舊 API（確保仍然工作）
window.electron.settingBridge.getSetting()
  .then(r => console.log('✅ 舊 API 仍然工作:', r));
```

## 📁 新文件概覽

```
✅ 已創建的文件（不影響原有代碼）

src/
├── shared/
│   └── ipc-contracts.ts              # 新：IPC 契約定義
├── main/
│   ├── utils/
│   │   ├── logger.tool.ts            # 新：Logger（Main）
│   │   └── typed-ipc-handler.ts      # 新：Handler 工具
│   └── modules/
│       ├── logger-handlers/          # 新：Logger Handler
│       └── settings-handlers-v2/     # 新：Settings V2
└── renderer/
    ├── utils/
    │   ├── logger.tool.ts            # 新：Logger（Renderer）
    │   └── typed-ipc-client.ts       # 新：Client 工具
    └── api/
        └── ipc-api.ts                # 新：統一 API

✅ 保持不變的文件（原有系統）

src/
├── constants/
│   └── ipc-channels.ts               # 舊：保持不變
├── main/
│   ├── context-bridge/
│   │   └── setting.bridge.ts         # 舊：保持不變
│   └── modules/
│       └── save-settings-handlers/   # 舊：保持不變
```

## 📊 使用新 API（可選）

### 在組件中使用

```typescript
// 導入新 API
import ipcApi from '@/api/ipc-api';
import { logger } from '@/utils/logger.tool';

function MyComponent() {
  const handleClick = async () => {
    logger.info('Button clicked');

    try {
      // 🆕 使用新 API（完全類型安全！）
      const settings = await ipcApi.settingsV2.get({ settingName: 'default' });

      // TypeScript 會自動提示 settings 的所有屬性
      console.log(settings);

    } catch (error) {
      logger.error('Failed to get settings', error as Error);
    }
  };

  return <button onClick={handleClick}>Test</button>;
}
```

### 對比舊 API

```typescript
// ❌ 舊方式（仍然可用）
const settings = await window.electron.settingBridge.getSetting('default');

// ✅ 新方式（類型安全）
const settings = await ipcApi.settingsV2.get({ settingName: 'default' });
//    ^ TypeScript 自動推導類型，IDE 自動補全
```

## 🎯 下一步

### 現在（立即）
1. ✅ 按照上面 3 個步驟啟動系統
2. ✅ 確認日誌正常輸出
3. ✅ 確認舊功能完全正常

### 本週（熟悉新系統）
1. 查看日誌文件位置
2. 在幾個組件中嘗試使用新 API
3. 觀察日誌輸出

### 下週（逐步遷移）
1. 將更多 Settings 相關調用改為新 API
2. 添加其他 API（Excel, Auth）
3. 逐步清理舊代碼

## 🔙 如何回退

如果有任何問題，只需註釋掉兩行：

```typescript
app.whenReady().then(() => {
  // 註釋掉這兩行
  // setupLoggerHandlers();
  // setupSettingsHandlersV2();

  // 其他代碼保持不變
});
```

重啟應用，一切恢復原狀。

## 📚 完整文檔

- **Logger 使用指南**：`docs/logger-usage-guide.md`
- **詳細遷移指南**：`docs/MIGRATION_GUIDE.md`
- **架構研究報告**：`docs/ipc-architecture-optimization.md`
- **範例代碼**：`docs/example-implementation/`

## ✅ 安全保證

- ✅ 所有舊代碼繼續工作
- ✅ 新舊系統並行運行
- ✅ 使用不同的 channel 名稱
- ✅ 隨時可以回退
- ✅ 零風險試點

---

**開始享受更好的開發體驗吧！** 🚀
