import React from 'react';
import {
  ManifestNumberConfig,
  formatDescription,
} from '../../../types/manifest-number';

interface ManifestListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  configs: ManifestNumberConfig[];
  onEdit: (config: ManifestNumberConfig) => void;
  onDelete: (settingName: string) => void;
  onCreate: () => void;
}

/** 格式化日期為簡短格式 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return '-';
  }
}

/** 取得進度描述文字 */
function progressText(config: ManifestNumberConfig): string {
  if (!config.currentProgress) return '未設定';
  const { groupIndex, number } = config.currentProgress;
  if (!number) return `群組 ${groupIndex + 1}（起始）`;
  return `群組 ${groupIndex + 1} / ${number}`;
}

const ManifestListDialog: React.FC<ManifestListDialogProps> = ({
  isOpen,
  onClose,
  configs,
  onEdit,
  onDelete,
  onCreate,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="manifest-dialog-overlay"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div
        className="manifest-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="manifest-dialog__header">
          <h2 className="manifest-dialog__title">艙單編號設定管理</h2>
          <button
            type="button"
            className="manifest-dialog__close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="manifest-dialog__body">
          {configs.length === 0 ? (
            <div className="manifest-list__empty">
              <p className="manifest-list__empty-icon">📋</p>
              <p className="manifest-list__empty-text">尚未建立任何設定</p>
              <p className="manifest-list__empty-hint">
                點擊下方按鈕新增第一個設定
              </p>
            </div>
          ) : (
            <div className="manifest-list">
              {configs.map((config) => (
                <div className="manifest-list__item" key={config.settingName}>
                  <div className="manifest-list__item-header">
                    <span className="manifest-list__item-name">
                      {config.settingName}
                    </span>
                  </div>
                  <div className="manifest-list__item-info">
                    <span className="manifest-list__item-detail">
                      格式群組: {config.formatGroups.length} 組
                      {config.formatGroups.length > 0 && (
                        <>
                          {' '}
                          (
                          {config.formatGroups
                            .map((g) => formatDescription(g.format))
                            .join(' / ')}
                          )
                        </>
                      )}
                    </span>
                    <span className="manifest-list__item-detail">
                      進度: {progressText(config)}
                    </span>
                    <span className="manifest-list__item-detail">
                      更新: {formatDate(config.updatedAt)}
                    </span>
                  </div>
                  <div className="manifest-list__item-actions">
                    <button
                      type="button"
                      className="manifest-list__action-btn manifest-list__action-btn--edit"
                      onClick={() => onEdit(config)}
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      className="manifest-list__action-btn manifest-list__action-btn--delete"
                      onClick={() => onDelete(config.settingName)}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="manifest-dialog__footer">
          <button
            type="button"
            className="manifest-dialog__btn manifest-dialog__btn--secondary"
            onClick={onClose}
          >
            關閉
          </button>
          <button
            type="button"
            className="manifest-dialog__btn manifest-dialog__btn--primary"
            onClick={onCreate}
          >
            + 新增設定
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManifestListDialog;
