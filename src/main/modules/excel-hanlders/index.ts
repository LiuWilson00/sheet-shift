import {
  ipcMain as electronIpcMain,
  BrowserWindow as electronBrowserWindow,
} from 'electron';

import {
  saveProcessedData,
  selectExcelFile,
} from './services/excel-io.service';
import {
  processExcelData,
  processExcelDataShopee,
} from './services/data-process.service';
import { IPC_CHANNELS } from '../../../constants/ipc-channels';
import { DataStore } from '../../utils/data-store.tool';
import {
  classifyData,
  findUnMappingData,
} from './services/excel-data-debugging';
import {
  ProductNameMapping,
  ProductNameMappingColumnKeys,
} from './index.interface';
import {
  addSheetData,
  getProductNameMap,
  systemTariffCodeSheet,
} from '../../utils/google-sheets.tool';
import { SheetRangeName } from '../../utils/google-sheets.tool/index.const';
import { jsonGroupBy } from '../../utils';
import { setSystemSettingName } from '../../utils/setting.tool';
import { runClassifier } from '../../utils/model-run';

const currentSelectedFilePath = new DataStore<string>('');

export async function setupExcelHandlers(mainWindow: electronBrowserWindow) {
  electronIpcMain.on(IPC_CHANNELS.SELECT_EXCEL_FILE, async (event) => {
    try {
      const filePath = await selectExcelFile(mainWindow);
      if (filePath) {
        currentSelectedFilePath.set(filePath);
        event.reply(IPC_CHANNELS.SELECT_EXCEL_FILE_COMPLATED, {
          path: filePath,

          isError: false,
        });
      } else {
        event.reply(IPC_CHANNELS.SELECT_EXCEL_FILE_COMPLATED, {
          path: filePath,
          mesaage: 'No file selected',
          isError: true,
        });
      }
    } catch (error) {
      console.error(error);
      event.reply(IPC_CHANNELS.SELECT_EXCEL_FILE_COMPLATED, {
        path: '',
        data: [],
        isError: true,
        message: JSON.stringify(error),
      });
    }
  });
  electronIpcMain.on(
    IPC_CHANNELS.EXPORT_DEFAULT_SHEET,
    async (event, settingName: string) => {
      try {
        setSystemSettingName(settingName);
        if (currentSelectedFilePath.get()) {
          const completedData = await processExcelData(
            currentSelectedFilePath.get(),
          );
          const newFilePath = await saveProcessedData(
            completedData,
            currentSelectedFilePath.get(),
          );
          event.reply(IPC_CHANNELS.EXPORT_DEFAULT_SHEET_COMPLATED, {
            path: newFilePath,
            data: completedData,
            isError: false,
          });
        } else {
          event.reply(IPC_CHANNELS.EXPORT_DEFAULT_SHEET_COMPLATED, {
            path: '',
            data: [],
            isError: true,
            message: 'No file selected',
          });
        }
      } catch (error) {
        const _error = error as Error;
        console.error(error);
        event.reply(IPC_CHANNELS.EXPORT_DEFAULT_SHEET_COMPLATED, {
          path: '',
          data: [],
          isError: true,
          message: _error.message,
        });
      }
    },
  );

  electronIpcMain.on(
    IPC_CHANNELS.EXPORT_SHOPEE_SHEET,
    async (event, settingName: string) => {
      try {
        setSystemSettingName(settingName);
        if (currentSelectedFilePath.get()) {
          const completedData = await processExcelDataShopee(
            currentSelectedFilePath.get(),
          );
          const newFilePath = await saveProcessedData(
            completedData,
            currentSelectedFilePath.get(),
            true,
          );
          event.reply(IPC_CHANNELS.EXPORT_SHOPEE_SHEET_COMPLATED, {
            path: newFilePath,
            data: completedData,
            isError: false,
          });
        } else {
          event.reply(IPC_CHANNELS.EXPORT_SHOPEE_SHEET_COMPLATED, {
            path: '',
            data: [],
            isError: true,
            message: 'No file selected',
          });
        }
      } catch (error) {
        event.reply(IPC_CHANNELS.EXPORT_SHOPEE_SHEET_COMPLATED, {
          path: '',
          data: [],
          isError: true,
          message: JSON.stringify(error),
        });
      }
    },
  );
  electronIpcMain.on(
    IPC_CHANNELS.GET_WRONG_DATA,
    async (event, aiClassify: boolean) => {
      if (!currentSelectedFilePath.get()) {
        event.reply(IPC_CHANNELS.GET_WRONG_DATA_RESPONSE, {
          data: {},
          isError: true,
        });
        return;
      }

      const unMappingData = findUnMappingData(currentSelectedFilePath.get());

      event.reply(IPC_CHANNELS.GET_WRONG_DATA_RESPONSE, {
        data: {
          unMappingData: aiClassify
            ? await classifyData(unMappingData)
            : unMappingData,
        },
        isError: false,
      });
    },
  );

  electronIpcMain.on(
    IPC_CHANNELS.GET_CLASSIFY_PRODUCT_NAME,
    async (event, productName: string) => {
      const map = getProductNameMap();
      const tryClassify = await runClassifier(productName);
      const tariffcode =
        map.find(
          (i) =>
            i[ProductNameMappingColumnKeys.CorrectProductName] === tryClassify,
        )?.[ProductNameMappingColumnKeys.TariffCode] ?? '';
      event.reply(IPC_CHANNELS.GET_CLASSIFY_PRODUCT_NAME_RESPONSE, {
        data: {
          productName: productName,
          realProductName: tryClassify,
          tariffcode: tariffcode,
        },
        isError: false,
      });
    },
  );

  electronIpcMain.on(
    IPC_CHANNELS.ADD_NEW_PRODUCT_MAP,
    async (event, data: ProductNameMapping[]) => {
      await addSheetData(SheetRangeName.SystemProductMap, data, {
        jsonTransfromOptions: {
          disableAddTitle: true,
          keySorting: [
            ProductNameMappingColumnKeys.OriginalProductName,
            ProductNameMappingColumnKeys.CorrectProductName,
            ProductNameMappingColumnKeys.TariffCode,
          ],
        },
      });
      const newSystemProductMap = systemTariffCodeSheet.get();
      newSystemProductMap.push(...data);
      systemTariffCodeSheet.set(newSystemProductMap);

      event.reply(IPC_CHANNELS.ADD_NEW_PRODUCT_MAP_RESPONSE, {
        data: true,
        isError: false,
      });
    },
  );
  electronIpcMain.on(IPC_CHANNELS.GET_PRODUCT_MAP, async (event) => {
    const data = getProductNameMap();
    const dataGrouped = jsonGroupBy(
      data,
      [ProductNameMappingColumnKeys.CorrectProductName],
      (datas) => {
        return {
          [ProductNameMappingColumnKeys.CorrectProductName]:
            datas[0][ProductNameMappingColumnKeys.CorrectProductName],
          [ProductNameMappingColumnKeys.TariffCode]:
            datas[0][ProductNameMappingColumnKeys.TariffCode],
        };
      },
    );

    event.reply(IPC_CHANNELS.GET_PRODUCT_MAP_RESPONSE, {
      data: dataGrouped,
      isError: false,
    });
  });
}
