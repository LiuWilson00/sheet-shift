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

/** 單一格式群組（格式 + 黑名單） */
export interface FormatGroup {
  /** 格式定義 */
  format: ManifestNumberFormat;
  /** 黑名單規則 */
  blacklist: BlacklistRule;
}

/** 當前編號進度 */
export interface CurrentProgress {
  /** 當前使用的格式群組索引 (0-based) */
  groupIndex: number;
  /** 當前編號 */
  number: string;
}

/** 艙單編號設定 */
export interface ManifestNumberConfig {
  /** 設定名稱（唯一識別） */
  settingName: string;
  /** 格式群組列表（有序） */
  formatGroups: FormatGroup[];
  /** 當前進度 */
  currentProgress?: CurrentProgress;
  /** 建立時間 */
  createdAt?: string;
  /** 更新時間 */
  updatedAt?: string;
}

/** Google Sheets 中的艙單編號設定（原始格式） */
export interface ManifestNumberConfigSheet {
  /** 設定名稱 */
  設定名稱: string;
  /** 格式定義（JSON 字串，ManifestNumberFormat[] 陣列） */
  格式定義: string;
  /** 黑名單規則（JSON 字串，BlacklistRule[] 陣列） */
  黑名單規則: string;
  /** 當前編號（JSON 字串，CurrentProgress 物件） */
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
  /** 起始群組索引（可選，搭配 startFrom 使用） */
  startGroupIndex?: number;
  /** 交易代碼（帶入 AG 欄位） */
  transactionCode?: string;
  /** 跳過數字部分為 0 的編號（如 AB00、AAA00） */
  skipZeroNumbers?: boolean;
}

/** 帶入艙單編號的輸出結果 */
export interface ApplyManifestNumberOutput {
  /** 產生的編號列表 */
  numbers: string[];
  /** 最後一個編號 */
  endAt: string;
  /** 結束時的群組索引 */
  endGroupIndex: number;
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
