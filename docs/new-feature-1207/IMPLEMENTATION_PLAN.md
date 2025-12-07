# 海運表單系統修改 - 實作計畫

**版本**: 1.1
**日期**: 2025-12-07
**策略**: UI First - 先建立完整的 UI Demo，後整合商業邏輯

---

## 實作階段總覽

```
┌─────────────────────────────────────────────────────────────────────┐
│  第一階段：UI Demo & 體驗優化                                        │
│  ├─ 1.1 現有 UI 優化                                                │
│  ├─ 1.2 按鈕 UI 重構                                                │
│  ├─ 1.3 艙單編號設定 Dialog                                         │
│  └─ 1.4 艙單編號帶入 Dialog                                         │
├─────────────────────────────────────────────────────────────────────┤
│  第二階段：基礎設施                                                  │
│  ├─ 2.1 Google Sheets 新增資料表                                    │
│  └─ 2.2 資料存取層建立                                              │
├─────────────────────────────────────────────────────────────────────┤
│  第三階段：商業邏輯整合                                              │
│  ├─ 3.1 收貨人資訊 & 問題件功能                                     │
│  ├─ 3.2 台北港格式邏輯                                              │
│  ├─ 3.3 高雄超峰格式邏輯                                            │
│  └─ 3.4 艙單編號產生邏輯                                            │
├─────────────────────────────────────────────────────────────────────┤
│  第四階段：測試與完善                                                │
│  ├─ 4.1 單元測試                                                    │
│  ├─ 4.2 整合測試                                                    │
│  └─ 4.3 UI/UX 微調                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 第一階段：UI Demo & 體驗優化

### 1.1 現有 UI 優化

#### 1.1.1 問題分析

| 問題 | 現況 | 改善方案 |
|------|------|---------|
| Header 按鈕擁擠 | 按鈕平鋪在左上角 | 分組整理，加入圖示 |
| 匯出按鈕不明確 | 5個按鈕橫向排列，不易區分 | 分組 + 卡片式設計 |
| 無操作流程引導 | 用戶需自行摸索 | 添加步驟提示 |
| 設定入口不明顯 | 設定按鈕混在一起 | 統一放到 Header 右側 |

#### 1.1.2 新 Layout 設計

```
┌─────────────────────────────────────────────────────────────────────┐
│ [LOGO] Sheet Shift                     [系統設定▼] [連線設定] [👤]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                        ┌─────────────────┐                          │
│                        │   📁 上傳檔案    │                          │
│                        │  (點擊或拖拽)    │                          │
│                        └─────────────────┘                          │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  已上傳: example.xlsx                              [重新上傳]       │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  步驟一：資料前處理                                          │   │
│  │  ┌─────────────────┐  ☑ 智能辨識  ☑ 批量智能辨識           │   │
│  │  │  進行資料前處理  │                                        │   │
│  │  └─────────────────┘                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  步驟二：選擇匯出格式                                        │   │
│  │                                                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │   │
│  │  │ 台北港   │  │ 高雄超峰  │  │  蝦皮    │                  │   │
│  │  │  格式    │  │   格式   │  │  格式    │                  │   │
│  │  └──────────┘  └──────────┘  └──────────┘                  │   │
│  │                                                              │   │
│  │  ┌──────────┐  ┌──────────┐                                │   │
│  │  │ 蝦皮(new)│  │   天馬   │                                │   │
│  │  │  格式    │  │  格式    │                                │   │
│  │  └──────────┘  └──────────┘                                │   │
│  │                                                              │   │
│  │  ─────────────────────────────────────────────────────────  │   │
│  │  [🔢 設定艙單編號] [📋 帶入艙單編號]                         │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 1.1.3 Header 優化

```tsx
// 新的 Header 結構
<header className="layout-header">
  <div className="header-left">
    <span className="logo">Sheet Shift</span>
  </div>

  <div className="header-right">
    <Select
      label="系統設定"
      items={systemSettingNames}
      onChange={handleSettingChange}
    />
    <button className="header-btn" onClick={handleConnectionSettings}>
      <IconSettings /> 連線設定
    </button>
    <button className="header-btn" onClick={handleSystemSettings}>
      <IconCog /> 系統設定
    </button>
    <div className="user-info">
      <IconUser /> {userName}
    </div>
  </div>
</header>
```

