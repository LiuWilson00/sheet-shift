# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sheet Shift is an Electron desktop application built with React and TypeScript that processes Excel/spreadsheet data for e-commerce logistics. It handles product classification, address cleaning, tariff code mapping, and generates formatted shipping documents for platforms like Shopee and Pegasus.

## Key Technologies

- **Electron** with React (TypeScript)
- **ONNX Runtime** for ML-based product classification
- **ExcelJS** and **xlsx** for spreadsheet processing
- **Google Sheets API** for settings and product mapping
- **Webpack** for bundling

## Development Commands

### Essential Commands
- `npm start` - Start development server (renderer process)
- `npm run start:main` - Start main process with hot reload
- `npm run build` - Build both main and renderer processes for production
- `npm run package` - Create distributable packages for local platform
- `npm run lint` - Run ESLint on codebase
- `npm test` - Run Jest tests

### Individual Build Commands
- `npm run build:main` - Build main process only
- `npm run build:renderer` - Build renderer process only
- `npm run build:dll` - Build development DLLs

## Architecture

### Electron Process Structure

**Main Process** (`src/main/`)
- Entry point: `main.ts`
- IPC handlers organized in `modules/`:
  - `excel-handlers/` - Excel file processing and export logic
  - `auth-handlers/` - Google authentication
  - `save-settings-handlers/` - Settings persistence
  - `app-status-handlers/` - App state management
- Utilities in `utils/`:
  - `model-run/` - ONNX model inference for product classification
  - `google-sheets.tool/` - Google Sheets API integration
  - `bridge.tool/` - Platform-specific bridges
  - `setting.tool.ts` - Settings management

**Renderer Process** (`src/renderer/`)
- React application with single page (`pages/home/`)
- Context providers for state management (loading, dialog, settings, auth)
- Layout component wraps all pages

**Preload Script** (`src/main/preload.ts`)
- Exposes IPC channels to renderer via context bridge

### Data Processing Flow

1. User selects Excel file via dialog (`excel-io.service.ts`)
2. File is processed through data controllers:
   - `processExcelData()` - Default format processing
   - `processExcelDataShopee()` - Shopee-specific format
   - `processExcelDataShopeeNew()` - Updated Shopee format
   - `processExcelDataPegasus()` - Pegasus format via options
3. Product names classified using ONNX model (`model-run/index.ts`)
4. Tariff codes mapped from Google Sheets data
5. Addresses cleaned and formatted
6. Processed data saved to new Excel file with formatting

### ML Model Integration

The app uses an ONNX model (`assets/model.onnx`) for product classification:
- Tokenizer: Character-level Chinese text tokenization
- Model input: Product names from Excel
- Model output: Classified product categories
- Mapping: `id_to_category.json` maps model outputs to product names
- Integration: `src/main/utils/model-run/index.ts`

### Google Sheets Integration

Settings and product mappings stored in Google Sheets:
- Authentication via service account (JWT)
- Sheet ranges defined in `google-sheets.tool/index.const.ts`
- Cached locally in DataStore instances
- Product name mapping: Original → Correct → Tariff Code
- System settings for different export configurations

### IPC Communication

All IPC channels defined in `src/constants/ipc-channels.ts`:
- Excel operations: SELECT_EXCEL_FILE, EXPORT_*_SHEET
- Settings: SAVE_SETTINGS, GET_SETTINGS
- Product mapping: GET_PRODUCT_MAP, ADD_NEW_PRODUCT_MAP
- Classification: GET_CLASSIFY_PRODUCT_NAME
- Auth: LOGIN, LOGOUT

## Important Implementation Notes

### Excel File Processing
- Main processing logic in `src/main/modules/excel-hanlders/services/data-controller.service.ts`
- Different export formats have specific options (e.g., `disableRandomAddress`, `usePegasusSetting`)
- Weight-based pricing controlled via `sheetPricesVersion` option
- Template highlighting controlled via `templateOptions`

