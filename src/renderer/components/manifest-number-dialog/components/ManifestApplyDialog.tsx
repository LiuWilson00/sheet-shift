import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ManifestNumberConfig,
  generatePreview,
  validateNumber,
  formatDescription,
} from '../../../types/manifest-number';
import ipcApi from '../../../api/ipc-api';

interface ManifestApplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (
    numbers: string[],
    endNumber: string,
    transactionCode?: string,
    endGroupIndex?: number,
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
  /** 自訂起始編號（空字串表示使用設定的當前編號） */
  const [customStartNumber, setCustomStartNumber] = useState('');
  /** 自訂起始群組索引 */
  const [customStartGroupIndex, setCustomStartGroupIndex] = useState<number>(0);
  /** 跳過數字部分為 0 的編號（預設開啟） */
  const [skipZeroNumbers, setSkipZeroNumbers] = useState(true);
  /** 載入狀態 */
  const [isGenerating, setIsGenerating] = useState(false);
  /** 錯誤訊息 */
  const [error, setError] = useState('');

  const selectedConfig = useMemo(() => {
    return configs.find((c) => c.settingName === selectedConfigName);
  }, [configs, selectedConfigName]);

  // 取得當前群組的 preview
  const currentGroupIndex = useMemo(() => {
    if (!selectedConfig) return 0;
    return selectedConfig.currentProgress?.groupIndex ?? 0;
  }, [selectedConfig]);

  const currentGroup = useMemo(() => {
    if (!selectedConfig) return null;
    const idx = currentGroupIndex;
    if (idx >= 0 && idx < selectedConfig.formatGroups.length) {
      return selectedConfig.formatGroups[idx];
    }
    return selectedConfig.formatGroups[0] || null;
  }, [selectedConfig, currentGroupIndex]);

  const preview = useMemo(() => {
    if (!currentGroup) return null;
    return generatePreview(currentGroup.format.segments);
  }, [currentGroup]);

  // 自訂起始編號格式驗證（根據選定的起始群組）
  const customStartError = useMemo(() => {
    if (!customStartNumber || !selectedConfig) return '';
    const upper = customStartNumber.toUpperCase();
    const group = selectedConfig.formatGroups[customStartGroupIndex];
    if (!group) return '群組不存在';
    if (!validateNumber(upper, group.format)) {
      const desc = formatDescription(group.format);
      return `格式不符，預期格式：${desc}`;
    }
    return '';
  }, [customStartNumber, selectedConfig, customStartGroupIndex]);

  // 當設定變更時重置錯誤與自訂起始編號
  useEffect(() => {
    setError('');
    setCustomStartNumber('');
    setCustomStartGroupIndex(0);
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
    if (customStartNumber && customStartError) return;

    setIsGenerating(true);
    setError('');

    const useCustomStart = customStartNumber.trim() !== '';

    try {
      // 決定起始編號
      const startFrom = useCustomStart
        ? customStartNumber.toUpperCase()
        : selectedConfig.currentProgress?.number || undefined;

      const startGroupIndex = useCustomStart
        ? customStartGroupIndex
        : selectedConfig.currentProgress?.groupIndex;

      // 呼叫 API 產生艙單編號
      const result = await ipcApi.manifestNumber.generate({
        configName: selectedConfig.settingName,
        count,
        startFrom,
        startGroupIndex,
        transactionCode: transactionCode || undefined,
        skipZeroNumbers,
      });

      // 僅在非自訂起始時更新 Google Sheets 上的當前進度
      if (!useCustomStart) {
        await ipcApi.manifestNumber.updateCurrentNumber({
          settingName: selectedConfig.settingName,
          groupIndex: result.endGroupIndex,
          currentNumber: result.endAt,
        });
      }

      // 傳遞編號、交易代碼和結束群組索引
      onApply(
        result.numbers,
        result.endAt,
        transactionCode || undefined,
        result.endGroupIndex,
      );
      onClose();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '產生編號失敗';
      setError(errMsg);
    } finally {
      setIsGenerating(false);
    }
  }, [
    selectedConfig,
    count,
    transactionCode,
    customStartNumber,
    customStartGroupIndex,
    customStartError,
    skipZeroNumbers,
    onApply,
    onClose,
  ]);

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

              {selectedConfig && (
                <>
                  {/* 設定資訊 */}
                  <div className="apply-dialog__info">
                    <div className="apply-dialog__info-row">
                      <span className="apply-dialog__info-label">
                        格式群組數:
                      </span>
                      <span className="apply-dialog__info-value">
                        {selectedConfig.formatGroups.length} 組
                      </span>
                    </div>
                    <div className="apply-dialog__info-row">
                      <span className="apply-dialog__info-label">
                        當前使用:
                      </span>
                      <span className="apply-dialog__info-value">
                        群組 {currentGroupIndex + 1}
                        {currentGroup && (
                          <> ({formatDescription(currentGroup.format)})</>
                        )}
                      </span>
                    </div>
                    <div className="apply-dialog__info-row">
                      <span className="apply-dialog__info-label">
                        起始編號:
                      </span>
                      <span className="apply-dialog__info-value">
                        {selectedConfig.currentProgress?.number ||
                          (preview ? preview.first : '-')}
                      </span>
                    </div>
                    {selectedConfig.formatGroups.length > 1 && (
                      <div className="apply-dialog__info-row">
                        <span className="apply-dialog__info-label">
                          格式範圍:
                        </span>
                        <span className="apply-dialog__info-value">
                          {selectedConfig.formatGroups
                            .map(
                              (g, i) =>
                                `群組${i + 1}: ${formatDescription(g.format)}`,
                            )
                            .join(' / ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 自訂起始編號 */}
                  <div className="apply-dialog__custom-start">
                    <label className="manifest-dialog__label">
                      自訂起始編號
                      <span className="manifest-dialog__hint">
                        （選填，留空則使用設定的當前編號）
                      </span>
                    </label>
                    {selectedConfig.formatGroups.length > 1 && (
                      <div className="apply-dialog__group-select">
                        <label className="manifest-dialog__label">
                          起始群組
                        </label>
                        <select
                          className="apply-dialog__select"
                          value={customStartGroupIndex}
                          onChange={(e) =>
                            setCustomStartGroupIndex(Number(e.target.value))
                          }
                        >
                          {selectedConfig.formatGroups.map((g, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <option key={i} value={i}>
                              群組 {i + 1} ({formatDescription(g.format)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <input
                      type="text"
                      className={[
                        'manifest-dialog__input',
                        customStartError && 'manifest-dialog__input--error',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      value={customStartNumber}
                      onChange={(e) =>
                        setCustomStartNumber(e.target.value.toUpperCase())
                      }
                      placeholder={preview ? `例如：${preview.first}` : ''}
                      maxLength={20}
                    />
                    {customStartError && (
                      <span className="apply-dialog__field-error">
                        {customStartError}
                      </span>
                    )}
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

                  {/* 忽略數值 0 編號 */}
                  <div className="apply-dialog__skip-zero">
                    <label className="apply-dialog__checkbox-label">
                      <input
                        type="checkbox"
                        checked={skipZeroNumbers}
                        onChange={(e) => setSkipZeroNumbers(e.target.checked)}
                      />
                      <span>忽略數值為 0 的編號</span>
                      <span className="manifest-dialog__hint">
                        （如 AB00、AAA00，但 AA10 不受影響）
                      </span>
                    </label>
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
            disabled={
              configs.length === 0 ||
              !selectedConfig ||
              isGenerating ||
              !!customStartError
            }
          >
            {isGenerating ? '產生中...' : '確認帶入'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManifestApplyDialog;
