export enum IPC_CHANNELS {
  EXAMPLE = 'ipc-example',

  // App Status
  DATA_INITIALIZED = 'data-initialized',
  GET_DATA_INITIALIZED = 'get-data-initialized',
  DATA_INITIALIZED_RESPONSE = 'data-initialized-response',
  APP_START_INIT = 'app-start-init',
  APP_START_INIT_RESPONSE = 'app-start-init-response',

  // Settings
  SAVE_SETTINGS_SHEET = 'save-settings-sheet',
  SAVE_SETTINGS = 'save-settings',
  GET_SETTINGS_SHEET = 'get-settings-sheet',
  GET_SETTINGS = 'get-settings',
  SETTINGS_SHEET_RESPONSE = 'settings-sheet-response',
  SETTINGS_RESPONSE = 'settings-response',
  SETTINGS_SHEET_SAVED = 'settings-sheet-saved',
  SETTINGS_SAVED = 'settings-saved',
  IMPORT_SETTINGS_SHEET = 'import-settings-sheet',
  IMPORT_SETTINGS_SHEET_RESPONSE = 'import-settings-sheet-response',

  // Excel
  EXCEL_DATA = 'excel-data',
  SELECT_EXCEL_FILE = 'select-excel-file',
  SELECT_EXCEL_FILE_COMPLATED = 'select-excel-file-complated',
  EXPORT_DEFAULT_SHEET = 'export-default-sheet',
  EXPORT_DEFAULT_SHEET_COMPLATED = 'export-default-sheet-complated',
  EXPORT_SHOPEE_SHEET = 'export-shopee-sheet',
  EXPORT_SHOPEE_SHEET_COMPLATED = 'export-shopee-sheet-complated',
  GET_WRONG_DATA = 'get-wrong-data',
  GET_WRONG_DATA_RESPONSE = 'get-wrong-data-response',

  // Debug
  DEBUG_MESSAGE = 'debug-message',
  IPC_EXAMPLE = 'ipc-example',
}
