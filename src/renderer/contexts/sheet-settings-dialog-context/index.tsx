import React, {
  createContext,
  useState,
  useContext,
  PropsWithChildren,
  useEffect,
} from 'react';
import Dialog from '../../components/dialog';
import Input from '../../components/input';
import Textarea from '../../components/textarea';
import { useLoading } from '../loading.context';
import { useDialog } from '../dialog.context';
import ipcApi from '../../api/ipc-api';

interface SheetSettingsContextType {
  isSettingsVisible: boolean;
  showSettings: (isCancelEnable?: boolean) => void;
  hideSettings: () => void;
  settings: any; // 您可以根據需要更詳細地定義這裡的型態
  updateSettings: (newSettings: any) => void;
  isConnected: boolean;
  setIsConnected: (isConnected: boolean) => void;
}

const defualtSheetSettings = {
  client_email: '',
  private_key: '',
  spreadsheet_id: '',
};

const SheetSettingsContext = createContext<
  SheetSettingsContextType | undefined
>(undefined);

export const SheetSettingsProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const { showLoading, hideLoading } = useLoading();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isCancelEnable, setIsCancelEnable] = useState(false);
  const { showDialog, hideDialog } = useDialog();
  const [settings, setSettings] = useState(defualtSheetSettings); // 初始化設定
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const showSettings = (cancelButtonEnable = false) => {
    setIsCancelEnable(cancelButtonEnable);
    setIsSettingsVisible(true);
  };
  const hideSettings = () => setIsSettingsVisible(false);
  const updateSettings = (newSettings: any) => setSettings(newSettings);
  const handleConfirm = async () => {
    // 儲存設定的邏輯
    showLoading();
    console.log('settings');
    const savedResult = await ipcApi.settingsV2.saveSheet(settings);
    if (savedResult) {
      hideSettings();
    } else {
      showDialog({
        content: '儲存失敗，請確認連線資訊是否正確。',
        onConfirm: () => {
          hideDialog();
        },
      });
    }

    const initResult = await ipcApi.app.init();

    if (!initResult.isConnected) {
      showDialog({
        content: '連線異常，請確定網路環境或確認設定是否正確。',
        onConfirm: () => {
          hideDialog();
        },
      });
      showSettings();
      setIsConnected(false);
    } else {
      setIsConnected(true);
    }

    hideLoading();
  };

  const handleCancel = () => {
    hideSettings();
  };

  useEffect(() => {
    if (!isSettingsVisible) return;
    ipcApi.settingsV2.getSheet({}).then((result) => {
      if (result) {
        setSettings(result);
      } else {
        setSettings(defualtSheetSettings);
      }
    });
  }, [isSettingsVisible]);

  const validateNumber = (value: string) => {
    if (isNaN(Number(value))) {
      return 'Please enter a valid number';
    }
    return null; // 沒有錯誤
  };
  return (
    <SheetSettingsContext.Provider
      value={{
        isSettingsVisible,
        showSettings,
        hideSettings,
        settings,
        updateSettings,
        isConnected,
        setIsConnected,
      }}
    >
      {isSettingsVisible ? (
        <Dialog
          title="Google Sheet 連線設定"
          showMask={true}
          variant="settings"
          showCancel={isCancelEnable}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          contentRender={() => {
            return (
              <div>
                {/* 連線資訊區塊 */}
                <div className="settings-section">
                  <div className="settings-section__title">
                    <span className="settings-section__title-icon">🔐</span>
                    <span>連線資訊</span>
                  </div>
                  <div className="settings-section__content">
                    <Input
                      label="Client Email"
                      name="client_email"
                      onChange={(e) => {
                        updateSettings({
                          ...settings,
                          client_email: e.target.value,
                        });
                      }}
                      defaultValue={settings.client_email || ''}
                    />
                    <Textarea
                      label="Private Key"
                      name="private_key"
                      onChange={(e) => {
                        updateSettings({
                          ...settings,
                          private_key: e.target.value,
                        });
                      }}
                      defaultValue={settings.private_key || ''}
                    />
                  </div>
                </div>

                {/* 表單資訊區塊 */}
                <div className="settings-section">
                  <div className="settings-section__title">
                    <span className="settings-section__title-icon">📊</span>
                    <span>表單資訊</span>
                  </div>
                  <div className="settings-section__content">
                    <Input
                      label="Spreadsheet ID"
                      name="spreadsheet_id"
                      onChange={(e) => {
                        updateSettings({
                          ...settings,
                          spreadsheet_id: e.target.value,
                        });
                      }}
                      defaultValue={settings.spreadsheet_id || ''}
                    />
                  </div>
                </div>

                {/* 匯入按鈕 */}
                <button
                  type="button"
                  className="import-btn"
                  onClick={async () => {
                    showLoading();
                    const result = await ipcApi.settingsV2.importSheet();
                    if (!result) {
                      showDialog({
                        content: '匯入失敗，請確認連線資訊是否正確。',
                        onConfirm: () => {
                          hideDialog();
                        },
                      });
                      hideLoading();
                      return;
                    }
                    await ipcApi.app.init();

                    hideSettings();

                    showDialog({
                      content: '匯入連線資訊成功。',
                      onConfirm: () => {
                        hideDialog();
                      },
                    });
                    hideLoading();
                  }}
                >
                  <span>📁</span>
                  <span>匯入連線設定檔</span>
                </button>
                <p className="settings-hint">
                  可直接匯入 JSON 格式的 Google Service Account 憑證檔案
                </p>
              </div>
            );
          }}
        />
      ) : (
        <></>
      )}
      {children}
    </SheetSettingsContext.Provider>
  );
};
export const useSheetSetting = () => {
  const context = useContext(SheetSettingsContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
