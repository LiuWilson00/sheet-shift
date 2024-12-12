import React, {
  createContext,
  useState,
  useContext,
  PropsWithChildren,
  useEffect,
} from 'react';
import Dialog from '../../components/dialog';
import Input from '../../components/input';
import { Settings } from '../../../main/utils/setting.tool';
import NumberRange from '../../components/number-range';
import { useDialog } from '../dialog.context';

interface SettingsContextType {
  isSettingsVisible: boolean;
  showSettings: () => void;
  hideSettings: () => void;
  settings: any; // 您可以根據需要更詳細地定義這裡的型態
  setSettingName: (names: string) => void;
  settingName: string;
  updateSettings: (newSettings: any) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);
const settingTemplate: Settings = {
  SYSTEM_SETTING: {
    UNIT_TRANSLATE_LIMIT: 0,
    NET_WEIGHT_INTERVAL: 0,
    KPC_NUMBER: 0,
  },
  DEFAULT_PRICE_SETTING: {
    OPE_PIECE: [0, 0],
    TWO_PIECE: [0, 0],
    THREE_OR_MORE_PIECES: [0, 0],
    ADJUSTMENT_RATE: [0, 0],
    PEGASUS_OPE_PIECE: [0, 0],
    PEGASUS_TWO_PIECE: [0, 0],
  },
};
const AUTH_CODE = '8800885';

