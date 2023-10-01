import { IpcRendererEvent, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../constants/ipc-channels';

interface ExcelDataResult {
  path: string;
  data: Array<unknown>;
  isError: boolean;
  message?: string;
}

export const onceExcelData = (func: (data: ExcelDataResult) => void) => {
  ipcRenderer.once(IPC_CHANNELS.EXCEL_DATA, (_event, data: ExcelDataResult) =>
    func(data),
  );
};

export function sendSelectExcelFile() {
  ipcRenderer.send(IPC_CHANNELS.SELECT_EXCEL_FILE);

  return new Promise<ExcelDataResult>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.SELECT_EXCEL_FILE_COMPLATED,
      (_event, data: ExcelDataResult) => {
        resolve(data);
      },
    );
  });
}

export function sendExportDefaultSheet() {
  ipcRenderer.send(IPC_CHANNELS.EXPORT_DEFAULT_SHEET);

  return new Promise<ExcelDataResult>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.EXPORT_DEFAULT_SHEET_COMPLATED,
      (_event, data: ExcelDataResult) => {
        resolve(data);
      },
    );
  });
}

export function sendExportShopeeSheet() {
  ipcRenderer.send(IPC_CHANNELS.EXPORT_SHOPEE_SHEET);

  return new Promise<ExcelDataResult>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.EXPORT_SHOPEE_SHEET_COMPLATED,
      (_event, data: ExcelDataResult) => {
        resolve(data);
      },
    );
  });
}

export default {
  onceExcelData,
  sendSelectExcelFile,
  sendExportDefaultSheet,
  sendExportShopeeSheet,
};
