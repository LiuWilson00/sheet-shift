import {
  ipcMain as electronIpcMain,
  BrowserWindow as electronBrowserWindow,
} from 'electron';

import {
  saveProcessedData,
  selectExcelFile,
} from './services/excel-io.service';
import { processExcelData, processExcelDataShopee } from './services/data-process.service';
import { IPC_CHANNELS } from '../../../constants/ipc-channels';
import { DataStore } from '../../utils/data-store.tool';
import { findUnMappingData } from './services/excel-data-debugging';

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
  electronIpcMain.on(IPC_CHANNELS.EXPORT_DEFAULT_SHEET, async (event) => {
    try {
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
  });

  electronIpcMain.on(IPC_CHANNELS.EXPORT_SHOPEE_SHEET, async (event) => {
    try {
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
  });
  electronIpcMain.on(IPC_CHANNELS.GET_WRONG_DATA, async (event) => {
    if (!currentSelectedFilePath.get()) {
      event.reply(IPC_CHANNELS.GET_WRONG_DATA_RESPONSE, {
        data: {},
        isError: true,
      });
      return;
    }

    const unMappingData = findUnMappingData(currentSelectedFilePath.get());

    event.reply(IPC_CHANNELS.GET_WRONG_DATA_RESPONSE, {
      data: { unMappingData },
      isError: false,
    });
  });
}
