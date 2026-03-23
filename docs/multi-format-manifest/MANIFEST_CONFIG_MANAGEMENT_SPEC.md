# 艙單編號設定檔管理功能 - 規格文件

> 讓用戶可以新增、檢視、編輯、刪除艙單編號設定檔

## 1. 現況分析

### 後端（已完備）

| 操作 | Handler | IPC Contract | 狀態 |
|------|---------|--------------|------|
| 取得全部 | `getConfigs` | `manifest-number-v2/get-configs` | ✅ |
| 取得單一 | `getConfig` | `manifest-number-v2/get-config` | ✅ |
| 新增/更新 | `saveConfig` | `manifest-number-v2/save-config` | ✅ (upsert) |
| 刪除 | `deleteConfig` | `manifest-number-v2/delete-config` | ✅ |
| 重新載入 | `reload` | `manifest-number-v2/reload` | ✅ |

後端已有完整 CRUD，**不需要修改後端**。

### 前端（缺口）

| 操作 | 現況 | 問題 |
|------|------|------|
| 新增 | ✅ ManifestConfigDialog（建立模式） | 正常 |
| 列表 | ⚠️ 僅 ApplyDialog 下拉選單 | 沒有專門管理介面 |
| 編輯 | ❌ Dialog 有 `existingConfig` prop 但從未傳入 | 無法編輯既有設定 |
| 刪除 | ❌ API 存在但無 UI 觸發 | 無法刪除設定 |

### 目前 UI 進入點

```
Home Page
├── ⚙️ 按鈕 (export-card-wrapper__config-btn)
│   └── 直接開啟 ManifestConfigDialog（建立模式，空表單）
└── 分艙編號 ExportCard
    └── 開啟 ManifestApplyDialog（帶入艙單號）
```

## 2. 設計方案

### 新增 ManifestListDialog 元件

在 ⚙️ 按鈕與 ManifestConfigDialog 之間加入一個**設定檔列表管理 Dialog**：

```
⚙️ 按鈕點擊
└── ManifestListDialog（新增）
    ├── 顯示所有設定檔列表
    ├── 每筆：設定名稱 / 格式群組數 / 當前進度 / 更新時間
    ├── 每筆動作：[編輯] [刪除]
    ├── 底部：[新增設定] 按鈕
    └── 點擊 [編輯] 或 [新增設定]
        └── 開啟 ManifestConfigDialog（帶入 existingConfig 或空）
```

### UI Mockup（文字版）

```
┌─────────────────────────────────────────┐
│  艙單編號設定管理                    ×  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 📋 基本格式                        ││
│  │ 格式群組: 2 組 │ 進度: 群組1 AA01  ││
│  │ 更新: 2026-02-10                   ││
│  │                    [✏️ 編輯] [🗑️]  ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 📋 特殊編號                        ││
│  │ 格式群組: 1 組 │ 進度: 未設定      ││
│  │ 更新: 2026-02-09                   ││
│  │                    [✏️ 編輯] [🗑️]  ││
│  └─────────────────────────────────────┘│
│                                         │
│  尚無設定時顯示空狀態提示              │
│                                         │
├─────────────────────────────────────────┤
│                    [+ 新增設定]  [關閉] │
└─────────────────────────────────────────┘
```

### 刪除確認

刪除時使用現有的 `showDialog` 確認機制：

```
┌─────────────────────────────┐
│ 確定要刪除設定「基本格式」？│
│ 此操作無法復原。            │
│              [取消] [確定]  │
└─────────────────────────────┘
```

## 3. 元件設計

### ManifestListDialog

```typescript
interface ManifestListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  configs: ManifestNumberConfig[];
  onEdit: (config: ManifestNumberConfig) => void;
  onDelete: (settingName: string) => void;
  onCreate: () => void;
}
```

- `configs`: 從 Home 頁面傳入已載入的設定列表
- `onEdit`: 點擊編輯 → Home 開啟 ManifestConfigDialog 並帶入 `existingConfig`
- `onDelete`: 點擊刪除 → Home 呼叫 `ipcApi.manifestNumber.deleteConfig` + 重載列表
- `onCreate`: 點擊新增 → Home 開啟 ManifestConfigDialog（空表單）

### Home 頁面狀態變更

```typescript
// 新增
const [showManifestList, setShowManifestList] = useState(false);
const [editingConfig, setEditingConfig] = useState<ManifestNumberConfig | undefined>();

// ⚙️ 按鈕改為開啟 ListDialog
onClick={() => setShowManifestList(true)}

// ManifestConfigDialog 傳入 existingConfig
<ManifestConfigDialog
  isOpen={showManifestConfig}
  onClose={() => { setShowManifestConfig(false); setEditingConfig(undefined); }}
  onSave={handleSaveManifestConfig}
  existingConfig={editingConfig}
/>
```

### 流程整合

```
⚙️ 按鈕
  → 開啟 ManifestListDialog
    → [新增設定]: setEditingConfig(undefined) + 開啟 ConfigDialog
    → [編輯]:     setEditingConfig(config) + 開啟 ConfigDialog
    → [刪除]:     showDialog 確認 → ipcApi.manifestNumber.deleteConfig → 重載
    → ConfigDialog 儲存後 → 重載列表 → 回到 ListDialog
```

## 4. CSS 樣式

使用現有 `manifest-dialog` 樣式基礎，新增 list 相關 class：

| Class | 用途 |
|-------|------|
| `.manifest-list` | 列表容器 |
| `.manifest-list__item` | 單筆設定卡片 |
| `.manifest-list__item-header` | 設定名稱 |
| `.manifest-list__item-info` | 格式群組數 / 進度 / 更新時間 |
| `.manifest-list__item-actions` | 編輯/刪除按鈕 |
| `.manifest-list__empty` | 空狀態提示 |
| `.manifest-list__action-btn` | 動作按鈕共用樣式 |
| `.manifest-list__action-btn--edit` | 編輯按鈕 |
| `.manifest-list__action-btn--delete` | 刪除按鈕 |

## 5. 修改檔案清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `src/renderer/components/manifest-number-dialog/components/ManifestListDialog.tsx` | **新增** | 設定列表管理 Dialog |
| `src/renderer/components/manifest-number-dialog/index.tsx` | 修改 | export ManifestListDialog |
| `src/renderer/components/manifest-number-dialog/style.css` | 修改 | 新增 list 樣式 |
| `src/renderer/pages/home/index.tsx` | 修改 | 整合 ListDialog，⚙️ 按鈕改為開啟列表 |

**不需要修改的檔案**：
- 後端 handlers（CRUD 已完備）
- IPC contracts（已有 deleteConfig）
- ManifestConfigDialog（已有 `existingConfig` prop）
- ManifestApplyDialog（不影響）

## 6. 注意事項

- 刪除後需重新載入 `manifestConfigs` 狀態
- 如果刪除的是 `selectedManifestConfig`，需重置選擇
- ManifestConfigDialog 儲存後回到 ListDialog，不直接關閉兩個 Dialog
- 空狀態（無任何設定）需友善提示
- 不改動現有 ManifestConfigDialog 邏輯，只透過 `existingConfig` prop 控制
