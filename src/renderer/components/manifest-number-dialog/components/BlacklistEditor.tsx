import React, { useState } from 'react';
import { BlacklistRule, BlacklistRange } from '../../../types/manifest-number';

interface BlacklistEditorProps {
  blacklist: BlacklistRule;
  onChange: (blacklist: BlacklistRule) => void;
  placeholder?: string;
}

const BlacklistEditor: React.FC<BlacklistEditorProps> = ({
  blacklist,
  onChange,
  placeholder = 'AAA00',
}) => {
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [singleValue, setSingleValue] = useState('');

  const addRange = () => {
    if (!rangeStart.trim() || !rangeEnd.trim()) {
      return;
    }

    const newRange: BlacklistRange = {
      start: rangeStart.toUpperCase().trim(),
      end: rangeEnd.toUpperCase().trim(),
    };

    onChange({
      ...blacklist,
      ranges: [...blacklist.ranges, newRange],
    });

    setRangeStart('');
    setRangeEnd('');
  };

  const removeRange = (index: number) => {
    onChange({
      ...blacklist,
      ranges: blacklist.ranges.filter((_, i) => i !== index),
    });
  };

  const addSingle = () => {
    if (!singleValue.trim()) {
      return;
    }

    const value = singleValue.toUpperCase().trim();
    if (blacklist.singles.includes(value)) {
      return;
    }

    onChange({
      ...blacklist,
      singles: [...blacklist.singles, value],
    });

    setSingleValue('');
  };

  const removeSingle = (index: number) => {
    onChange({
      ...blacklist,
      singles: blacklist.singles.filter((_, i) => i !== index),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="blacklist-editor">
      <h4 className="blacklist-editor__title">黑名單設定（選填）</h4>
      <p className="blacklist-editor__desc">設定不使用的編號區間或單一編號</p>

      {/* 區間排除 */}
      <div className="blacklist-editor__section">
        <label className="blacklist-editor__label">區間排除</label>
        <div className="blacklist-editor__input-group">
          <input
            type="text"
            className="blacklist-editor__input"
            placeholder={placeholder}
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, addRange)}
          />
          <span className="blacklist-editor__separator">~</span>
          <input
            type="text"
            className="blacklist-editor__input"
            placeholder={placeholder}
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, addRange)}
          />
          <button
            type="button"
            className="blacklist-editor__add-btn"
            onClick={addRange}
            disabled={!rangeStart.trim() || !rangeEnd.trim()}
          >
            新增
          </button>
        </div>

        {blacklist.ranges.length > 0 && (
          <div className="blacklist-editor__tags">
            {blacklist.ranges.map((range, index) => (
              <span key={index} className="blacklist-editor__tag">
                {range.start} ~ {range.end}
                <button
                  type="button"
                  className="blacklist-editor__tag-remove"
                  onClick={() => removeRange(index)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 單一排除 */}
      <div className="blacklist-editor__section">
        <label className="blacklist-editor__label">單一排除</label>
        <div className="blacklist-editor__input-group">
          <input
            type="text"
            className="blacklist-editor__input blacklist-editor__input--wide"
            placeholder={placeholder}
            value={singleValue}
            onChange={(e) => setSingleValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, addSingle)}
          />
          <button
            type="button"
            className="blacklist-editor__add-btn"
            onClick={addSingle}
            disabled={!singleValue.trim()}
          >
            新增
          </button>
        </div>

        {blacklist.singles.length > 0 && (
          <div className="blacklist-editor__tags">
            {blacklist.singles.map((single, index) => (
              <span key={index} className="blacklist-editor__tag">
                {single}
                <button
                  type="button"
                  className="blacklist-editor__tag-remove"
                  onClick={() => removeSingle(index)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlacklistEditor;
