import React, { useState, useCallback } from 'react';
import {
  ManifestNumberConfig,
  FormatSegment,
  BlacklistRule,
  DEFAULT_CONFIG,
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

const ManifestConfigDialog: React.FC<ManifestConfigDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  existingConfig,
}) => {
  const [settingName, setSettingName] = useState(
    existingConfig?.settingName || '',
  );
  const [segments, setSegments] = useState<FormatSegment[]>(
    existingConfig?.format.segments || DEFAULT_CONFIG.format.segments,
  );
  const [blacklist, setBlacklist] = useState<BlacklistRule>(
    existingConfig?.blacklist || DEFAULT_CONFIG.blacklist,
  );
  const [currentNumber, setCurrentNumber] = useState(
    existingConfig?.currentNumber || '',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!settingName.trim()) {
      newErrors.settingName = '請輸入設定名稱';
    }

    if (segments.length === 0) {
      newErrors.segments = '請至少設定一個區段';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [settingName, segments]);

  const handleSave = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    const config: ManifestNumberConfig = {
      settingName: settingName.trim(),
      format: { segments },
      blacklist,
      currentNumber: currentNumber || undefined,
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
    segments,
    blacklist,
    currentNumber,
    existingConfig,
    onSave,
    onClose,
    validateForm,
  ]);

  const handleClose = useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

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
        className="manifest-dialog"
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

          {/* 格式設定 */}
          <div className="manifest-dialog__section">
            <h3 className="manifest-dialog__section-title">編號格式設定</h3>
            <SegmentEditor segments={segments} onChange={setSegments} />
            {errors.segments && (
              <span className="manifest-dialog__error">{errors.segments}</span>
            )}
          </div>

          {/* 預覽 */}
          <NumberPreview segments={segments} />

          {/* 黑名單 */}
          <BlacklistEditor blacklist={blacklist} onChange={setBlacklist} />

          {/* 目前編號 */}
          <div className="manifest-dialog__field">
            <label className="manifest-dialog__label">目前編號（選填）</label>
            <input
              type="text"
              className="manifest-dialog__input"
              placeholder="留空則從第一個編號開始"
              value={currentNumber}
              onChange={(e) => setCurrentNumber(e.target.value.toUpperCase())}
            />
            <span className="manifest-dialog__hint">
              下次帶入時將從此編號的下一個開始
            </span>
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
