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
    const savedResult =
      await window.electron.settingBridge.sendSettingSheet(settings);
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

    const initResult = await window.electron.appStatusBridge.appStartInit();

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
    window.electron.settingBridge.getSettingSheet().then((result) => {
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
          title="Google Sheet Settings"
          showMask={true}
          width="80%"
          height="80%"
          showCancel={isCancelEnable}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          contentRender={() => {
            return (
              <div>
                <h3>連線資訊</h3>
                <Input
                  label="client_email"
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
                  label="private_key"
                  name="private_key"
                  onChange={(e) => {
                    updateSettings({
                      ...settings,
                      private_key: e.target.value,
                    });
                  }}
                  defaultValue={settings.private_key || ''}
                />
                <h3>表單資訊</h3>
                <Input
                  label="spreadsheet_id"
                  name="spreadsheet_id"
                  onChange={(e) => {
                    updateSettings({
                      ...settings,
                      spreadsheet_id: e.target.value,
                    });
                  }}
                  defaultValue={settings.spreadsheet_id || ''}
                />
                <button
                  style={{
                    marginTop: '20px',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ccc',
                    padding: '5px 10px',
                    borderRadius: '5px',
                  }}
                  onClick={async () => {
                    showLoading();
                    const result =
                      await window.electron.settingBridge.importSettingSheet(
                        settings,
                      );
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
                    await window.electron.appStatusBridge.appStartInit();

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
                  匯入連線設定檔
                </button>
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
