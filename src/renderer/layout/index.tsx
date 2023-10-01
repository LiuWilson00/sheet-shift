import React, { PropsWithChildren, useEffect } from 'react';
import { useLoading } from '../contexts/loading.context';
import { useSheetSetting } from '../contexts/sheet-settings-dialog-context';
import Loading from '../components/loading';
import { useDialog } from '../contexts/dialog.context';
import { useSetting } from '../contexts/settings-dialog-context/indext';
import './style.css';

const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const { isLoading, hideLoading, showLoading } = useLoading();
  const sheetSettings = useSheetSetting();
  const systemSettings = useSetting();
  const { showDialog, hideDialog } = useDialog();
  useEffect(() => {
    showLoading();
    window.electron.appStatusBridge.appStartInit().then((result) => {
      hideLoading();
      if (result?.code === 'NO_GOOGLE_SHEET_SETTING') {
        showDialog({
          content: '尚未設定連線資訊，請先設定連線資訊。',
          onConfirm: () => {
            hideDialog();
          },
        });
        sheetSettings.showSettings();
      } else if (!result.isConnected) {
        showDialog({
          content: '連線異常，請確定網路環境或確認設定是否正確。',
          onConfirm: () => {
            hideDialog();
          },
        });
        sheetSettings.showSettings();
      }
    });
  }, []);
  const handleConnectionSettingsClick = () => {
    // 根據你的邏輯，顯示連線設定的 dialog
    sheetSettings.showSettings(true);
  };

  const handleSystemSettingsClick = () => {
    // 這裡假定你已有一個類似 `useSheetSetting` 的 hook 用於系統設定
    // 例如: useSystemSetting().showSettings();
    systemSettings.showSettings();
  };

  return (
    <div>
      <header className="layout-header">
        <button onClick={handleConnectionSettingsClick}>設定連線資訊</button>
        <button onClick={handleSystemSettingsClick}>設定系統設定</button>
      </header>
      {children}
      <Loading isVisible={isLoading} />
    </div>
  );
};

export default Layout;
