---
name: electron-env
description: Electron 測試環境管理。啟動、停止 Electron 應用程式，並將 log 輸出到暫存檔以便除錯。
argument-hint: "[start|stop|status|log|build]"
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep
---

# /electron-env - Electron 測試環境管理

管理 Electron 應用程式的測試環境生命週期。可啟動、停止、查看狀態、讀取 log。

**重要**：所有 Bash 指令必須使用 **bash 語法**（非 cmd.exe），因為 Bash 工具執行的是 bash shell。Windows 路徑使用正斜線 `/` 或跳脫反斜線。

## 使用方式

```
/electron-env              # 顯示當前狀態
/electron-env start        # 建置並啟動 Electron（自動關閉舊實例）
/electron-env stop         # 停止所有 Electron 測試實例
/electron-env status       # 檢查 Electron 是否正在執行
/electron-env log          # 讀取最新的 log 輸出
/electron-env log tail     # 讀取 log 最後 50 行
/electron-env log error    # 搜尋 log 中的 ERROR
/electron-env build        # 僅建置，不啟動
```

## 路徑常數

在執行指令時，使用以下變數值（注意使用正斜線）：

```
PROJECT_ROOT = C:/Users/User/Desktop/projects/sheet-shift
ELECTRON_EXE = $PROJECT_ROOT/node_modules/electron/dist/electron.exe
MAIN_ENTRY = $PROJECT_ROOT/release/app/dist/main/main.js
SCRATCHPAD = 使用當前 session 的 scratchpad 目錄（從系統提示中取得）
LOG_FILE = $SCRATCHPAD/electron-test.log
PID_FILE = $SCRATCHPAD/electron-test.pid
APP_LOG_DIR = $APPDATA/Electron/logs
```

## 執行流程

### 當參數為空或 "status"

並行執行以下檢查：

```bash
# 檢查 electron 程序（注意：tasklist /fi 在 bash 下不可靠，改用 tasklist + grep）
tasklist 2>/dev/null | grep -i electron || echo "NO_ELECTRON_RUNNING"
```

```bash
# 檢查 PID 檔案
test -f "$SCRATCHPAD/electron-test.pid" && cat "$SCRATCHPAD/electron-test.pid" || echo "NO_PID_FILE"
```

```bash
# 檢查 log 檔案
test -f "$SCRATCHPAD/electron-test.log" && ls -lh "$SCRATCHPAD/electron-test.log" || echo "NO_LOG_FILE"
```

```bash
# 檢查建置輸出
test -f "$PROJECT_ROOT/release/app/dist/main/main.js" && echo "BUILT" || echo "NOT_BUILT"
```

輸出格式：
```
Electron 測試環境狀態

| 項目 | 狀態 |
|------|------|
| 程序狀態 | ✅ 執行中 (PID: 12345) / ❌ 未啟動 |
| PID 檔案 | ✅ 存在 / ❌ 不存在 |
| Log 檔案 | ✅ 存在 (25KB) / ❌ 不存在 |
| 建置狀態 | ✅ 已建置 / ⚠️ 未建置 |
```

### 當參數為 "stop"

1. 使用 `taskkill` 終止所有 `electron.exe` 程序
2. 清除 PID 檔案
3. 回報結果

```bash
# 終止所有 electron 程序
taskkill /f /im electron.exe 2>/dev/null || echo "No electron process to kill"
```

```bash
# 清除 PID 檔案
rm -f "$SCRATCHPAD/electron-test.pid"
```

### 當參數為 "build"

1. 執行 `npm run build` 建置 main 和 renderer
2. 回報建置結果

```bash
cd "C:/Users/User/Desktop/projects/sheet-shift" && npm run build
```

超時設定：300000ms（5 分鐘）

### 當參數為 "start"

按照以下步驟**依序**執行：

**步驟 1：停止舊實例**
```bash
taskkill /f /im electron.exe 2>/dev/null || echo "No existing instance"
```

**步驟 2：檢查建置輸出是否存在**
```bash
test -f "C:/Users/User/Desktop/projects/sheet-shift/release/app/dist/main/main.js" && echo "Build exists" || echo "Need build"
```

如果輸出 "Need build"，先執行建置（timeout: 300000）：
```bash
cd "C:/Users/User/Desktop/projects/sheet-shift" && npm run build
```

**步驟 3：啟動 Electron 並將 log 導向暫存檔**

使用 Bash 工具的 `run_in_background: true` 功能啟動：
```bash
cd "C:/Users/User/Desktop/projects/sheet-shift" && NODE_ENV=production "./node_modules/electron/dist/electron.exe" "./release/app/dist/main/main.js" > "$SCRATCHPAD/electron-test.log" 2>&1
```

**步驟 3.5：確保 scratchpad 目錄存在**
```bash
mkdir -p "$SCRATCHPAD"
```

**步驟 4：等待 5 秒後檢查啟動結果**

```bash
sleep 5 && tasklist 2>/dev/null | grep -i electron || echo "NO_ELECTRON_RUNNING"
```

**步驟 5：儲存 PID**

```bash
tasklist 2>/dev/null | grep -i electron | head -1 | awk '{print $2}' > "$SCRATCHPAD/electron-test.pid"
```

**步驟 6：讀取 log 確認啟動**

使用 Read 工具讀取 `$SCRATCHPAD/electron-test.log`

輸出格式：
```
Electron 測試環境已啟動

PID: 12345
Log: $SCRATCHPAD/electron-test.log
狀態: 執行中

使用 /electron-env log 查看 log
使用 /electron-env stop 停止
```

### 當參數為 "log"

讀取 log 檔案內容。根據子參數決定行為：

**基本讀取** (`/electron-env log`)：
使用 Read 工具讀取完整 log 檔案：
```
Read tool: file_path = $SCRATCHPAD/electron-test.log
```

**讀取最後 N 行** (`/electron-env log tail`)：
```bash
tail -50 "$SCRATCHPAD/electron-test.log"
```

**搜尋錯誤** (`/electron-env log error`)：
使用 Grep 工具：
```
Grep tool: pattern="(ERROR|error|warn|WARN|fail|FAIL)" path="$SCRATCHPAD/electron-test.log" output_mode="content"
```

**搜尋特定關鍵字** (`/electron-env log <keyword>`)：
使用 Grep 工具：
```
Grep tool: pattern="<keyword>" path="$SCRATCHPAD/electron-test.log" output_mode="content"
```

**讀取應用程式 logger 輸出** (`/electron-env log app`)：
```bash
ls -lt "$APPDATA/Electron/logs/" 2>/dev/null || echo "No app logs found"
```
然後使用 Read 工具讀取最新的 log 檔案。

## 應用程式 Log 位置

除了 stdout/stderr 導向的暫存 log 外，應用程式自身的 logger 系統也會寫入檔案：

```
%APPDATA%\Electron\logs\
```

查看指令：
```bash
ls -lt "$APPDATA/Electron/logs/" 2>/dev/null
```

## 注意事項

- 啟動時會自動關閉所有 `electron.exe` 程序，包括可能在執行中的開發伺服器
- 此 skill 使用 production 建置來測試，而非 dev 模式
- Log 檔案在每次 `start` 時會被覆蓋
- 如果需要保留舊 log，請先手動備份
- Scratchpad 目錄在不同 session 之間會改變，log 不會跨 session 保留
- 所有 Bash 指令使用 bash 語法，路徑使用正斜線 `/`