#### 1.1.4 CSS 變數系統

```css
/* 建立統一的設計系統 */
:root {
  /* 顏色 */
  --color-primary: #7a2c9e;
  --color-primary-light: #9b4dca;
  --color-secondary: #dd5789;
  --color-accent: #fedc2a;
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-danger: #dc3545;

  /* 背景 */
  --bg-gradient: linear-gradient(200.96deg, #fedc2a -29.09%, #dd5789 51.77%, #7a2c9e 129.35%);
  --bg-card: rgba(255, 255, 255, 0.95);
  --bg-card-hover: rgba(255, 255, 255, 1);

  /* 陰影 */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 8px 28px rgba(24, 39, 75, 0.12);

  /* 圓角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* 間距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 字體 */
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
}
```

---

### 1.2 按鈕 UI 重構

#### 1.2.1 匯出按鈕卡片設計

```tsx
// 新的 ExportCard 組件
interface ExportCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;  // 例如 "NEW"
}

const ExportCard: React.FC<ExportCardProps> = ({
  title,
  description,
  icon,
  onClick,
  disabled,
  badge,
}) => (
  <button
    className={`export-card ${disabled ? 'disabled' : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    {badge && <span className="export-card-badge">{badge}</span>}
    <div className="export-card-icon">{icon}</div>
    <div className="export-card-content">
      <h3 className="export-card-title">{title}</h3>
      {description && <p className="export-card-desc">{description}</p>}
    </div>
  </button>
);
```

#### 1.2.2 匯出按鈕配置

```tsx
const exportOptions = [
  {
    id: 'taipei-bay',
    title: '台北港格式',
    description: '標準海運報關格式',
    icon: <IconShip />,
    onClick: exportTaipeiBay,
  },
  {
    id: 'kaohsiung-chaofeng',
    title: '高雄超峰格式',
    description: '自動均攤毛重、調整金額',
    icon: <IconTruck />,
    badge: 'NEW',
    onClick: exportKaohsiungChaofeng,
  },
  {
    id: 'shopee',
    title: '蝦皮格式',
    description: '蝦皮平台專用',
    icon: <IconShopee />,
    onClick: exportShopeeFormat,
  },
  {
    id: 'shopee-new',
    title: '蝦皮格式 (New)',
    description: '新版蝦皮格式',
    icon: <IconShopee />,
    onClick: exportShopeeFormatNew,
  },
  {
    id: 'pegasus',
    title: '天馬格式',
    description: '天馬物流專用',
    icon: <IconPegasus />,
    onClick: exportPegasusSheet,
  },
];
```

#### 1.2.3 ExportCard 樣式

```css
.export-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 120px;
  padding: var(--spacing-md);
  background: var(--bg-card);
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.export-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  background: var(--bg-card-hover);
}

.export-card:active {
  transform: translateY(0);
}

.export-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-card-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  padding: 2px 8px;
  background: var(--color-danger);
  color: white;
  font-size: 10px;
  font-weight: bold;
  border-radius: 10px;
}

.export-card-icon {
  font-size: 32px;
  margin-bottom: var(--spacing-sm);
  color: var(--color-primary);
}

.export-card-title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 600;
  color: #333;
}

.export-card-desc {
  margin: 4px 0 0;
  font-size: var(--font-size-sm);
  color: #666;
  text-align: center;
}
```

---

### 1.3 艙單編號設定 Dialog

#### 1.3.1 組件結構

```
src/renderer/components/manifest-number-dialog/
├── index.tsx                    # 主要入口，管理兩個 Dialog
├── ManifestConfigDialog.tsx     # 設定 Dialog
├── ManifestApplyDialog.tsx      # 帶入 Dialog
├── components/
│   ├── SegmentEditor.tsx        # 區段編輯器
│   ├── BlacklistEditor.tsx      # 黑名單編輯器
│   ├── NumberPreview.tsx        # 預覽組件
│   └── SegmentItem.tsx          # 單個區段項目
└── style.css
```

#### 1.3.2 ManifestConfigDialog UI

```tsx
interface ManifestConfigDialogProps {
  show: boolean;
  onClose: () => void;
  onSave: (config: ManifestNumberConfig) => void;
  initialConfig?: ManifestNumberConfig;
}

