import { useEffect, useState, useCallback, useRef } from 'react';
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
import {
  ManifestConfigDialog,
  ManifestApplyDialog,
} from '../../components/manifest-number-dialog';
import { ManifestNumberConfig } from '../../types/manifest-number';
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
  const [showManifestApply, setShowManifestApply] = useState(false);
  const [enableManifestNumber, setEnableManifestNumber] = useState(false);
  const [selectedManifestConfig, setSelectedManifestConfig] = useState('');
  const [manifestConfigs, setManifestConfigs] = useState<
    ManifestNumberConfig[]
  >([]);
  const [fileGroupCount, setFileGroupCount] = useState(0);

  // 匯出函式暫存（用於艙單編號帶入後繼續匯出）
  const pendingExportRef = useRef<
    | ((options: {
        settingName: string;
        transactionCode?: string;
      }) => Promise<{ isError: boolean; path: string }>)
    | null
  >(null);

  useEffect(() => {
    const storedIsNeedAI = window.localStorage.getItem('isNeedAI');
    setIsNeedAI(storedIsNeedAI === 'true');

    const storedBatchAIClassify =
      window.localStorage.getItem('batchAIClassify');
    setIsNeedBatchAIClassify(storedBatchAIClassify === 'true');
  }, []);

  // 從 API 載入艙單編號設定
  const loadManifestConfigs = useCallback(async () => {
    try {
      const configs = await ipcApi.manifestNumber.getConfigs();
      setManifestConfigs(configs);
      if (configs.length > 0 && !selectedManifestConfig) {
        setSelectedManifestConfig(configs[0].settingName);
      }
    } catch (err) {
      homeLogger.warn('載入艙單編號設定失敗', { error: err });
    }
  }, [selectedManifestConfig]);

  // 初始化時載入設定
  useEffect(() => {
    if (isAuth) {
      loadManifestConfigs();
    }
  }, [isAuth, loadManifestConfigs]);

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
      exportFn: (options: {
        settingName: string;
        transactionCode?: string;
      }) => Promise<{
        isError: boolean;
        path: string;
      }>,
      transactionCode?: string,
    ) => {
      showLoading();
      const result = await exportFn({ settingName, transactionCode });
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

      showDialog({
        content: `檔案已匯出，檔案路徑：${result.path}`,
        onConfirm: () => {
          hideDialog();
        },
      });
    },
    [settingName, showLoading, hideLoading, showDialog, hideDialog],
  );

  // 開啟艙單編號 Dialog 前先計算檔案群組數量
  const openManifestApplyDialog = useCallback(async () => {
    const result = await ipcApi.excel.countFileGroups();
    if (!result.isError) {
      setFileGroupCount(result.groupCount);
    }
    setShowManifestApply(true);
  }, []);

  // 點擊匯出按鈕：如果啟用艙單編號則先開啟帶入 Dialog，否則直接匯出
  const handleExportClick = useCallback(
    (
      exportFn: (options: {
        settingName: string;
        transactionCode?: string;
      }) => Promise<{ isError: boolean; path: string }>,
    ) => {
      if (enableManifestNumber && manifestConfigs.length > 0) {
        pendingExportRef.current = exportFn;
        openManifestApplyDialog();
      } else {
        handleExport(exportFn);
      }
    },
    [
      enableManifestNumber,
      manifestConfigs,
      handleExport,
      openManifestApplyDialog,
    ],
  );

  // 艙單編號帶入完成的回調
  const handleManifestApply = useCallback(
    async (numbers: string[], endNumber: string, transactionCode?: string) => {
      homeLogger.info('艙單編號帶入完成', {
        count: numbers.length,
        endNumber,
        hasTransactionCode: !!transactionCode,
      });

      // 重新載入設定以更新 currentNumber
      loadManifestConfigs();

      // 檢查是否有待執行的匯出函式
      const exportFn = pendingExportRef.current;
      if (exportFn) {
        // 一般匯出流程：使用交易代碼執行匯出
        pendingExportRef.current = null;
        handleExport(exportFn, transactionCode);
      } else {
        // 分艙編號專用流程：僅帶入艙單號，不做資料轉換
        showLoading();
        const result = await ipcApi.excel.applyManifestNumberOnly({
          configName: selectedManifestConfig,
          transactionCode,
          numbers,
        });
        hideLoading();

        if (result.isError) {
          showDialog({
            content: `分艙編號失敗：${result.message || '未知錯誤'}`,
            onConfirm: () => {
              hideDialog();
            },
          });
          return;
        }

        showDialog({
          content: `分艙編號完成，共處理 ${result.rowCount} 行資料。\n檔案路徑：${result.path}`,
          onConfirm: () => {
            hideDialog();
          },
        });
      }
    },
    [
      handleExport,
      loadManifestConfigs,
      selectedManifestConfig,
      showLoading,
      hideLoading,
      showDialog,
      hideDialog,
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

  // 儲存艙單編號設定到 API
  const handleSaveManifestConfig = useCallback(
    async (config: ManifestNumberConfig) => {
      try {
        await ipcApi.manifestNumber.saveConfig(config);
        // 重新載入設定
        await loadManifestConfigs();
        showDialog({
          content: `設定「${config.settingName}」已儲存`,
          onConfirm: () => {
            hideDialog();
          },
        });
      } catch (err) {
        showDialog({
          content: `儲存設定失敗：${
            err instanceof Error ? err.message : '未知錯誤'
          }`,
          onConfirm: () => {
            hideDialog();
          },
        });
      }
    },
    [showDialog, hideDialog, loadManifestConfigs],
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

      {/* 艙單編號帶入 Dialog */}
      <ManifestApplyDialog
        isOpen={showManifestApply}
        onClose={() => {
          setShowManifestApply(false);
          pendingExportRef.current = null;
        }}
        onApply={handleManifestApply}
        configs={manifestConfigs}
        rowCount={fileGroupCount}
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
              title="台北港格式"
              description="標準輸出"
              icon="🏢"
              onClick={() => handleExportClick(ipcApi.excel.exportTaipeiBay)}
            />
            <ExportCard
              title="高雄超峰格式"
              description="蝦皮新版基礎"
              icon="🚚"
              onClick={() =>
                handleExportClick(ipcApi.excel.exportKaohsiungChaofeng)
              }
            />
            <ExportCard
              title="蝦皮格式"
              description="Shopee"
              icon="🛒"
              onClick={() => handleExportClick(ipcApi.excel.exportShopee)}
            />
            <ExportCard
              title="沛寶.速派格式"
              description="ShopeeNew"
              icon="🛍️"
              badge="NEW"
              badgeType="success"
              onClick={() => handleExportClick(ipcApi.excel.exportShopeeNew)}
            />
            <ExportCard
              title="天馬格式"
              description="Pegasus"
              icon="🐴"
              onClick={() => handleExportClick(ipcApi.excel.exportPegasus)}
            />
            <ExportCard
              title="分艙編號"
              description="僅帶入艙單號"
              icon="🔢"
              onClick={() => {
                if (manifestConfigs.length > 0) {
                  pendingExportRef.current = null; // 清除之前的匯出函式
                  openManifestApplyDialog();
                } else {
                  showDialog({
                    content: '請先設定艙單編號',
                    onConfirm: () => {
                      hideDialog();
                      setShowManifestConfig(true);
                    },
                  });
                }
              }}
            />
          </div>
        </div>
      )}

      <DebugConsole />
    </div>
  );
}

export default Home;
