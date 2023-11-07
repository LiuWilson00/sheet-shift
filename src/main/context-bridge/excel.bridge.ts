import { IpcRendererEvent, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../constants/ipc-channels';
import {
  ProductNameMapping,
  ProductTariffCodeMap,
  SheetData,
} from '../modules/excel-hanlders/index.interface';

interface BaseResult {
  isError: boolean;
  message?: string;
}

interface ExcelDataResult extends BaseResult {
  path: string;
  data: Array<unknown>;
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

export function sendExportDefaultSheet(settingName: string) {
  ipcRenderer.send(IPC_CHANNELS.EXPORT_DEFAULT_SHEET, settingName);

  return new Promise<ExcelDataResult>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.EXPORT_DEFAULT_SHEET_COMPLATED,
      (_event, data: ExcelDataResult) => {
        resolve(data);
      },
    );
  });
}

export function sendExportShopeeSheet(settingName: string) {
  ipcRenderer.send(IPC_CHANNELS.EXPORT_SHOPEE_SHEET, settingName);

  return new Promise<ExcelDataResult>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.EXPORT_SHOPEE_SHEET_COMPLATED,
      (_event, data: ExcelDataResult) => {
        resolve(data);
      },
    );
  });
}

interface WrongData extends BaseResult {
  data: {
    unMappingData: Array<SheetData>;
  };
}

export function sendGetWrongData() {
  ipcRenderer.send(IPC_CHANNELS.GET_WRONG_DATA);

  return new Promise<WrongData>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.GET_WRONG_DATA_RESPONSE,
      (_event, data: WrongData) => {
        resolve(data);
      },
    );
  });
}

interface AddNewProductMap extends BaseResult {
  data: boolean;
}

export function sendAddNewProductMap(data: ProductNameMapping[]) {
  ipcRenderer.send(IPC_CHANNELS.ADD_NEW_PRODUCT_MAP, data);

  return new Promise<AddNewProductMap>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.ADD_NEW_PRODUCT_MAP_RESPONSE,
      (_event, data: AddNewProductMap) => {
        resolve(data);
      },
    );
  });
}

interface ProductTariffCodeMapResult extends BaseResult {
  data: ProductTariffCodeMap[];
}

export function sendGetProductMap() {
  ipcRenderer.send(IPC_CHANNELS.GET_PRODUCT_MAP);

  return new Promise<ProductTariffCodeMapResult>((resolve, reject) => {
    ipcRenderer.once(
      IPC_CHANNELS.GET_PRODUCT_MAP_RESPONSE,
      (_event, data: ProductTariffCodeMapResult) => {
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
  sendGetWrongData,
  sendAddNewProductMap,
  sendGetProductMap,
};