### Build Configuration
- `electron-builder` config in `package.json` under `build` key
- IMPORTANT: `asar: false` - Application is NOT packaged in ASAR
- `asarUnpack` includes `.node`, `.dll`, `.xlsx` files
- `afterPack` script copies dependencies (`.erb/scripts/copy-deps.js`)
- Model files in `assets/` directory included via `extraResources`

### Native Dependencies
- `onnxruntime-node` requires native rebuild: `npm run rebuild`
- Uses `electron-builder install-app-deps` during postinstall
- Node loader configured in webpack for `.node` files

## Testing

- Test framework: Jest with ts-jest
- Test environment: jsdom
- Test files should be in `__tests__` directories or use `.test.ts` suffix
- Run specific test: `npm test -- <test-file-pattern>`

## Code Style

- ESLint config extends 'erb' (Electron React Boilerplate)
- TypeScript strict mode enabled
- React JSX transform (no need to import React)
- Unused vars and shadowing enforced via @typescript-eslint

## Common Gotchas

- When modifying the ONNX model or tokenizer, update files in both `src/main/utils/model-run/` and `assets/`
- Google Sheets credentials stored separately - app requires valid service account setup
- Excel file paths must be absolute (Windows paths with backslashes on Windows)
- DataStore instances cache Google Sheets data - update cache when sheets change
- IPC handlers setup happens before window creation in `main.ts` (line 44-47)

## 類型安全 IPC 架構（新系統）

專案包含一個類型安全的 IPC 通訊架構，與舊的 bridge 系統並存運作。

### 架構概覽

```
src/
├── shared/
│   └── ipc-contracts.ts          # IPC 契約定義（類型安全）
├── main/
│   ├── utils/
│   │   ├── logger.tool.ts        # Logger 系統（Main Process）
│   │   └── typed-ipc-handler.ts  # Handler 工具
│   ├── modules/
│   │   ├── logger-handlers/      # Logger IPC Handlers
│   │   └── settings-handlers-v2/ # Settings V2 Handlers（新）
│   └── preload.ts                # Context Bridge（含 invoke 方法）
└── renderer/
    ├── utils/
    │   ├── logger.tool.ts        # Logger 系統（Renderer Process）
    │   └── typed-ipc-client.ts   # Client 工具
    └── api/
        └── ipc-api.ts            # 統一 API 入口
```

### 使用方式

**Renderer 端（前端）**：
```typescript
import ipcApi from '../api/ipc-api';

// 類型安全的調用
const settings = await ipcApi.settingsV2.get({ settingName: undefined });
```

**Main 端（後端）**：
```typescript
import { createHandler } from '../../utils/typed-ipc-handler';
import { ipcContracts } from '../../../shared/ipc-contracts';

createHandler(ipcContracts.settingsV2.get, async (input) => {
  const settings = getSystemSetting(input.settingName);
  return settings;
});
```

### Logger 系統

提供統一的日誌記錄功能：
- 開發環境：輸出到控制台 + 寫入本地檔案
- 生產環境：只記錄 ERROR 級別到檔案
- 自動日誌輪轉（10MB 上限）
- 自動清理舊日誌（保留 7 天）

日誌檔案位置：`%APPDATA%\Electron\logs\`

```typescript
import { logger } from '@/utils/logger.tool';

logger.debug('除錯訊息', { data: 'something' });
logger.info('資訊訊息');
logger.warn('警告訊息');
logger.error('錯誤訊息', error);
```

### 新舊系統共存

新的 IPC 系統使用不同的 channel 名稱，避免與舊系統衝突：
- 舊系統：`save-settings`, `get-settings`
- 新系統：`settings-v2/save`, `settings-v2/get`

## 專案語言規範

- 所有新增的程式碼註解請使用**繁體中文**
- 維護現有程式碼時保持原有語言風格
