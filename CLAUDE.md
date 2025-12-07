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
