---
name: writing-skills
description: 撰寫 Claude Code Skills 的規範指南。當用戶要求建立新的 skill、自動化流程、或當發現重複性工作模式需要封裝時，使用此 skill 來正確撰寫新的 skill。
user-invocable: false
---

# 撰寫 Claude Code Skills 規範

本 skill 定義了何時以及如何撰寫新的 Claude Code skills。

## 何時應該撰寫新的 Skill

### 應該撰寫的情況

| 情況 | 範例 | 說明 |
|------|------|------|
| **重複性工作流程** | 部署流程、PR 建立流程 | 相同步驟重複執行超過 3 次 |
| **專案特定規範** | 程式碼風格、命名慣例 | 需要 Claude 始終遵循的規則 |
| **複雜多步驟任務** | 功能開發流程、測試流程 | 容易遺漏步驟的工作 |
| **團隊知識共享** | API 設計模式、錯誤處理慣例 | 團隊成員都需要知道的知識 |
| **用戶明確要求** | 「幫我建立一個 /deploy 命令」 | 用戶直接要求建立 skill |

### 不應該撰寫的情況

| 情況 | 原因 |
|------|------|
| 一次性任務 | 不會重複使用，直接執行即可 |
| 過於簡單的操作 | 如「執行 npm install」，不需要封裝 |
| 已有內建功能 | 如 `/commit`、`/review-pr` 等已內建 |
| 過於通用的指令 | 應該放在 CLAUDE.md 而非 skill |

## Skill 目錄結構

```
.claude/skills/<skill-name>/
├── SKILL.md           # 必需 - 主要說明文件
├── reference.md       # 選填 - 詳細參考資料
├── examples.md        # 選填 - 使用範例
└── templates/         # 選填 - 模板檔案
    └── template.md
```

## SKILL.md 檔案格式

### 必要結構

```yaml
---
name: skill-name
description: 清楚描述此 skill 的用途和使用時機
---

# Skill 內容（Markdown 格式）
```

### Frontmatter 欄位參考

| 欄位 | 必要性 | 說明 | 範例 |
|------|--------|------|------|
| `name` | 建議 | 小寫、連字符、最多 64 字元 | `name: deploy-prod` |
| `description` | **強烈建議** | 用途和使用時機，幫助 Claude 判斷何時調用 | `description: 部署應用程式到生產環境` |
| `argument-hint` | 選填 | 參數提示 | `argument-hint: [environment]` |
| `disable-model-invocation` | 選填 | 設為 true 時只能手動調用 | `disable-model-invocation: true` |
| `user-invocable` | 選填 | 設為 false 時不顯示在 / 菜單 | `user-invocable: false` |
| `allowed-tools` | 選填 | 限制可用工具 | `allowed-tools: Read, Bash(npm *)` |
| `model` | 選填 | 指定使用的模型 | `model: opus` |

### 命名規則

- 使用小寫英文
- 使用連字符 `-` 分隔單詞
- 最多 64 個字元
- 名稱即為 `/` 命令名稱

```
✅ 正確: deploy-prod, fix-issue, run-tests
❌ 錯誤: DeployProd, fix_issue, runTests
```

## Skill 類型與設定建議

### 類型一：參考型 (Reference)

**用途**：提供知識和指南，讓 Claude 自動參考

**設定**：
```yaml
---
name: api-conventions
description: API 設計慣例。當撰寫 API 端點時自動參考此規範。
user-invocable: false
---
```

**特點**：
- `user-invocable: false` - 不需要手動調用
- Claude 會根據 `description` 自動判斷何時使用

### 類型二：任務型 (Task)

**用途**：執行具體操作流程

**設定**：
```yaml
---
name: deploy
description: 部署應用程式到指定環境
argument-hint: [prod|staging]
disable-model-invocation: true
---
```

**特點**：
- `disable-model-invocation: true` - 只能手動調用
- 有明確的執行步驟

### 類型三：混合型 (Hybrid)

**用途**：既可手動調用，也可由 Claude 自動判斷

**設定**：
```yaml
---
name: test-runner
description: 執行測試。當完成程式碼修改後自動執行，或手動調用 /test-runner。
---
```

## 撰寫內容指南

### 結構建議

```markdown
# Skill 名稱

## 用途說明
簡短描述此 skill 的目的

## 使用方式（如果是任務型）
- `/skill-name` - 基本用法
- `/skill-name arg` - 帶參數用法

## 執行步驟（如果是任務型）
1. 第一步
2. 第二步
...

## 規範內容（如果是參考型）
詳細的規範說明...

## 範例
提供具體的使用範例
```

### 變數替換

可在內容中使用以下變數：

| 變數 | 說明 |
|------|------|
| `$ARGUMENTS` | 所有傳入的參數 |
| `$0`, `$1`, `$2`... | 第 N 個參數 |
| `${CLAUDE_SESSION_ID}` | 當前會話 ID |

範例：
```markdown
部署 $ARGUMENTS 到生產環境...
```

## 完整範例

### 範例一：部署 Skill（任務型）

```yaml
---
name: deploy
description: 部署應用程式到指定環境。僅手動調用。
argument-hint: [prod|staging]
disable-model-invocation: true
allowed-tools: Bash(npm *), Bash(git *)
---

# 部署流程

將應用程式部署到 $ARGUMENTS 環境。

## 執行步驟

1. **確認環境**
   - 確認 $ARGUMENTS 是 `prod` 或 `staging`
   - 如果無效，詢問用戶

2. **執行測試**
   ```bash
   npm test
   ```
   - 測試失敗則停止部署

3. **建置應用**
   ```bash
   npm run build
   ```

4. **部署**
   - staging: `npm run deploy:staging`
   - prod: 需用戶確認後執行 `npm run deploy:prod`

5. **驗證**
   - 檢查部署狀態
   - 回報結果
```

### 範例二：程式碼規範 Skill（參考型）

```yaml
---
name: code-style
description: 專案程式碼風格規範。撰寫或修改程式碼時自動參考。
user-invocable: false
---

# 程式碼風格規範

## TypeScript

- 使用 interface 而非 type（除非需要 union）
- 函數參數超過 3 個時使用物件參數
- 所有 export 函數需要 JSDoc 註解

## React

- 使用函數組件 + hooks
- Props 介面命名：`ComponentNameProps`
- 狀態管理優先使用 Context

## 命名

- 檔案：kebab-case (`user-profile.tsx`)
- 組件：PascalCase (`UserProfile`)
- 函數：camelCase (`getUserProfile`)
- 常數：UPPER_SNAKE_CASE (`API_BASE_URL`)
```

## 建立 Skill 的步驟

當需要建立新 skill 時，執行以下步驟：

1. **確認需求**
   - 確認符合「應該撰寫」的情況
   - 確認沒有現成的 skill 可用

2. **決定類型**
   - 參考型：設定 `user-invocable: false`
   - 任務型：設定 `disable-model-invocation: true`
   - 混合型：使用預設設定

3. **建立目錄結構**
   ```bash
   mkdir -p .claude/skills/<skill-name>
   ```

4. **撰寫 SKILL.md**
   - 撰寫 frontmatter
   - 撰寫內容

5. **測試**
   - 如果是用戶可調用的，測試 `/skill-name`
   - 確認 Claude 能正確理解和執行

## 維護建議

- 定期檢視現有 skills 是否仍然適用
- 合併相似的 skills
- 移除不再使用的 skills
- 更新過時的內容
