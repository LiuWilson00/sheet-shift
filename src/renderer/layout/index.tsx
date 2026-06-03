import React, { PropsWithChildren, useEffect, useState } from 'react';
import { useLoading } from '../contexts/loading.context';
import { useSheetSetting } from '../contexts/sheet-settings-dialog-context';
import Loading from '../components/loading';
import { useDialog } from '../contexts/dialog.context';
import { useSetting } from '../contexts/settings-dialog-context/indext';
import './style.css';
import { useAuthDialog } from '../contexts/auth-dialog-context';
import ipcApi from '../api/ipc-api';
import UserManagementDialog from '../components/user-management-dialog';

const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const { isLoading, hideLoading, showLoading, message } = useLoading();
  const [systemSettingNames, setSystemSettingNames] = useState<string[]>([]);
  const sheetSettings = useSheetSetting();
  const systemSettings = useSetting();
  const { initAuth, isAdmin, authUser } = useAuthDialog();
  const { showDialog, hideDialog } = useDialog();
  const [showUserManagement, setShowUserManagement] = useState(false);

  useEffect(() => {
    showLoading();
    ipcApi.app.init().then(async (result) => {
      hideLoading();
      if (result?.code === 'NO_GOOGLE_SHEET_SETTING') {
        sheetSettings.setIsConnected(false);
        showDialog({
          content: '尚未設定連線資訊，請先設定連線資訊。',
          onConfirm: () => {
            hideDialog();
          },
        });
        sheetSettings.showSettings();
      } else if (!result.isConnected) {
        sheetSettings.setIsConnected(false);
        showDialog({
          content: '連線異常，請確定網路環境或確認設定是否正確。',
          onConfirm: () => {
            hideDialog();
          },
        });
        sheetSettings.showSettings();
      } else {
        sheetSettings.setIsConnected(true);
      }
      initAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectionSettingsClick = () => {
    sheetSettings.showSettings(true);
  };

  const handleSystemSettingsClick = () => {
    systemSettings.showSettings();
  };

  useEffect(() => {
    if (!sheetSettings.isConnected) return;
    (async () => {
      const names = await ipcApi.settingsV2.getSheetNames();
      setSystemSettingNames(names);
    })();
  }, [sheetSettings.isConnected]);

  return (
    <div>
      <header className="layout-header">
        {/* 品牌區域 */}
        <div className="layout-header__brand">
          <span className="layout-header__logo">📊</span>
          <span className="layout-header__title">Sheet Shift</span>
        </div>

        {/* 連線狀態 */}
        <div
          className={`layout-header__status ${
            sheetSettings.isConnected
              ? 'layout-header__status--connected'
              : 'layout-header__status--disconnected'
          }`}
        >
          <span className="layout-header__status-dot" />
          <span>{sheetSettings.isConnected ? '已連線' : '未連線'}</span>
        </div>

        <div className="layout-header__divider" />

        {/* 設定按鈕 */}
        <div className="layout-header__actions">
          <button
            type="button"
            className="layout-header__btn"
            onClick={handleConnectionSettingsClick}
          >
            <span className="layout-header__btn-icon">🔗</span>
            <span>連線設定</span>
          </button>
          <button
            type="button"
            className="layout-header__btn"
            onClick={handleSystemSettingsClick}
          >
            <span className="layout-header__btn-icon">⚙️</span>
            <span>系統設定</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              className="layout-header__btn"
              onClick={() => setShowUserManagement(true)}
            >
              <span className="layout-header__btn-icon">👥</span>
              <span>使用者管理</span>
            </button>
          )}
        </div>

        <div className="layout-header__divider" />

        {/* 系統設定選擇 */}
        <div className="layout-header__setting">
          <span className="layout-header__setting-label">目前設定:</span>
          <select
            className="layout-header__select"
            value={systemSettings.settingName}
            onChange={(e) => {
              systemSettings.setSettingName(e.target.value);
            }}
          >
            <option value="default">預設</option>
            {systemSettingNames.map((name) => (
              <option key={name} value={name}>
                {name.split('_')[1] || name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {children}
      <UserManagementDialog
        isVisible={showUserManagement}
        onClose={() => setShowUserManagement(false)}
        operatorAccount={authUser?.account ?? ''}
      />
      <Loading isVisible={isLoading} message={message} />
      <span className="layout-version">v2.5</span>
    </div>
  );
};

export default Layout;
