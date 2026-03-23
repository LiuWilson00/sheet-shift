# 艙單編號多組格式設定 - 開發進度清單

> 規格文件：[FEATURE_SPEC.md](./FEATURE_SPEC.md)

## Phase 1：型別與資料層

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 1.1 | 修改 `shared/manifest-number.types.ts` - 新增 FormatGroup, CurrentProgress，改 ManifestNumberConfig | ✅ | 移除 format/blacklist/currentNumber |
| 1.2 | 修改 `shared/ipc-contracts.ts` - 更新 generate output + updateCurrentNumber input 型別 | ✅ | |
| 1.3 | 修改 `main/modules/manifest-number-handlers-v2/index.ts` - toManifestNumberConfig / toSheetFormat | ✅ | 直接使用新格式 |
| 1.4 | 修改 `renderer/types/manifest-number.ts` - 同步型別 + 更新工具函數 | ✅ | |
| 1.5 | 編譯驗證 `npm run build:main` | ✅ | |
| 1.6 | 編譯驗證 `npm run build:renderer` | ✅ | |

## Phase 2：後端多組產生邏輯

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 2.1 | 重構 generate handler - 支援多組循環跳組 | ✅ | getNextValidNumberAcrossGroups() |
| 2.2 | 修改 updateCurrentNumber handler - 接收 CurrentProgress (groupIndex + number) | ✅ | |
| 2.3 | 修改 validate handler - 支援 groupIndex 參數 | ✅ | 嘗試所有群組驗證 |
| 2.4 | 編譯驗證 `npm run build:main` | ✅ | |

## Phase 3：前端設定 UI (ManifestConfigDialog)

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 3.1 | 修改 ManifestConfigDialog - 支援多組 FormatGroup 編輯 | ✅ | 新增/刪除群組，可摺疊區塊 |
| 3.2 | 修改「目前進度」- groupIndex 下拉 + 目前編號 | ✅ | |
| 3.3 | 新增群組相關 CSS 樣式 | ✅ | |
| 3.4 | 編譯驗證 `npm run build:renderer` | ✅ | |

## Phase 4：前端帶入 UI (ManifestApplyDialog)

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 4.1 | 修改 ManifestApplyDialog - 顯示群組資訊 | ✅ | 格式群組數、當前群組 |
| 4.2 | 新增「起始群組」下拉選擇 | ✅ | |
| 4.3 | 更新自訂起始編號驗證（根據選定群組格式） | ✅ | |
| 4.4 | 修改 Home.tsx - 更新 handleManifestApply 傳遞 endGroupIndex | ✅ | |
| 4.5 | 編譯驗證 `npm run build:renderer` | ✅ | |

## Phase 5：整合驗證

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 5.1 | 全量編譯 `npm run build` | ✅ | main + renderer 均通過 |
| 5.2 | ESLint 檢查 | ✅ | 僅剩 pre-existing errors，無新增 |
| 5.3 | 手動測試：建立多組格式設定 | ⬜ | 需用戶驗證 |
| 5.4 | 手動測試：跨組產生編號 | ⬜ | 需用戶驗證 |

---

## 更新記錄

| 日期 | 說明 |
|------|------|
| 2026-02-10 | 建立開發清單 |
| 2026-02-10 | Phase 1-4 完成實作，Phase 5.1-5.2 驗證通過 |
