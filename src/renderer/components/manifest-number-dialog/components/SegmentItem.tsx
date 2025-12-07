import React from 'react';
import { FormatSegment } from '../../../types/manifest-number';

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
}) => {
  return (
    <div className="segment-item">
      <span className="segment-item__label">區段 {index + 1}</span>

      <div className="segment-item__type">
        <label className="segment-item__radio">
          <input
            type="radio"
            name={`segment-type-${index}`}
            checked={segment.type === 'alpha'}
            onChange={() => onUpdate({ type: 'alpha' })}
          />
          <span>英文</span>
        </label>
        <label className="segment-item__radio">
          <input
            type="radio"
            name={`segment-type-${index}`}
            checked={segment.type === 'numeric'}
            onChange={() => onUpdate({ type: 'numeric' })}
          />
          <span>數字</span>
        </label>
      </div>

      <div className="segment-item__length">
        <label>位數:</label>
        <select
          value={segment.length}
          onChange={(e) => onUpdate({ length: Number(e.target.value) })}
          className="segment-item__select"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="segment-item__actions">
        <button
          type="button"
          className="segment-item__btn"
          onClick={onMoveUp}
          disabled={isFirst}
          title="上移"
        >
          ↑
        </button>
        <button
          type="button"
          className="segment-item__btn"
          onClick={onMoveDown}
          disabled={isLast}
          title="下移"
        >
          ↓
        </button>
        <button
          type="button"
          className="segment-item__btn segment-item__btn--danger"
          onClick={onRemove}
          title="刪除"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default SegmentItem;