const ManifestConfigDialog: React.FC<ManifestConfigDialogProps> = ({
  show,
  onClose,
  onSave,
  initialConfig,
}) => {
  const [configName, setConfigName] = useState('');
  const [segments, setSegments] = useState<FormatSegment[]>([
    { type: 'alpha', length: 3 },
    { type: 'numeric', length: 2 },
  ]);
  const [blacklistRanges, setBlacklistRanges] = useState<BlacklistRange[]>([]);
  const [blacklistSingles, setBlacklistSingles] = useState<string[]>([]);

  // 計算預覽
  const preview = useMemo(() => generatePreview(segments), [segments]);
  const totalCount = useMemo(() => calculateTotalCount(segments), [segments]);

  return (
    <Dialog
      title="艙單編號設定"
      show={show}
      onClose={onClose}
      width="600px"
      height="auto"
    >
      <div className="manifest-config">
        {/* 設定名稱 */}
        <div className="form-group">
          <label>設定名稱</label>
          <Input
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="例如：台北港編號"
          />
        </div>

        {/* 格式定義 */}
        <div className="form-section">
          <h3>格式定義</h3>
          <SegmentEditor
            segments={segments}
            onChange={setSegments}
          />
        </div>

        {/* 預覽 */}
        <div className="preview-section">
          <NumberPreview
            preview={preview}
            totalCount={totalCount}
          />
        </div>

        {/* 黑名單設定 */}
        <div className="form-section">
          <h3>黑名單設定</h3>
          <BlacklistEditor
            ranges={blacklistRanges}
            singles={blacklistSingles}
            onRangesChange={setBlacklistRanges}
            onSinglesChange={setBlacklistSingles}
            format={segments}
          />
        </div>

        {/* 按鈕 */}
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={handleSave}>
            儲存設定
          </button>
        </div>
      </div>
    </Dialog>
  );
};
```

#### 1.3.3 SegmentEditor 組件

```tsx
interface SegmentEditorProps {
  segments: FormatSegment[];
  onChange: (segments: FormatSegment[]) => void;
}

