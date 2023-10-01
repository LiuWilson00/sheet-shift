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
  },
};

export const SettingsProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const [settings, setSettings] = useState<Settings>(settingTemplate); // 初始化設定
  const { showDialog, hideDialog } = useDialog();
  const showSettings = () => setIsSettingsVisible(true);
  const hideSettings = () => setIsSettingsVisible(false);
  const updateSettings = (newSettings: any) => setSettings(newSettings);
  const handleConfirm = () => {
    window.electron.settingBridge.sendSetting(settings).then((result) => {
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
    window.electron.settingBridge.getSetting().then((result) => {
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
            return (
              <div>
                <Input
                  label="轉換成KCP的單位數量上限"
                  name="SYSTEM_SETTING--UNIT_TRANSLATE_LIMIT"
                  value={settings.SYSTEM_SETTING.UNIT_TRANSLATE_LIMIT.toString()}
                  validationFn={validateNumber}
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
                        NET_WEIGHT_INTERVAL: parseInt(e.target.value, 10),
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
                        DEFAULT_PRICE_SETTING: value,
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
