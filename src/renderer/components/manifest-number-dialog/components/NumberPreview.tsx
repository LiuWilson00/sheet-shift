import React, { useMemo } from 'react';
import {
  FormatSegment,
  generatePreview,
  calculateTotalCount,
} from '../../../types/manifest-number';

interface NumberPreviewProps {
  segments: FormatSegment[];
}

const NumberPreview: React.FC<NumberPreviewProps> = ({ segments }) => {
  const preview = useMemo(() => generatePreview(segments), [segments]);
  const totalCount = useMemo(() => calculateTotalCount(segments), [segments]);

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toLocaleString();
  };

  return (
    <div className="number-preview">
      <h4 className="number-preview__title">編號預覽</h4>

      <div className="number-preview__examples">
        <div className="number-preview__item">
          <span className="number-preview__label">第一個:</span>
          <span className="number-preview__value">{preview.first}</span>
        </div>
        <div className="number-preview__item">
          <span className="number-preview__label">第二個:</span>
          <span className="number-preview__value">{preview.second}</span>
        </div>
        <div className="number-preview__item number-preview__item--last">
          <span className="number-preview__label">最後一個:</span>
          <span className="number-preview__value">{preview.last}</span>
        </div>
      </div>

      <div className="number-preview__total">
        <span className="number-preview__total-label">可用編號總數:</span>
        <span className="number-preview__total-value">
          {formatCount(totalCount)}
        </span>
      </div>
    </div>
  );
};

export default NumberPreview;
