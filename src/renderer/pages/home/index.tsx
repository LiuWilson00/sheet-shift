import { useEffect, useState, useCallback } from 'react';
import './style.css';
import { useLoading } from '../../contexts/loading.context';
import { useDialog } from '../../contexts/dialog.context';
import DebugConsole from '../../components/debug-console';
import { DataDebuggingDialog } from './components/data-debugging-dialog';
import { SheetData } from '../../utils/excel.interface';
import { useAuthDialog } from '../../contexts/auth-dialog-context';
import { useSetting } from '../../contexts/settings-dialog-context/indext';
import ipcApi from '../../api/ipc-api';
import ExportCard from '../../components/export-card';
import { ManifestConfigDialog } from '../../components/manifest-number-dialog';
import {
  ManifestNumberConfig,
  DEFAULT_CONFIG,
} from '../../types/manifest-number';
import { logger } from '../../utils/logger.tool';

// 建立 Home 頁面專用的 logger
const homeLogger = logger.createChildLogger('Home');

function Home() {
  const { showDialog, hideDialog } = useDialog();
  const { showLoading, hideLoading } = useLoading();
  const [isNeedAI, setIsNeedAI] = useState<boolean>(false);
  const [isNeedBatchAIClassify, setIsNeedBatchAIClassify] =
    useState<boolean>(false);
  const [showDataDebugging, setShowDataDebugging] = useState<boolean>(false);
  const [wrongData, setWrongData] = useState<SheetData[]>([]);
  const [selectFilePath, setSelectFilePath] = useState<string>();
  const { isAuth, userName, showLogin } = useAuthDialog();
  const { settingName } = useSetting();

  // 艙單編號相關狀態
  const [showManifestConfig, setShowManifestConfig] = useState(false);
  const [enableManifestNumber, setEnableManifestNumber] = useState(false);
  const [selectedManifestConfig, setSelectedManifestConfig] =
    useState<string>('預設格式');
  const [manifestConfigs, setManifestConfigs] = useState<
    ManifestNumberConfig[]
  >([
    // Demo 用預設設定
    {
      settingName: '預設格式',
      format: DEFAULT_CONFIG.format,
      blacklist: DEFAULT_CONFIG.blacklist,
      currentNumber: 'AAA00',
      createdAt: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    const storedIsNeedAI = window.localStorage.getItem('isNeedAI');
    setIsNeedAI(storedIsNeedAI === 'true');

    const storedBatchAIClassify =
      window.localStorage.getItem('batchAIClassify');
    setIsNeedBatchAIClassify(storedBatchAIClassify === 'true');
  }, []);

  const fetchData = useCallback(async () => {
    showLoading();
    const result = await ipcApi.excel.selectFile();
    hideLoading();
    if (result.isError && result.path !== null) {
      showDialog({
        content: '上傳失敗，請確認檔案是否正確。',
        onConfirm: () => {
          hideDialog();
        },
      });
    }

    setSelectFilePath(result.path);
  }, [showLoading, hideLoading, showDialog, hideDialog]);

  const handleExport = useCallback(
    async (
      exportFn: (options: { settingName: string }) => Promise<{
        isError: boolean;
        path: string;
      }>,
    ) => {
      showLoading();
      const result = await exportFn({ settingName });
      hideLoading();
      if (result.isError) {
        showDialog({
          content: '匯出失敗，請確認檔案是否正確。',
          onConfirm: () => {
            hideDialog();
          },
        });
        return;
      }

      // Demo: 如果啟用艙單編號，顯示會處理的提示
      let message = `檔案已匯出，檔案路徑：${result.path}`;
      if (enableManifestNumber) {
        const config = manifestConfigs.find(
          (c) => c.settingName === selectedManifestConfig,
        );
        if (config) {
          message += `\n\n已套用艙單編號設定：${selectedManifestConfig}（Demo 模式）`;
        }
      }

      showDialog({
        content: message,
        onConfirm: () => {
          hideDialog();
        },
      });
    },
    [
      settingName,
      showLoading,
      hideLoading,
      showDialog,
      hideDialog,
      enableManifestNumber,
      manifestConfigs,
      selectedManifestConfig,
    ],
  );

  const originalDataDebugging = useCallback(async () => {
    homeLogger.info('開始資料前處理', { isNeedBatchAIClassify });
    showLoading();
    const wrongDataResult = await ipcApi.excel.getWrongData({
      aiClassify: isNeedBatchAIClassify,
    });
    hideLoading();

    homeLogger.debug('getWrongData 回傳結果', {
      isError: wrongDataResult.isError,
      dataKeys: wrongDataResult.data ? Object.keys(wrongDataResult.data) : null,
      unMappingDataLength: wrongDataResult.data?.unMappingData?.length ?? 0,
    });

    if (wrongDataResult.isError) {
      homeLogger.warn('getWrongData 回傳錯誤');
      return;
    }

    homeLogger.info('設定 wrongData', {
      count: wrongDataResult.data.unMappingData?.length ?? 0,
      firstItem: wrongDataResult.data.unMappingData?.[0],
    });

    setWrongData(wrongDataResult.data.unMappingData);
    setShowDataDebugging(true);
  }, [isNeedBatchAIClassify, showLoading, hideLoading]);

  const toggleOption = useCallback(
    (key: 'isNeedAI' | 'batchAIClassify', currentValue: boolean) => {
      const newValue = !currentValue;
      window.localStorage.setItem(key, newValue.toString());
      if (key === 'isNeedAI') {
        setIsNeedAI(newValue);
      } else {
        setIsNeedBatchAIClassify(newValue);
      }
    },
    [],
  );

  const handleSaveManifestConfig = useCallback(
    (config: ManifestNumberConfig) => {
      setManifestConfigs((prev) => {
        const existingIndex = prev.findIndex(
          (c) => c.settingName === config.settingName,
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = config;
          return updated;
        }
        return [...prev, config];
      });

      showDialog({
        content: `設定「${config.settingName}」已儲存（Demo 模式）`,
        onConfirm: () => {
          hideDialog();
        },
      });
    },
    [showDialog, hideDialog],
  );

  const hasFile =
    selectFilePath !== undefined &&
    selectFilePath !== '' &&
    selectFilePath !== null;

  return (
    <div className="home-context">
      <DataDebuggingDialog
        show={showDataDebugging}
        isNeedAI={isNeedAI}
        setShow={setShowDataDebugging}
        wrongData={wrongData}
        setWrongData={setWrongData}
      />

      {/* 艙單編號設定 Dialog */}
      <ManifestConfigDialog
        isOpen={showManifestConfig}
        onClose={() => setShowManifestConfig(false)}
        onSave={handleSaveManifestConfig}
      />

      {/* 歡迎區塊 */}
      <div className="welcome-section">
        <h1 className="welcome-section__title">
          {isAuth ? `歡迎, ${userName}` : 'Sheet Shift'}
        </h1>
        <p className="welcome-section__subtitle">快速處理電商物流表單</p>
      </div>

      {/* 上傳區塊 */}
      {!hasFile && (
        <div className="upload-section">
          <div className="upload-card">
            <div className="upload-card__icon">📁</div>
            <h2 className="upload-card__title">上傳 Excel 檔案</h2>
            <p className="upload-card__desc">支援 .xlsx 和 .xls 格式</p>
            {isAuth ? (
              <button
                type="button"
                className="upload-card__btn"
                onClick={fetchData}
                disabled={hasFile}
              >
                選擇檔案
              </button>
            ) : (
              <button
                type="button"
                className="upload-card__btn upload-card__btn--login"
                onClick={showLogin}
              >
                請先登入
              </button>
            )}
          </div>
        </div>
      )}

      {/* 檔案資訊區塊 */}
      {hasFile && (
        <div className="file-info-section">
          <div className="file-info-card">
            <div className="file-info-card__header">
              <div className="file-info-card__path">
                <span className="file-info-card__icon">📄</span>
                <span className="file-info-card__text" title={selectFilePath}>
                  {selectFilePath}
                </span>
              </div>
              <button
                type="button"
                className="file-info-card__reupload"
                onClick={() => setSelectFilePath(undefined)}
              >
                重新選擇
              </button>
            </div>

            <div className="file-info-card__options">
              <label className="file-info-card__option">
                <input
                  type="checkbox"
                  checked={isNeedAI}
                  onChange={() => toggleOption('isNeedAI', isNeedAI)}
                />
                <span>智能辨識</span>
              </label>
              <label className="file-info-card__option">
                <input
                  type="checkbox"
                  checked={isNeedBatchAIClassify}
                  onChange={() =>
                    toggleOption('batchAIClassify', isNeedBatchAIClassify)
                  }
                />
                <span>批量智能辨識</span>
              </label>
            </div>

            {/* 艙單編號選項 */}
            <div className="file-info-card__manifest">
              <div className="file-info-card__manifest-row">
                <label className="file-info-card__option">
                  <input
                    type="checkbox"
                    checked={enableManifestNumber}
                    onChange={() =>
                      setEnableManifestNumber(!enableManifestNumber)
                    }
                  />
                  <span>自動帶入艙單編號</span>
                </label>
                <button
                  type="button"
                  className="file-info-card__manifest-config"
                  onClick={() => setShowManifestConfig(true)}
                >
                  ⚙️ 設定
                </button>
              </div>
              {enableManifestNumber && manifestConfigs.length > 0 && (
                <div className="file-info-card__manifest-select">
                  <span>使用設定:</span>
                  <select
                    value={selectedManifestConfig}
                    onChange={(e) => setSelectedManifestConfig(e.target.value)}
                  >
                    {manifestConfigs.map((config) => (
                      <option
                        key={config.settingName}
                        value={config.settingName}
                      >
                        {config.settingName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="file-info-card__preprocess">
              <button
                type="button"
                className="file-info-card__preprocess-btn"
                onClick={originalDataDebugging}
              >
                進行資料前處理
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 匯出按鈕區塊 */}
      {hasFile && (
        <div className="export-section">
          <h2 className="export-section__title">選擇匯出格式</h2>
          <div className="export-section__grid">
            <ExportCard
              title="預設格式"
              description="標準輸出"
              icon="📋"
              onClick={() => handleExport(ipcApi.excel.exportDefault)}
            />
            <ExportCard
              title="預設格式"
              description="含重量處理"
              icon="⚖️"
              onClick={() => handleExport(ipcApi.excel.exportDefaultWithWeight)}
            />
            <ExportCard
              title="蝦皮格式"
              description="Shopee"
              icon="🛒"
              onClick={() => handleExport(ipcApi.excel.exportShopee)}
            />
            <ExportCard
              title="蝦皮格式"
              description="新版"
              icon="🛍️"
              badge="NEW"
              badgeType="success"
              onClick={() => handleExport(ipcApi.excel.exportShopeeNew)}
            />
            <ExportCard
              title="天馬格式"
              description="Pegasus"
              icon="🐴"
              onClick={() => handleExport(ipcApi.excel.exportPegasus)}
            />
            <ExportCard
              title="台北灣"
              description="即將推出"
              icon="🏢"
              badge="SOON"
              badgeType="warning"
              disabled
              onClick={() => {}}
            />
            <ExportCard
              title="高雄超峰"
              description="即將推出"
              icon="🚚"
              badge="SOON"
              badgeType="warning"
              disabled
              onClick={() => {}}
            />
          </div>
        </div>
      )}

      <DebugConsole />
    </div>
  );
}

export default Home;
