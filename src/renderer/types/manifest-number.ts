/**
 * 艙單編號相關型別定義
 */

/** 區段類型 */
export type SegmentType = 'alpha' | 'numeric';

/** 區段定義 */
export interface FormatSegment {
  /** 區段類型：alpha (英文 A-Z) 或 numeric (數字 0-9) */
  type: SegmentType;
  /** 位數 (1-5) */
  length: number;
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

/** 艙單編號格式定義 */
export interface ManifestNumberFormat {
  /** 區段列表 */
  segments: FormatSegment[];
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

/** 預覽結果 */
export interface ManifestNumberPreview {
  /** 第一個編號 */
  first: string;
  /** 第二個編號 */
  second: string;
  /** 最後一個編號 */
  last: string;
}

/** 帶入預覽結果 */
export interface ApplyPreviewResult {
  /** 產生的編號列表 */
  numbers: string[];
  /** 結束編號 */
  endAt: string;
  /** 跳過的編號（黑名單） */
  skipped: string[];
}

/**
 * 工具函數：根據格式產生預覽
 */
export function generatePreview(
  segments: FormatSegment[],
): ManifestNumberPreview {
  const first = segments
    .map((seg) =>
      seg.type === 'alpha' ? 'A'.repeat(seg.length) : '0'.repeat(seg.length),
    )
    .join('');

  const second = segments
    .map((seg, index) => {
      if (index === segments.length - 1) {
        return seg.type === 'alpha'
          ? `${'A'.repeat(seg.length - 1)}B`
          : `${'0'.repeat(seg.length - 1)}1`;
      }
      return seg.type === 'alpha'
        ? 'A'.repeat(seg.length)
        : '0'.repeat(seg.length);
    })
    .join('');

  const last = segments
    .map((seg) =>
      seg.type === 'alpha' ? 'Z'.repeat(seg.length) : '9'.repeat(seg.length),
    )
    .join('');

  return { first, second, last };
}

/**
 * 工具函數：計算編號總數
 */
export function calculateTotalCount(segments: FormatSegment[]): number {
  return segments.reduce((total, seg) => {
    const base = seg.type === 'alpha' ? 26 : 10;
    return total * base ** seg.length;
  }, 1);
}

/**
 * 工具函數：格式化格式描述
 */
export function formatDescription(format: ManifestNumberFormat): string {
  return format.segments
    .map((seg) => {
      const typeLabel = seg.type === 'alpha' ? '英文' : '數字';
      return `${typeLabel}${seg.length}位`;
    })
    .join(' + ');
}

/**
 * 工具函數：驗證編號格式
 */
export function validateNumber(
  number: string,
  format: ManifestNumberFormat,
): boolean {
  const expectedLength = format.segments.reduce(
    (sum, seg) => sum + seg.length,
    0,
  );

  if (number.length !== expectedLength) {
    return false;
  }

  let position = 0;
  const isValid = format.segments.every((segment) => {
    const part = number.substring(position, position + segment.length);
    position += segment.length;

    if (segment.type === 'alpha') {
      return /^[A-Z]+$/.test(part);
    }
    return /^[0-9]+$/.test(part);
  });

  return isValid;
}

/**
 * 預設設定
 */
export const DEFAULT_CONFIG: Omit<ManifestNumberConfig, 'settingName'> = {
  format: {
    segments: [
      { type: 'alpha', length: 3 },
      { type: 'numeric', length: 2 },
    ],
  },
  blacklist: {
    ranges: [],
    singles: [],
  },
};