const SegmentEditor: React.FC<SegmentEditorProps> = ({
  segments,
  onChange,
}) => {
  const addSegment = () => {
    onChange([...segments, { type: 'alpha', length: 1 }]);
  };

  const removeSegment = (index: number) => {
    onChange(segments.filter((_, i) => i !== index));
  };

  const updateSegment = (index: number, updates: Partial<FormatSegment>) => {
    onChange(segments.map((seg, i) =>
      i === index ? { ...seg, ...updates } : seg
    ));
  };

  const moveSegment = (index: number, direction: 'up' | 'down') => {
    const newSegments = [...segments];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSegments[index], newSegments[targetIndex]] =
      [newSegments[targetIndex], newSegments[index]];
    onChange(newSegments);
  };

  return (
    <div className="segment-editor">
      <button className="btn-add" onClick={addSegment}>
        + 新增區段
      </button>

      <div className="segment-list">
        {segments.map((segment, index) => (
          <SegmentItem
            key={index}
            index={index}
            segment={segment}
            isFirst={index === 0}
            isLast={index === segments.length - 1}
            onUpdate={(updates) => updateSegment(index, updates)}
            onRemove={() => removeSegment(index)}
            onMoveUp={() => moveSegment(index, 'up')}
            onMoveDown={() => moveSegment(index, 'down')}
          />
        ))}
      </div>
    </div>
  );
};
```

#### 1.3.4 SegmentItem 組件

```tsx
interface SegmentItemProps {
  index: number;
  segment: FormatSegment;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updates: Partial<FormatSegment>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const SegmentItem: React.FC<SegmentItemProps> = ({
  index,
  segment,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => (
  <div className="segment-item">
    <span className="segment-label">區段 {index + 1}:</span>

    <div className="segment-type">
      <label>
        <input
          type="radio"
          checked={segment.type === 'alpha'}
          onChange={() => onUpdate({ type: 'alpha' })}
        />
        英文
      </label>
      <label>
        <input
          type="radio"
          checked={segment.type === 'numeric'}
          onChange={() => onUpdate({ type: 'numeric' })}
        />
        數字
      </label>
    </div>

    <div className="segment-length">
      <label>位數:</label>
      <select
        value={segment.length}
        onChange={(e) => onUpdate({ length: Number(e.target.value) })}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>

    <div className="segment-actions">
      <button
        className="btn-icon"
        onClick={onMoveUp}
        disabled={isFirst}
        title="上移"
      >
        ↑
      </button>
      <button
        className="btn-icon"
        onClick={onMoveDown}
        disabled={isLast}
        title="下移"
      >
        ↓
      </button>
      <button
        className="btn-icon btn-danger"
        onClick={onRemove}
        title="刪除"
      >
        ✕
      </button>
    </div>
  </div>
);
```

#### 1.3.5 NumberPreview 組件

```tsx
interface NumberPreviewProps {
  preview: {
    first: string;
    second: string;
    last: string;
  };
  totalCount: number;
}

const NumberPreview: React.FC<NumberPreviewProps> = ({
  preview,
  totalCount,
}) => (
  <div className="number-preview">
    <div className="preview-sequence">
      <span className="preview-item">{preview.first}</span>
      <span className="preview-arrow">→</span>
      <span className="preview-item">{preview.second}</span>
      <span className="preview-arrow">→</span>
      <span className="preview-dots">...</span>
      <span className="preview-arrow">→</span>
      <span className="preview-item">{preview.last}</span>
    </div>
    <div className="preview-count">
      總數量: <strong>{totalCount.toLocaleString()}</strong> 個編號
    </div>
  </div>
);
```

#### 1.3.6 BlacklistEditor 組件

```tsx
interface BlacklistEditorProps {
  ranges: BlacklistRange[];
  singles: string[];
  onRangesChange: (ranges: BlacklistRange[]) => void;
  onSinglesChange: (singles: string[]) => void;
  format: FormatSegment[];
}

const BlacklistEditor: React.FC<BlacklistEditorProps> = ({
  ranges,
  singles,
  onRangesChange,
  onSinglesChange,
  format,
}) => {
  const [newSingle, setNewSingle] = useState('');

  const addRange = () => {
    onRangesChange([...ranges, { start: '', end: '' }]);
  };

  const updateRange = (index: number, field: 'start' | 'end', value: string) => {
    onRangesChange(ranges.map((r, i) =>
      i === index ? { ...r, [field]: value.toUpperCase() } : r
    ));
  };

  const removeRange = (index: number) => {
    onRangesChange(ranges.filter((_, i) => i !== index));
  };

  const addSingle = () => {
    if (newSingle && !singles.includes(newSingle.toUpperCase())) {
      onSinglesChange([...singles, newSingle.toUpperCase()]);
      setNewSingle('');
    }
  };

  const removeSingle = (value: string) => {
    onSinglesChange(singles.filter((s) => s !== value));
  };

  return (
    <div className="blacklist-editor">
      {/* 區間排除 */}
      <div className="blacklist-section">
        <div className="section-header">
          <span>區間排除</span>
          <button className="btn-add-sm" onClick={addRange}>
            + 新增區間
          </button>
        </div>

        {ranges.map((range, index) => (
          <div key={index} className="blacklist-range">
            <span>從</span>
            <input
              type="text"
              value={range.start}
              onChange={(e) => updateRange(index, 'start', e.target.value)}
              placeholder="起始編號"
            />
            <span>到</span>
            <input
              type="text"
              value={range.end}
              onChange={(e) => updateRange(index, 'end', e.target.value)}
              placeholder="結束編號"
            />
            <button
              className="btn-icon btn-danger"
              onClick={() => removeRange(index)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* 單個排除 */}
      <div className="blacklist-section">
        <div className="section-header">
          <span>單個排除</span>
        </div>

        <div className="blacklist-singles-input">
          <input
            type="text"
            value={newSingle}
            onChange={(e) => setNewSingle(e.target.value)}
            placeholder="輸入編號"
            onKeyPress={(e) => e.key === 'Enter' && addSingle()}
          />
          <button className="btn-add-sm" onClick={addSingle}>
            + 新增
          </button>
        </div>

        <div className="blacklist-singles-list">
          {singles.map((single) => (
            <span key={single} className="blacklist-tag">
              {single}
              <button onClick={() => removeSingle(single)}>✕</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

### 1.4 艙單編號帶入 Dialog

#### 1.4.1 ManifestApplyDialog UI

```tsx
interface ManifestApplyDialogProps {
  show: boolean;
  onClose: () => void;
  onApply: (numbers: string[]) => void;
  configs: ManifestNumberConfig[];
  requiredCount: number;  // 需要的編號數量
}

const ManifestApplyDialog: React.FC<ManifestApplyDialogProps> = ({
  show,
  onClose,
  onApply,
  configs,
  requiredCount,
}) => {
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [startNumber, setStartNumber] = useState('');
  const [previewResult, setPreviewResult] = useState<{
    numbers: string[];
    endAt: string;
    skipped: string[];
  } | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  // 當選擇設定或起始編號改變時，更新預覽
  useEffect(() => {
    if (selectedConfig) {
      validateAndPreview();
    }
  }, [selectedConfig, startNumber, requiredCount]);

  const validateAndPreview = async () => {
    // Demo 模式：使用假資料
    // 正式整合時會呼叫 IPC API
    const mockPreview = {
      numbers: ['AAA00', 'AAA01', 'AAA02'],
      endAt: 'AAB49',
      skipped: ['A005', 'A006', 'A123'],
    };
    setPreviewResult(mockPreview);
    setValidationError('');
  };

  const config = configs.find((c) => c.settingName === selectedConfig);

  return (
    <Dialog
      title="帶入艙單編號"
      show={show}
      onClose={onClose}
      width="500px"
    >
      <div className="manifest-apply">
        {/* 選擇設定 */}
        <div className="form-group">
          <label>選擇設定</label>
          <select
            value={selectedConfig}
            onChange={(e) => setSelectedConfig(e.target.value)}
          >
            <option value="">請選擇...</option>
            {configs.map((config) => (
              <option key={config.settingName} value={config.settingName}>
                {config.settingName} ({formatDescription(config.format)})
              </option>
            ))}
          </select>
        </div>

        {/* 起始編號 */}
        {selectedConfig && (
          <div className="form-group">
            <label>起始編號</label>
            <input
              type="text"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value.toUpperCase())}
              placeholder="留空則從第一個開始"
            />
            <span className="form-hint">
              留空則從第一個開始
            </span>
            {validationError && (
              <span className="form-error">{validationError}</span>
            )}
          </div>
        )}

        {/* 使用資訊 */}
        {previewResult && (
          <div className="apply-info">
            <h4>本次使用資訊</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">需要編號數量</span>
                <span className="info-value">{requiredCount} 個</span>
              </div>
              <div className="info-item">
                <span className="info-label">起始</span>
                <span className="info-value">{startNumber || '第一個'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">結束 (預估)</span>
                <span className="info-value">{previewResult.endAt}</span>
              </div>
            </div>
          </div>
        )}

        {/* 黑名單檢查 */}
        {previewResult && previewResult.skipped.length > 0 && (
          <div className="blacklist-warning">
            <h4>⚠️ 將跳過以下編號</h4>
            <div className="skipped-list">
              {previewResult.skipped.map((num) => (
                <span key={num} className="skipped-item">{num}</span>
              ))}
            </div>
          </div>
        )}

        {/* 按鈕 */}
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="btn-primary"
            onClick={() => onApply(previewResult?.numbers || [])}
            disabled={!selectedConfig}
          >
            帶入編號
          </button>
        </div>
      </div>
    </Dialog>
  );
};
```

---

### 1.5 艙單編號 Dialog 樣式

```css
/* manifest-number-dialog/style.css */

/* ===== 通用 ===== */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid #ddd;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(122, 44, 158, 0.1);
}

.form-hint {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: #666;
}

.form-error {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}

.form-section {
  margin-bottom: var(--spacing-lg);
}

.form-section h3 {
  margin: 0 0 var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid #eee;
  font-size: var(--font-size-lg);
  color: #333;
}

/* ===== Segment Editor ===== */
.segment-editor .btn-add {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.segment-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.segment-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: #f8f9fa;
  border-radius: var(--radius-md);
}

.segment-label {
  font-weight: 500;
  min-width: 60px;
}

.segment-type {
  display: flex;
  gap: var(--spacing-md);
}

.segment-type label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
}

.segment-length {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.segment-length select {
  width: 60px;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.segment-actions {
  display: flex;
  gap: var(--spacing-xs);
  margin-left: auto;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: var(--radius-sm);
  background: white;
  cursor: pointer;
  font-size: 14px;
}

.btn-icon:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon.btn-danger {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.btn-icon.btn-danger:hover {
  background: #fff5f5;
}

/* ===== Number Preview ===== */
.number-preview {
  padding: var(--spacing-md);
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: var(--radius-md);
  text-align: center;
}

.preview-sequence {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-lg);
}

.preview-item {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: white;
  border-radius: var(--radius-sm);
  font-weight: bold;
  color: var(--color-primary);
}

.preview-arrow {
  color: #999;
}

.preview-dots {
  color: #999;
}

.preview-count {
  font-size: var(--font-size-md);
  color: #666;
}

.preview-count strong {
  color: var(--color-primary);
}

/* ===== Blacklist Editor ===== */
.blacklist-section {
  margin-bottom: var(--spacing-md);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.section-header span {
  font-weight: 500;
}

.btn-add-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.blacklist-range {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.blacklist-range input {
  width: 120px;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid #ddd;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.blacklist-singles-input {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.blacklist-singles-input input {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid #ddd;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.blacklist-singles-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.blacklist-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #e9ecef;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: 'Courier New', monospace;
}

.blacklist-tag button {
  padding: 0;
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: #666;
  cursor: pointer;
  font-size: 12px;
}

.blacklist-tag button:hover {
  color: var(--color-danger);
}

/* ===== Apply Dialog ===== */
.apply-info {
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
  background: #f8f9fa;
  border-radius: var(--radius-md);
}

.apply-info h4 {
  margin: 0 0 var(--spacing-md);
  font-size: var(--font-size-md);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.info-item {
  text-align: center;
}

.info-label {
  display: block;
  font-size: var(--font-size-sm);
  color: #666;
  margin-bottom: var(--spacing-xs);
}

.info-value {
  font-size: var(--font-size-lg);
  font-weight: bold;
  color: var(--color-primary);
}

.blacklist-warning {
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: var(--radius-md);
}

.blacklist-warning h4 {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-md);
  color: #856404;
}

.skipped-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.skipped-item {
  padding: 2px var(--spacing-sm);
  background: white;
  border-radius: var(--radius-sm);
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-sm);
}

/* ===== Dialog Actions ===== */
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid #eee;
}

.btn-primary {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--color-primary-light);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: white;
  color: #666;
  border: 1px solid #ddd;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f8f9fa;
  border-color: #ccc;
}
```

---

## 第一階段實作清單

### 待新增檔案

```
src/renderer/
├── components/
│   ├── export-card/
│   │   ├── index.tsx
│   │   └── style.css
│   └── manifest-number-dialog/
│       ├── index.tsx
│       ├── ManifestConfigDialog.tsx
│       ├── ManifestApplyDialog.tsx
│       ├── components/
│       │   ├── SegmentEditor.tsx
│       │   ├── SegmentItem.tsx
│       │   ├── BlacklistEditor.tsx
│       │   └── NumberPreview.tsx
│       └── style.css
├── styles/
│   └── variables.css          # CSS 變數系統
└── types/
    └── manifest-number.ts     # TypeScript 型別定義
```

### 待修改檔案

```
src/renderer/
├── pages/
│   └── home/
│       ├── index.tsx          # 主頁面重構
│       └── style.css          # 樣式更新
├── layout/
│   ├── index.tsx              # Header 優化
│   └── style.css              # Header 樣式
└── index.tsx                  # 引入 CSS 變數
```

### 開發順序

1. **建立 CSS 變數系統** (`variables.css`)
2. **建立型別定義** (`manifest-number.ts`)
3. **開發 ExportCard 組件**
4. **開發艙單編號設定 Dialog**（純 UI，假資料）
5. **開發艙單編號帶入 Dialog**（純 UI，假資料）
6. **重構 Home 頁面**
7. **優化 Header**
8. **整合測試 UI Demo**

---

## 後續階段概要

### 第二階段：基礎設施
- Google Sheets 新增 3 個資料表
- 更新 SheetRangeName
- 新增 DataStore 實例
- 建立 IPC handlers（框架）

### 第三階段：商業邏輯
- 收貨人資訊帶入邏輯
- 問題件標記邏輯
- 台北港格式邏輯
- 高雄超峰格式邏輯
- 艙單編號產生器

### 第四階段：測試與完善
- 單元測試
- 整合測試
- 效能優化
- 文件更新
