---
name: spec-driven-development
description: 規格驅動開發流程指南。當需要了解專案開發流程、建立新功能規格、或遵循開發規範時使用此 skill。
user-invocable: false
---

# 規格驅動開發 (Spec-Driven Development)

本專案採用規格驅動開發流程，所有功能開發都必須遵循以下步驟。

## 開發流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                     規格驅動開發循環                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│   │  STEP 1  │    │  STEP 2  │    │  STEP 3  │    │  STEP 4  │     │
│   │   SPEC   │ -> │   DEV    │ -> │   TEST   │ -> │  UPDATE  │     │
│   │  撰寫規格 │    │   開發   │    │   測試   │    │ Checklist│     │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│        │               │               │               │            │
│        ▼               ▼               ▼               ▼            │
│   - FEATURE_SPEC   - 實作程式碼    - E2E 測試     - 更新 Checklist  │
│   - IMPL_PLAN      - 型別定義      - 單元測試     - 記錄問題        │
│   - Checklist      - UI 組件       - 手動驗證     - 標記完成        │
│                    - IPC/API                                        │
│                                                                      │
│   ◄─────────────────── 迭代循環 ────────────────────►               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Step 1: 撰寫規格 (SPEC)

在開始任何開發之前，必須先完成以下文件：

### 1.1 FEATURE_SPEC.md (功能規格書)

- **位置**: `docs/<feature-name>/FEATURE_SPEC.md`
- **內容**:
  - 需求總覽與功能清單
  - 資料結構定義 (TypeScript interface)
  - 處理流程 (偽代碼或流程圖)
  - UI 設計 (ASCII mockup 或 Figma 連結)
  - IPC API 設計
  - 測試案例

### 1.2 IMPLEMENTATION_PLAN.md (實作計畫)

- **位置**: `docs/<feature-name>/IMPLEMENTATION_PLAN.md`
- **內容**:
  - 實作階段總覽
  - 各階段詳細任務
  - 組件設計與代碼範例
  - 檔案變更清單
  - 開發順序

### 1.3 DEVELOPMENT_CHECKLIST.md (開發進度清單)

- **位置**: `docs/<feature-name>/DEVELOPMENT_CHECKLIST.md`
- **內容**:
  - 按階段分組的任務清單
  - 每個任務的檔案路徑
  - 狀態追蹤 (⬜/🔄/✅/⚠️/❌)
  - 測試項目清單
  - 更新記錄

## Step 2: 開發 (DEV)

### 2.1 開發前

- 閱讀並理解 FEATURE_SPEC.md
- 參考 IMPLEMENTATION_PLAN.md 的代碼範例
- 在 DEVELOPMENT_CHECKLIST.md 將任務標記為 🔄 (開發中)

### 2.2 開發順序

1. **型別定義** - `src/shared/*.types.ts`
2. **UI 組件** - 先建立 UI Demo (假資料)
3. **IPC 契約** - `src/shared/ipc-contracts.ts`
4. **IPC Handlers** - `src/main/modules/*-handlers/`
5. **Renderer API** - `src/renderer/api/ipc-api.ts`
6. **商業邏輯** - `src/main/modules/*/services/`
7. **UI 整合** - 連接 UI 到真實 API

### 2.3 開發規範

- 遵循 CLAUDE.md 中的專案規範
- 所有註解使用繁體中文
- 使用類型安全的 IPC 架構
- 優先使用現有的 DataStore 和工具函數

## Step 3: 測試 (TEST)

### 3.1 單元測試

- 測試檔案位置: `src/**/__tests__/*.test.ts`
- 執行命令: `npm test`
- 測試重點: 工具函數、資料處理邏輯、驗證函數

### 3.2 E2E 測試

- 手動測試所有使用者流程
- 驗證各種邊界條件
- 確認錯誤處理正確

## Step 4: 更新 Checklist (UPDATE)

### 4.1 狀態符號

```
⬜ 待開發/待測試
🔄 開發中/測試中
✅ 已完成
⚠️ 有問題/需修改
❌ 已取消/不需要
```

### 4.2 更新記錄

在 DEVELOPMENT_CHECKLIST.md 底部添加更新記錄。

## 參考資料

- 現有範例: `docs/new-feature-1207/`
- IPC 遷移參考: `docs/IPC_FULL_MIGRATION_CHECKLIST.md`
- 專案規範: `CLAUDE.md`
