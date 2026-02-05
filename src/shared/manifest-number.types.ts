/**
 * 艙單編號相關型別定義
 */

/** 區段類型：英文字母或數字 */
export type SegmentType = 'alpha' | 'numeric';

/** 格式區段定義 */
export interface FormatSegment {
  /** 區段類型 */
  type: SegmentType;
  /** 位數 (1-5) */
  length: number;
}

/** 艙單編號格式定義 */
export interface ManifestNumberFormat {
  /** 區段列表 */
  segments: FormatSegment[];
}

/** 黑名單區間 */
export interface BlacklistRange {
  /** 起始編號（含） */
  start: string;
  /** 結束編號（含） */
  end: string;
}

/** 黑名單規則 */
export interface BlacklistRule {
  /** 區間排除列表 */
  ranges: BlacklistRange[];
  /** 單個排除列表 */
  singles: string[];
}

/** 艙單編號設定 */
export interface ManifestNumberConfig {
  /** 設定名稱（唯一識別） */
  settingName: string;
  /** 格式定義 */
  format: ManifestNumberFormat;
  /** 黑名單規則 */
  blacklist: BlacklistRule;
  /** 上次使用的最後編號 */
  currentNumber?: string;
  /** 建立時間 */
  createdAt?: string;
  /** 更新時間 */
  updatedAt?: string;
}

/** Google Sheets 中的艙單編號設定（原始格式） */
export interface ManifestNumberConfigSheet {
  /** 設定名稱 */
  設定名稱: string;
  /** 格式定義（JSON 字串） */
  格式定義: string;
  /** 黑名單規則（JSON 字串） */
  黑名單規則: string;
  /** 當前編號 */
  當前編號: string;
  /** 建立時間 */
  建立時間: string;
  /** 更新時間 */
  更新時間: string;
}

/** 帶入艙單編號的輸入參數 */
export interface ApplyManifestNumberInput {
  /** 設定名稱 */
  configName: string;
  /** 需要的編號數量 */
  count: number;
  /** 起始編號（可選） */
  startFrom?: string;
  /** 交易代碼（帶入 AG 欄位） */
  transactionCode?: string;
}

/** 帶入艙單編號的輸出結果 */
export interface ApplyManifestNumberOutput {
  /** 產生的編號列表 */
  numbers: string[];
  /** 最後一個編號 */
  endAt: string;
  /** 跳過的編號（黑名單） */
  skipped: string[];
}

/** 預覽結果 */
export interface ManifestNumberPreview {
  /** 第一個編號 */
  first: string;
  /** 第二個編號 */
  second: string;
  /** 最後一個編號 */
  last: string;
}

/** 驗證結果 */
export interface ManifestNumberValidation {
  /** 是否有效 */
  isValid: boolean;
  /** 錯誤訊息 */
  error?: string;
}
