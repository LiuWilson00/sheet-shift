import React from 'react';
import { FormatSegment } from '../../../types/manifest-number';
import SegmentItem from './SegmentItem';

interface SegmentEditorProps {
  segments: FormatSegment[];
  onChange: (segments: FormatSegment[]) => void;
}

const SegmentEditor: React.FC<SegmentEditorProps> = ({
  segments,
  onChange,
}) => {
  const addSegment = () => {
    if (segments.length >= 5) {
      return; // 最多 5 個區段
    }
    onChange([...segments, { type: 'alpha', length: 1 }]);
  };

  const removeSegment = (index: number) => {
    if (segments.length <= 1) {
      return; // 至少保留一個區段
    }
    onChange(segments.filter((_, i) => i !== index));
  };

  const updateSegment = (index: number, updates: Partial<FormatSegment>) => {
    onChange(
      segments.map((seg, i) => (i === index ? { ...seg, ...updates } : seg)),
    );
  };

  const moveSegment = (index: number, direction: 'up' | 'down') => {
    const newSegments = [...segments];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= segments.length) {
      return;
    }

    [newSegments[index], newSegments[targetIndex]] = [
      newSegments[targetIndex],
      newSegments[index],
    ];
    onChange(newSegments);
  };

  return (
    <div className="segment-editor">
      <button
        type="button"
        className="segment-editor__add-btn"
        onClick={addSegment}
        disabled={segments.length >= 5}
      >
        + 新增區段
      </button>

      <div className="segment-editor__list">
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

export default SegmentEditor;
