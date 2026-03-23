# 艙單編號設定檔管理 - 開發進度清單

> 規格文件：[MANIFEST_CONFIG_MANAGEMENT_SPEC.md](./MANIFEST_CONFIG_MANAGEMENT_SPEC.md)

## Phase 1：ManifestListDialog 元件

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 1.1 | 建立 `ManifestListDialog.tsx` - 設定列表 Dialog | ✅ | 列表顯示、空狀態 |
| 1.2 | 列表項目：設定名稱、格式群組數、進度、更新時間 | ✅ | 使用 `formatDescription()` |
| 1.3 | 編輯按鈕（觸發 `onEdit` callback） | ✅ | |
| 1.4 | 刪除按鈕（觸發 `onDelete` callback） | ✅ | |
| 1.5 | 新增設定按鈕（觸發 `onCreate` callback） | ✅ | |
| 1.6 | 從 `index.tsx` export ManifestListDialog | ✅ | |

## Phase 2：CSS 樣式

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 2.1 | `.manifest-list` 列表容器樣式 | ✅ | |
| 2.2 | `.manifest-list__item` 卡片樣式 | ✅ | hover 變色 |
| 2.3 | `.manifest-list__action-btn` 按鈕樣式 | ✅ | 編輯(紫) / 刪除(紅) |
| 2.4 | `.manifest-list__empty` 空狀態樣式 | ✅ | icon + 文字 + 提示 |

## Phase 3：Home 頁面整合

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 3.1 | 新增 `showManifestList` + `editingConfig` 狀態 | ✅ | |
| 3.2 | ⚙️ 按鈕改為開啟 ManifestListDialog | ✅ | |
| 3.3 | 實作 `handleEditConfig` - 關閉 List，開啟 ConfigDialog 帶 existingConfig | ✅ | |
| 3.4 | 實作 `handleDeleteConfig` - showDialog 確認 → API 刪除 → 重載 | ✅ | 含 showCancel |
| 3.5 | 實作 `handleCreateConfig` - 關閉 List，開啟 ConfigDialog 空表單 | ✅ | |
| 3.6 | 修改 `handleSaveManifestConfig` - 儲存後回到 ListDialog | ✅ | |
| 3.7 | ManifestConfigDialog 傳入 `existingConfig={editingConfig}` | ✅ | |

## Phase 4：驗證

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 4.1 | 編譯驗證 `npm run build:renderer` | ✅ | |
| 4.2 | ESLint 檢查（僅檢查修改的檔案） | ✅ | 僅 pre-existing errors |
| 4.3 | 手動測試：列表顯示 | ⬜ | 需用戶驗證 |
| 4.4 | 手動測試：新增 → 列表更新 | ⬜ | 需用戶驗證 |
| 4.5 | 手動測試：編輯 → 儲存 → 列表更新 | ⬜ | 需用戶驗證 |
| 4.6 | 手動測試：刪除 → 確認 → 列表更新 | ⬜ | 需用戶驗證 |

---

## 更新記錄

| 日期 | 說明 |
|------|------|
| 2026-02-10 | 建立開發清單 |
| 2026-02-10 | Phase 1-4 (4.1-4.2) 完成，待用戶手動測試 |
