import React, {
  createContext,
  useState,
  useContext,
  PropsWithChildren,
  useEffect,
} from 'react';
import Dialog from '../../components/dialog';
import Input from '../../components/input';
import { useLoading } from '../loading.context';
import { useDialog } from '../dialog.context';
import ipcApi from '../../api/ipc-api';
import type { AppUser } from '../../../shared/permission.types';

interface AuthDialogContextType {
  isAuth: boolean;
  isLoginVisible: boolean;
  showLogin: () => void;
  hideLogin: () => void;
  credentials: { account: string; password: string };
  userName: string;
  /** 目前登入的使用者（含 role 與 permissions），未登入為 null */
  authUser: AppUser | null;
  /** 是否為管理員 */
  isAdmin: boolean;
  updateCredentials: (newCredentials: {
    account: string;
    password: string;
  }) => void;
  initAuth: () => void;
}

const defaultCredentials = {
  account: '',
  password: '',
};

const AuthDialogContext = createContext<AuthDialogContextType | undefined>(
  undefined,
);

export const AuthDialogProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const { showLoading, hideLoading } = useLoading();
  const [isLoginVisible, setIsLoginVisible] = useState(false);
  const { showDialog, hideDialog } = useDialog();
  const [credentials, setCredentials] = useState(defaultCredentials);
  const [userName, setUserName] = useState<string>('');
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<AppUser | null>(null);

  const showLogin = () => setIsLoginVisible(true);
  const hideLogin = () => setIsLoginVisible(false);

  const updateCredentials = (newCredentials: {
    account: string;
    password: string;
  }) => {
    setCredentials(newCredentials);
  };

  const handleConfirm = async () => {
    showLoading();
    try {
      const loginResult = await ipcApi.auth.login(credentials);

      if (loginResult) {
        // 登入成功：loginResult 為已解析的 AppUser（不含密碼）
        window.localStorage.setItem('user', JSON.stringify(loginResult));
        setAuthUser(loginResult);
        setUserName(loginResult.name);
        setIsAuth(true);
        hideLogin();
      } else {
        // Handle login error here
        setIsAuth(false);
        setAuthUser(null);
        showDialog({
          content: '登錄失敗，請檢查您的賬號和密碼是否正確。',
          onConfirm: hideDialog,
        });
      }
    } catch (error) {
      setIsAuth(false);
      setAuthUser(null);
      showDialog({
        content: '發生錯誤，請稍後再試。',
        onConfirm: hideDialog,
      });
    }
    hideLoading();
  };

  const initAuth = async () => {
    const _user = window.localStorage.getItem('user');

    if (!_user) return;

    try {
      // localStorage 存的是 AppUser（含 role/permissions，不含密碼）
      // 直接還原登入狀態，不再以密碼重新登入
      const user = JSON.parse(_user) as Partial<AppUser>;
      if (!user || !user.account || !user.role) return;

      const restored: AppUser = {
        name: user.name ?? '',
        account: user.account,
        role: user.role,
        permissions: user.permissions ?? null,
      };
      setAuthUser(restored);
      setCredentials({ account: restored.account, password: '' });
      setUserName(restored.name);
      setIsAuth(true);
    } catch {
      // 舊格式或損毀資料：清除並要求重新登入
      window.localStorage.removeItem('user');
    }
  };

  return (
    <AuthDialogContext.Provider
      value={{
        isAuth,
        isLoginVisible,
        showLogin,
        hideLogin,
        userName,
        authUser,
        isAdmin: authUser?.role === 'admin',
        credentials,
        updateCredentials,
        initAuth,
      }}
    >
      {isLoginVisible ? (
        <Dialog
          title="Login"
          showMask
          showCancel
          onConfirm={handleConfirm}
          onCancel={hideLogin}
          contentRender={() => (
            <div>
              <Input
                label="Account"
                name="account"
                onChange={(e) =>
                  updateCredentials({ ...credentials, account: e.target.value })
                }
                defaultValue={credentials.account}
              />
              <Input
                type="password"
                label="Password"
                name="password"
                onChange={(e) =>
                  updateCredentials({
                    ...credentials,
                    password: e.target.value,
                  })
                }
                defaultValue={credentials.password}
              />
            </div>
          )}
        />
      ) : (
        <></>
      )}
      {isLoginVisible}
      {children}
    </AuthDialogContext.Provider>
  );
};

export const useAuthDialog = () => {
  const context = useContext(AuthDialogContext);
  if (!context) {
    throw new Error('useAuthDialog must be used within an AuthDialogProvider');
  }
  return context;
};
