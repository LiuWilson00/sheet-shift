import React, {
  createContext,
  useState,
  useContext,
  PropsWithChildren,
} from 'react';
import Dialog from '../components/dialog';

interface DialogContextType {
  showDialog: (options: DialogOptions) => void;
  hideDialog: () => void;
}

interface DialogOptions {
  title?: string;
  content: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [dialogOptions, setDialogOptions] = useState<DialogOptions | null>(
    null,
  );

  const showDialog = (options: DialogOptions) => {
    setDialogOptions(options);
  };

  const hideDialog = () => {
    setDialogOptions(null);
  };

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      {dialogOptions && <Dialog {...dialogOptions} />}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
