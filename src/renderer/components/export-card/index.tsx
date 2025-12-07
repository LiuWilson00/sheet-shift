import React from 'react';
import './style.css';

export interface ExportCardProps {
  /** 標題 */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 圖示（emoji 或自定義內容） */
  icon?: React.ReactNode;
  /** 點擊事件 */
  onClick: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 標籤（例如 "NEW"） */
  badge?: string;
  /** 標籤類型 */
  badgeType?: 'primary' | 'danger' | 'warning' | 'success';
}

const ExportCard: React.FC<ExportCardProps> = ({
  title,
  description,
  icon,
  onClick,
  disabled = false,
  badge,
  badgeType = 'danger',
}) => {
  return (
    <button
      className={`export-card ${disabled ? 'export-card--disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {badge && (
        <span className={`export-card__badge export-card__badge--${badgeType}`}>
          {badge}
        </span>
      )}
      {icon && <div className="export-card__icon">{icon}</div>}
      <div className="export-card__content">
        <h3 className="export-card__title">{title}</h3>
        {description && (
          <p className="export-card__description">{description}</p>
        )}
      </div>
    </button>
  );
};

export default ExportCard;
