/**
 * 使用者權限相關型別與常數（前後端共用）
 *
 * 此檔為「受控匯出按鈕 key」的單一事實來源，
 * 首頁匯出按鈕設定與 Admin 權限編輯 UI 皆從此取用，避免兩份清單不同步。
 */

/** 受權限控制的匯出按鈕 key */
export type ExportPermissionKey =
  | 'exportTaipeiBay'
  | 'exportKaohsiungChaofeng'
  | 'exportShopee'
  | 'exportShopeeNew'
  | 'exportPegasus'
  | 'manifestNumber';

/** 使用者角色 */
export type UserRole = 'admin' | 'user';

/** 匯出按鈕的權限定義清單（key 與標籤的單一事實來源） */
export const EXPORT_PERMISSION_ITEMS: {
  key: ExportPermissionKey;
  label: string;
}[] = [
  { key: 'exportTaipeiBay', label: '台北港格式' },
  { key: 'exportKaohsiungChaofeng', label: '高雄超峰格式' },
  { key: 'exportShopee', label: '蝦皮2轉' },
  { key: 'exportShopeeNew', label: '沛寶速派蝦皮格式' },
  { key: 'exportPegasus', label: '天馬格式' },
  { key: 'manifestNumber', label: '分艙編號' },
];

/** 應用層的使用者模型（已解析 role 與 permissions，不含密碼） */
export interface AppUser {
  name: string;
  account: string;
  /** 角色（已正規化，空白 → 'user'） */
  role: UserRole;
  /**
   * 可見按鈕 key 陣列；
   * null = 全部可見（對應 Google Sheet 的空白 permissions）
   */
  permissions: ExportPermissionKey[] | null;
}

/** Admin 使用者管理用的完整紀錄（含密碼） */
export interface UserRecord extends AppUser {
  password: string;
}
