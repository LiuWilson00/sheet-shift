import React, { useState, useMemo, useCallback } from 'react';
import {
  ManifestNumberConfig,
  generatePreview,
} from '../../../types/manifest-number';

interface ManifestApplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (numbers: string[], endNumber: string) => void;
  configs: ManifestNumberConfig[];
  rowCount: number;
}

const ManifestApplyDialog: React.FC<ManifestApplyDialogProps> = ({
  isOpen,
  onClose,
  onApply,
  configs,
  rowCount,
}) => {
  const [selectedConfigName, setSelectedConfigName] = useState(
    configs.length > 0 ? configs[0].settingName : '',
  );
  const [count, setCount] = useState(rowCount || 1);

  const selectedConfig = useMemo(() => {
    return configs.find((c) => c.settingName === selectedConfigName);
  }, [configs, selectedConfigName]);

  const preview = useMemo(() => {
    if (!selectedConfig) return null;
    return generatePreview(selectedConfig.format.segments);
  }, [selectedConfig]);

  // 模擬產生編號預覽（UI Demo 用）
  const generateDemoNumbers = useCallback((): string[] => {
    if (!selectedConfig || !preview) return [];

    const startNumber = selectedConfig.currentNumber || preview.first;
    const numbers: string[] = [];

    // 簡單演示：只顯示起始編號
    const maxItems = Math.min(count, 5);
    Array.from({ length: maxItems }).forEach((_, i) => {
      if (i === 0) {
        numbers.push(startNumber);
      } else {
        // 模擬下一個編號（簡化版）
        numbers.push(`${startNumber.slice(0, -1)}${i}`);
      }
    });

    return numbers;
  }, [selectedConfig, preview, count]);

  const demoNumbers = useMemo(
    () => generateDemoNumbers(),
    [generateDemoNumbers],
  );

  const handleApply = useCallback(() => {
    if (!selectedConfig) return;

    // UI Demo: 只傳遞模擬資料
    const endNumber = demoNumbers[demoNumbers.length - 1] || '';
    onApply(demoNumbers, endNumber);
    onClose();
  }, [selectedConfig, demoNumbers, onApply, onClose]);

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!Number.isNaN(value) && value > 0) {
      setCount(value);
    }
  };

  if (!isOpen) {
    return null;
  }

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
          <h2 className="manifest-dialog__title">帶入艙單編號</h2>
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
            <div className="apply-dialog__empty">
              <p>尚未建立任何設定</p>
              <p>請先新增艙單編號設定</p>
            </div>
          ) : (
            <>
              {/* 選擇設定 */}
              <div className="apply-dialog__config-select">
                <label className="manifest-dialog__label">選擇設定</label>
                <select
                  className="apply-dialog__select"
                  value={selectedConfigName}
                  onChange={(e) => setSelectedConfigName(e.target.value)}
                >
                  {configs.map((config) => (
                    <option key={config.settingName} value={config.settingName}>
                      {config.settingName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedConfig && preview && (
                <>
                  {/* 設定資訊 */}
                  <div className="apply-dialog__info">
                    <div className="apply-dialog__info-row">
                      <span className="apply-dialog__info-label">
                        起始編號:
                      </span>
                      <span className="apply-dialog__info-value">
                        {selectedConfig.currentNumber || preview.first}
                      </span>
                    </div>
                    <div className="apply-dialog__info-row">
                      <span className="apply-dialog__info-label">
                        格式範例:
                      </span>
                      <span className="apply-dialog__info-value">
                        {preview.first} ~ {preview.last}
                      </span>
                    </div>
                    <div className="apply-dialog__info-row">
                      <span className="apply-dialog__info-label">
                        黑名單區間:
                      </span>
                      <span className="apply-dialog__info-value">
                        {selectedConfig.blacklist.ranges.length} 個
                      </span>
                    </div>
                    <div className="apply-dialog__info-row">
                      <span className="apply-dialog__info-label">
                        黑名單單號:
                      </span>
                      <span className="apply-dialog__info-value">
                        {selectedConfig.blacklist.singles.length} 個
                      </span>
                    </div>
                  </div>

                  {/* 數量輸入 */}
                  <div className="apply-dialog__count-input">
                    <label>帶入數量:</label>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={count}
                      onChange={handleCountChange}
                    />
                    <span className="manifest-dialog__hint">
                      （目前選取 {rowCount} 筆資料）
                    </span>
                  </div>

                  {/* 預覽結果 */}
                  <div className="apply-dialog__preview">
                    <h4 className="apply-dialog__preview-title">
                      預覽產生的編號
                    </h4>
                    <div className="apply-dialog__preview-numbers">
                      {demoNumbers.slice(0, 3).map((num, index) => (
                        <span
                          key={index}
                          className={`apply-dialog__preview-number ${
                            index === 0
                              ? 'apply-dialog__preview-number--highlight'
                              : ''
                          }`}
                        >
                          {index + 1}. {num}
                        </span>
                      ))}
                      {count > 3 && (
                        <>
                          <span className="apply-dialog__preview-ellipsis">
                            ⋮
                          </span>
                          <span className="apply-dialog__preview-number apply-dialog__preview-number--highlight">
                            {count}.{' '}
                            {demoNumbers[demoNumbers.length - 1] || '---'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="manifest-dialog__footer">
          <button
            type="button"
            className="manifest-dialog__btn manifest-dialog__btn--secondary"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="manifest-dialog__btn manifest-dialog__btn--primary"
            onClick={handleApply}
            disabled={configs.length === 0 || !selectedConfig}
          >
            確認帶入
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManifestApplyDialog;
