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

interface AuthDialogContextType {
  isAuth: boolean;
  isLoginVisible: boolean;
  showLogin: () => void;
  hideLogin: () => void;
  credentials: { account: string; password: string };
  userName: string;
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
      const loginResult =
        await window.electron.authBridge.sendLogin(credentials);

      if (loginResult) {
        // Handle successful login here
        window.localStorage.setItem('user', JSON.stringify(loginResult));
        setUserName(loginResult.name);
        setIsAuth(true);
        hideLogin();
      } else {
        // Handle login error here
        setIsAuth(false);
        showDialog({
          content: '登錄失敗，請檢查您的賬號和密碼是否正確。',
          onConfirm: hideDialog,
        });
      }
    } catch (error) {
      setIsAuth(false);
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

    const user = JSON.parse(_user);
    const loginResult = await window.electron.authBridge.sendLogin({
      account: user.account,
      password: user.password,
    });
    if (!loginResult) return;

    setCredentials({
      account: loginResult.account,
      password: loginResult.password,
    });
    setUserName(loginResult.name);
    setIsAuth(true);
  };

  return (
    <AuthDialogContext.Provider
      value={{
        isAuth,
        isLoginVisible,
        showLogin,
        hideLogin,
        userName,
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
