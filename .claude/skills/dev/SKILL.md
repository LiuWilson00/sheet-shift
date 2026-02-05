---
name: dev
description: 規格驅動開發助手。用於檢查開發進度、取得下一步建議、或開始新功能規格撰寫。
argument-hint: "[status|next|spec <feature>|test]"
disable-model-invocation: true
---

# /dev - 規格驅動開發助手

## 使用方式

- `/dev` 或 `/dev status` - 顯示當前開發進度
- `/dev next` - 取得下一步建議
- `/dev spec <feature>` - 開始撰寫新功能規格
- `/dev test` - 執行測試並更新 checklist

## 執行指令

根據 `$ARGUMENTS` 執行對應操作：

### 當參數為空或 "status"

1. 讀取 `docs/` 目錄下所有 `DEVELOPMENT_CHECKLIST.md` 檔案
2. 統計各階段完成度（計算 ⬜/🔄/✅ 數量）
3. 顯示開發狀態摘要

輸出格式：
```
📊 開發進度報告

📁 功能: <feature-name>
├── 第一階段: ✅ 24/24 (100%)
├── 第二階段: 🔄 5/19 (26%)
├── 第三階段: ⬜ 0/27 (0%)
└── 第四階段: ⬜ 0/7 (0%)

⏭️ 下一步: <下一個待完成任務>
```

### 當參數為 "next"

1. 讀取當前的 `DEVELOPMENT_CHECKLIST.md`
2. 找到第一個 ⬜ (待開發) 或 🔄 (開發中) 的任務
3. 讀取對應的 `IMPLEMENTATION_PLAN.md` 取得實作細節
4. 顯示任務詳情和建議的開發步驟

輸出格式：
```
📋 下一個任務

任務: <任務名稱>
檔案: <檔案路徑>
階段: <所在階段>

📝 建議步驟:
1. ...
2. ...

是否開始開發此任務？
```

### 當參數為 "spec <feature>"

1. 建立 `docs/<feature>/` 目錄
2. 建立三個文件框架：
   - `FEATURE_SPEC.md` - 功能規格書模板
   - `IMPLEMENTATION_PLAN.md` - 實作計畫模板
   - `DEVELOPMENT_CHECKLIST.md` - 開發清單模板
3. 引導用戶填寫功能需求

### 當參數為 "test"

1. 執行 `npm test`
2. 讀取 DEVELOPMENT_CHECKLIST.md 中的測試項目
3. 詢問用戶各項手動測試結果
4. 更新測試狀態

## 狀態符號

| 符號 | 意義 |
|------|------|
| ⬜ | 待開發/待測試 |
| 🔄 | 開發中/測試中 |
| ✅ | 已完成 |
| ⚠️ | 有問題/需修改 |
| ❌ | 已取消/不需要 |

## 自動更新 Checklist

當用戶確認完成任務時：

1. 將任務狀態從 ⬜ 改為 ✅
2. 在「更新記錄」區塊添加記錄
3. 顯示下一個待完成任務

## 開發規範參考

開發時自動套用 CLAUDE.md 中的規範：
- 註解使用繁體中文
- 使用類型安全 IPC 架構
- 遵循現有專案結構
