import { DataStore } from '../utils/data-store.tool';

interface GoogleSheetConnection {
  client_email: string;
  private_key: string;
  spreadsheet_id: string;
  isConnected: boolean;
}

// eslint-disable-next-line import/prefer-default-export
export const GoogleSheetConnectionStore = new DataStore<GoogleSheetConnection>({
  client_email: '',
  private_key: '',
  spreadsheet_id: '',
  isConnected: false,
});
