/**
 * 收貨人資訊相關型別定義
 */

/** 收貨人資訊 */
export interface RecipientInfo {
  /** 艙提單號（來自原始 Excel A 欄） */
  艙提單號: string;
  /** 收貨人統一編號（主鍵） */
  收貨人統一編號: string;
  /** 收貨人英文名稱 */
  收貨人英文名稱: string;
  /** 收貨人電話 */
  收貨人電話: string;
  /** 海關註記（有值表示需標紅） */
  海關註記: string;
}

/** 收貨人資訊欄位名稱 */
export enum RecipientInfoColumnKeys {
  /** 艙提單號 */
  ManifestNumber = '艙提單號',
  /** 收貨人統一編號 */
  TaxNumber = '收貨人統一編號',
  /** 收貨人英文名稱 */
  EnglishName = '收貨人英文名稱',
  /** 收貨人電話 */
  Phone = '收貨人電話',
  /** 海關註記 */
  CustomsNote = '海關註記',
}

/** 收貨人資訊查詢結果 */
export interface RecipientInfoLookupResult {
  /** 是否找到 */
  found: boolean;
  /** 收貨人資訊（如果找到） */
  info?: RecipientInfo;
  /** 是否有海關註記 */
  hasCustomsNote: boolean;
}

/** 新增收貨人資訊輸入 */
export interface AddRecipientInfoInput {
  /** 艙提單號 */
  manifestNumber?: string;
  /** 收貨人統一編號 */
  taxNumber: string;
  /** 收貨人英文名稱 */
  englishName?: string;
  /** 收貨人電話 */
  phone?: string;
  /** 海關註記 */
  customsNote?: string;
}