export const SettingsProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [settings, setSettings] = useState<Settings>(settingTemplate); // 初始化設定
  const [settingName, setSettingName] = useState<string>('default');
  const { showDialog, hideDialog } = useDialog();
  const showSettings = () => setIsSettingsVisible(true);
  const hideSettings = () => setIsSettingsVisible(false);
  const updateSettings = (newSettings: any) => setSettings(newSettings);
  const handleConfirm = () => {
    if (!isAuth) {
      if (authCode === AUTH_CODE) {
        setIsAuth(true);
      } else {
        showDialog({
          content: '驗證碼錯誤',
          onConfirm: () => {
            hideDialog();
          },
        });
      }
      return;
    }
    console.log('settings', settings);
    window.electron.settingBridge
      .sendSetting(settings, settingName)
      .then((result) => {
        if (result) {
          showDialog({
            content: '儲存成功',
            onConfirm: () => {
              hideDialog();
            },
          });
          hideSettings();
        } else {
          showDialog({
            content: '儲存失敗',
            onConfirm: () => {
              hideDialog();
            },
          });
        }
      });
  };

  const handleCancel = () => {
    hideSettings();
  };

  const validateNumber = (value: string) => {
    if (isNaN(Number(value))) {
      return 'Please enter a valid number';
    }
    return null; // 沒有錯誤
  };
  useEffect(() => {
    if (!isSettingsVisible) return;
    window.electron.settingBridge.getSetting(settingName).then((result) => {
      if (result) {
        setSettings(result);
      }
    });
  }, [isSettingsVisible]);

  return (
    <SettingsContext.Provider
      value={{
        isSettingsVisible,
        showSettings,
        hideSettings,
        settings,
        updateSettings,
        setSettingName,
        settingName,
      }}
    >
      {isSettingsVisible ? (
        <Dialog
          title="System Settings"
          showMask={true}
          width="80%"
          height="80%"
          showCancel={true}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          contentRender={() => {
            return !isAuth ? (
              <div className="settings-auth">
                <Input
                  label="請輸入驗證碼"
                  name="AUTH_CODE"
                  value={authCode}
                  onChange={(e) => {
                    setAuthCode(e.target.value);
                  }}
                />
              </div>
            ) : (
              <div className="settings">
                <Input
                  label="轉換成KCP的單位數量上限"
                  name="SYSTEM_SETTING--UNIT_TRANSLATE_LIMIT"
                  value={settings.SYSTEM_SETTING.UNIT_TRANSLATE_LIMIT.toString()}
                  validationFn={validateNumber}
                  type="number"
                  onChange={(e) => {
                    updateSettings({
                      ...settings,
                      SYSTEM_SETTING: {
                        ...settings.SYSTEM_SETTING,
                        UNIT_TRANSLATE_LIMIT: parseInt(e.target.value, 10),
                      },
                    });
                  }}
                />
                <Input
                  label="KCP的單位數量"
                  name="SYSTEM_SETTING--KPC_NUMBER"
                  value={settings.SYSTEM_SETTING.KPC_NUMBER.toString()}
                  validationFn={validateNumber}
                  type="number"
                  onChange={(e) => {
                    updateSettings({
                      ...settings,
                      SYSTEM_SETTING: {
                        ...settings.SYSTEM_SETTING,
                        KPC_NUMBER: parseInt(e.target.value, 10),
                      },
                    });
                  }}
                />
                <Input
                  label="淨重每次要扣除的值"
                  name="SYSTEM_SETTING--NET_WEIGHT_INTERVAL"
                  value={settings.SYSTEM_SETTING.NET_WEIGHT_INTERVAL.toString()}
                  validationFn={validateNumber}
                  onChange={(e) => {
                    updateSettings({
                      ...settings,
                      SYSTEM_SETTING: {
                        ...settings.SYSTEM_SETTING,
                        NET_WEIGHT_INTERVAL: e.target.value,
                      },
                    });
                  }}
                />
                <h2 style={{ marginTop: 20 }}>單件物品的價格</h2>
                <NumberRange
                  label="一件"
                  value={settings.DEFAULT_PRICE_SETTING.OPE_PIECE}
                  onChange={(value) => {
                    updateSettings({
                      ...settings,
                      DEFAULT_PRICE_SETTING: {
                        ...settings.DEFAULT_PRICE_SETTING,
                        OPE_PIECE: value,
                      },
                    });
                  }}
                />
                <NumberRange
                  label="兩件"
                  value={settings.DEFAULT_PRICE_SETTING.TWO_PIECE}
                  onChange={(value) => {
                    updateSettings({
                      ...settings,
                      DEFAULT_PRICE_SETTING: {
                        ...settings.DEFAULT_PRICE_SETTING,
                        TWO_PIECE: value,
                      },
                    });
                  }}
                />
                <NumberRange
                  label="三件以上"
                  value={settings.DEFAULT_PRICE_SETTING.THREE_OR_MORE_PIECES}
                  onChange={(value) => {
                    updateSettings({
                      ...settings,
                      DEFAULT_PRICE_SETTING: {
                        ...settings.DEFAULT_PRICE_SETTING,
                        THREE_OR_MORE_PIECES: value,
                      },
                    });
                  }}
                />

                <NumberRange
                  label="調整倍率"
                  value={settings.DEFAULT_PRICE_SETTING.ADJUSTMENT_RATE}
                  onChange={(value) => {
                    updateSettings({
                      ...settings,
                      DEFAULT_PRICE_SETTING: {
                        ...settings.DEFAULT_PRICE_SETTING,
                        ADJUSTMENT_RATE: value,
                      },
                    });
                  }}
                  needParseFloat={true}
                />
                <NumberRange
                  label="天馬一件"
                  value={settings.DEFAULT_PRICE_SETTING.PEGASUS_OPE_PIECE}
                  onChange={(value) => {
                    updateSettings({
                      ...settings,
                      DEFAULT_PRICE_SETTING: {
                        ...settings.DEFAULT_PRICE_SETTING,
                        PEGASUS_OPE_PIECE: value,
                      },
                    });
                  }}
                />
                <NumberRange
                  label="天馬兩件以上"
                  value={settings.DEFAULT_PRICE_SETTING.PEGASUS_TWO_PIECE}
                  onChange={(value) => {
                    updateSettings({
                      ...settings,
                      DEFAULT_PRICE_SETTING: {
                        ...settings.DEFAULT_PRICE_SETTING,
                        PEGASUS_TWO_PIECE: value,
                      },
                    });
                  }}
                />
                <span style={{ color: 'gray', fontSize: 12 }}>
                  調整倍率會確保每個物品總金額欄位有一點偏差，乘上一個隨機的倍率
                </span>
              </div>
            );
          }}
        />
      ) : (
        <></>
      )}
      {children}
    </SettingsContext.Provider>
  );
};
export const useSetting = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
