import React, { useState, useCallback, useEffect } from 'react';
import {
  ManifestNumberConfig,
  FormatSegment,
  BlacklistRule,
  FormatGroup,
  CurrentProgress,
  DEFAULT_FORMAT_GROUP,
  formatDescription,
} from '../../../types/manifest-number';
import SegmentEditor from './SegmentEditor';
import NumberPreview from './NumberPreview';
import BlacklistEditor from './BlacklistEditor';

interface ManifestConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ManifestNumberConfig) => void;
  existingConfig?: ManifestNumberConfig;
}

/** 建立空的格式群組 */
function createEmptyGroup(): FormatGroup {
  return {
    format: {
      segments: [...DEFAULT_FORMAT_GROUP.format.segments],
    },
    blacklist: {
      ranges: [],
      singles: [],
    },
  };
}

const ManifestConfigDialog: React.FC<ManifestConfigDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  existingConfig,
}) => {
  const [settingName, setSettingName] = useState('');
  const [formatGroups, setFormatGroups] = useState<FormatGroup[]>([
    createEmptyGroup(),
  ]);
  const [currentProgress, setCurrentProgress] = useState<
    CurrentProgress | undefined
  >(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** 記錄各群組的展開/摺疊狀態 */
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<number, boolean>
  >({});

  // 當 dialog 開啟時，同步表單狀態
  useEffect(() => {
    if (isOpen) {
      setSettingName(existingConfig?.settingName || '');
      setFormatGroups(
        existingConfig?.formatGroups?.length
          ? existingConfig.formatGroups.map((g) => ({
              format: { segments: [...g.format.segments] },
              blacklist: {
                ranges: [...g.blacklist.ranges],
                singles: [...g.blacklist.singles],
              },
            }))
          : [createEmptyGroup()],
      );
      setCurrentProgress(
        existingConfig?.currentProgress
          ? { ...existingConfig.currentProgress }
          : undefined,
      );
      setErrors({});
      setCollapsedGroups({});
    }
  }, [isOpen, existingConfig]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!settingName.trim()) {
      newErrors.settingName = '請輸入設定名稱';
    }

    if (formatGroups.length === 0) {
      newErrors.formatGroups = '請至少設定一組格式';
    }

    formatGroups.forEach((group, index) => {
      if (group.format.segments.length === 0) {
        newErrors[`group_${index}`] = '請至少設定一個區段';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [settingName, formatGroups]);

  const handleSave = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    const config: ManifestNumberConfig = {
      settingName: settingName.trim(),
      formatGroups,
      currentProgress,
      updatedAt: new Date().toISOString(),
    };

    if (!existingConfig) {
      config.createdAt = new Date().toISOString();
    } else {
      config.createdAt = existingConfig.createdAt;
    }

    onSave(config);
    onClose();
  }, [
    settingName,
    formatGroups,
    currentProgress,
    existingConfig,
    onSave,
    onClose,
    validateForm,
  ]);

  const handleClose = useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

  // === 群組操作 ===

  const handleAddGroup = useCallback(() => {
    setFormatGroups((prev) => [...prev, createEmptyGroup()]);
  }, []);

  const handleRemoveGroup = useCallback(
    (index: number) => {
      if (formatGroups.length <= 1) return;
      setFormatGroups((prev) => prev.filter((_, i) => i !== index));
      // 調整 currentProgress 的 groupIndex
      if (currentProgress) {
        if (currentProgress.groupIndex === index) {
          setCurrentProgress(undefined);
        } else if (currentProgress.groupIndex > index) {
          setCurrentProgress({
            ...currentProgress,
            groupIndex: currentProgress.groupIndex - 1,
          });
        }
      }
    },
    [formatGroups.length, currentProgress],
  );

  const handleSegmentsChange = useCallback(
    (groupIndex: number, newSegments: FormatSegment[]) => {
      setFormatGroups((prev) =>
        prev.map((g, i) =>
          i === groupIndex ? { ...g, format: { segments: newSegments } } : g,
        ),
      );
    },
    [],
  );

  const handleBlacklistChange = useCallback(
    (groupIndex: number, newBlacklist: BlacklistRule) => {
      setFormatGroups((prev) =>
        prev.map((g, i) =>
          i === groupIndex ? { ...g, blacklist: newBlacklist } : g,
        ),
      );
    },
    [],
  );

  const toggleCollapse = useCallback((index: number) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="manifest-dialog-overlay"
      onClick={handleClose}
      onKeyDown={(e) => e.key === 'Escape' && handleClose()}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div
        className="manifest-dialog manifest-dialog--wide"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="manifest-dialog__header">
          <h2 className="manifest-dialog__title">
            {existingConfig ? '編輯艙單編號設定' : '新增艙單編號設定'}
          </h2>
          <button
            type="button"
            className="manifest-dialog__close"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <div className="manifest-dialog__body">
          {/* 設定名稱 */}
          <div className="manifest-dialog__field">
            <label className="manifest-dialog__label">
              設定名稱 <span className="manifest-dialog__required">*</span>
            </label>
            <input
              type="text"
              className={`manifest-dialog__input ${
                errors.settingName ? 'manifest-dialog__input--error' : ''
              }`}
              placeholder="例如：基本格式、特殊編號"
              value={settingName}
              onChange={(e) => setSettingName(e.target.value)}
            />
            {errors.settingName && (
              <span className="manifest-dialog__error">
                {errors.settingName}
              </span>
            )}
          </div>

          {/* 格式群組列表 */}
          {errors.formatGroups && (
            <span className="manifest-dialog__error">
              {errors.formatGroups}
            </span>
          )}

          {formatGroups.map((group, groupIndex) => (
            <div
              className="format-group"
              // eslint-disable-next-line react/no-array-index-key
              key={groupIndex}
            >
              <div className="format-group__header">
                <button
                  type="button"
                  className="format-group__toggle"
                  onClick={() => toggleCollapse(groupIndex)}
                >
                  <span className="format-group__arrow">
                    {collapsedGroups[groupIndex] ? '▶' : '▼'}
                  </span>
                  <span className="format-group__title">
                    格式群組 {groupIndex + 1}
                  </span>
                  <span className="format-group__summary">
                    {formatDescription(group.format) || '（未設定）'}
                  </span>
                </button>
                <button
                  type="button"
                  className="format-group__remove"
                  onClick={() => handleRemoveGroup(groupIndex)}
                  disabled={formatGroups.length <= 1}
                  title="刪除此群組"
                >
                  ✕
                </button>
              </div>

              {!collapsedGroups[groupIndex] && (
                <div className="format-group__body">
                  {/* 格式設定 */}
                  <div className="manifest-dialog__section">
                    <h3 className="manifest-dialog__section-title">
                      編號格式設定
                    </h3>
                    <SegmentEditor
                      segments={group.format.segments}
                      onChange={(segs) =>
                        handleSegmentsChange(groupIndex, segs)
                      }
                    />
                    {errors[`group_${groupIndex}`] && (
                      <span className="manifest-dialog__error">
                        {errors[`group_${groupIndex}`]}
                      </span>
                    )}
                  </div>

                  {/* 預覽 */}
                  <NumberPreview segments={group.format.segments} />

                  {/* 黑名單 */}
                  <BlacklistEditor
                    blacklist={group.blacklist}
                    onChange={(bl) => handleBlacklistChange(groupIndex, bl)}
                  />
                </div>
              )}
            </div>
          ))}

          {/* 新增格式群組按鈕 */}
          <button
            type="button"
            className="format-group__add-btn"
            onClick={handleAddGroup}
          >
            + 新增格式群組
          </button>

          {/* 目前進度 */}
          <div className="manifest-dialog__section">
            <h3 className="manifest-dialog__section-title">目前進度（選填）</h3>
            <div className="format-group__progress">
              <div className="format-group__progress-row">
                <label className="manifest-dialog__label">使用群組</label>
                <select
                  className="manifest-dialog__input"
                  value={currentProgress?.groupIndex ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setCurrentProgress(undefined);
                    } else {
                      setCurrentProgress({
                        groupIndex: Number(val),
                        number: currentProgress?.number || '',
                      });
                    }
                  }}
                >
                  <option value="">未設定</option>
                  {formatGroups.map((_, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <option key={i} value={i}>
                      群組 {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              {currentProgress !== undefined && (
                <div className="format-group__progress-row">
                  <label className="manifest-dialog__label">目前編號</label>
                  <input
                    type="text"
                    className="manifest-dialog__input"
                    placeholder="留空則從第一個編號開始"
                    value={currentProgress.number}
                    onChange={(e) =>
                      setCurrentProgress({
                        ...currentProgress,
                        number: e.target.value.toUpperCase(),
                      })
                    }
                  />
                  <span className="manifest-dialog__hint">
                    下次帶入時將從此編號的下一個開始
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="manifest-dialog__footer">
          <button
            type="button"
            className="manifest-dialog__btn manifest-dialog__btn--secondary"
            onClick={handleClose}
          >
            取消
          </button>
          <button
            type="button"
            className="manifest-dialog__btn manifest-dialog__btn--primary"
            onClick={handleSave}
          >
            {existingConfig ? '更新設定' : '儲存設定'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManifestConfigDialog;
