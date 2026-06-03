import fs from 'fs';

/**
 * 確保資料夾存在（不存在則遞迴建立），回傳該路徑。
 *
 * 用於「開啟 log 資料夾」前，避免目錄尚未建立而開啟失敗。
 */
// eslint-disable-next-line import/prefer-default-export
export function ensureDirExists(dir: string): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
