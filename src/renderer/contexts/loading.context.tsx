import { createContext, useContext, ReactNode, useState } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  /** 顯示在轉圈下方的狀態文字（可選） */
  message: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  /** 更新狀態文字（用於長時間操作的進度回報） */
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  message: '',
  showLoading: () => {},
  hideLoading: () => {},
  setLoadingMessage: () => {},
});

interface Props {
  children: ReactNode;
}

export const LoadingProvider: React.FC<Props> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showLoading = (msg: string = '') => {
    setMessage(msg);
    setIsLoading(true);
  };
  const hideLoading = () => {
    setIsLoading(false);
    setMessage('');
  };
  const setLoadingMessage = (msg: string) => setMessage(msg);

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        message,
        showLoading,
        hideLoading,
        setLoadingMessage,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);

  return context;
};
