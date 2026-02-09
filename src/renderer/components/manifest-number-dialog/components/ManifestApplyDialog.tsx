import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ManifestNumberConfig,
  generatePreview,
} from '../../../types/manifest-number';
import ipcApi from '../../../api/ipc-api';

interface ManifestApplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (
    numbers: string[],
    endNumber: string,
    transactionCode?: string,
  ) => void;
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
  // 當 rowCount 從外部更新時，同步更新 count
  useEffect(() => {
    if (rowCount > 0) {
      setCount(rowCount);
    }
  }, [rowCount]);
  /** 交易代碼（帶入 AG 欄位） */
  const [transactionCode, setTransactionCode] = useState('');
  /** 載入狀態 */
  const [isGenerating, setIsGenerating] = useState(false);
  /** 錯誤訊息 */
  const [error, setError] = useState('');

  const selectedConfig = useMemo(() => {
    return configs.find((c) => c.settingName === selectedConfigName);
  }, [configs, selectedConfigName]);

  const preview = useMemo(() => {
    if (!selectedConfig) return null;
    return generatePreview(selectedConfig.format.segments);
  }, [selectedConfig]);

  // 當設定變更時重置錯誤
  useEffect(() => {
    setError('');
  }, [selectedConfigName]);

  // 當 configs 變更且目前選擇的不在列表中時，選擇第一個
  useEffect(() => {
    if (
      configs.length > 0 &&
      !configs.find((c) => c.settingName === selectedConfigName)
    ) {
      setSelectedConfigName(configs[0].settingName);
    }
  }, [configs, selectedConfigName]);

  const handleApply = useCallback(async () => {
    if (!selectedConfig) return;

    setIsGenerating(true);
    setError('');

    try {
      // 呼叫 API 產生艙單編號
      const result = await ipcApi.manifestNumber.generate({
        configName: selectedConfig.settingName,
        count,
        startFrom: selectedConfig.currentNumber || undefined,
        transactionCode: transactionCode || undefined,
      });

      // 更新 Google Sheets 上的當前編號
      await ipcApi.manifestNumber.updateCurrentNumber({
        settingName: selectedConfig.settingName,
        currentNumber: result.endAt,
      });

      // 傳遞編號和交易代碼
      onApply(result.numbers, result.endAt, transactionCode || undefined);
      onClose();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '產生編號失敗';
      setError(errMsg);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedConfig, count, transactionCode, onApply, onClose]);

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

                  {/* 交易代碼輸入 */}
                  <div className="apply-dialog__transaction-code">
                    <label className="manifest-dialog__label">
                      交易代碼
                      <span className="manifest-dialog__hint">
                        （選填，帶入 AG 欄位）
                      </span>
                    </label>
                    <input
                      type="text"
                      className="manifest-dialog__input"
                      value={transactionCode}
                      onChange={(e) => setTransactionCode(e.target.value)}
                      placeholder="例如：B2C、C2C"
                      maxLength={20}
                    />
                  </div>

                  {/* 錯誤訊息 */}
                  {error && (
                    <div className="apply-dialog__error">
                      <span>{error}</span>
                    </div>
                  )}
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
            disabled={configs.length === 0 || !selectedConfig || isGenerating}
          >
            {isGenerating ? '產生中...' : '確認帶入'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManifestApplyDialog;
