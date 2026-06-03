/**
 * ensureDirExists 單元測試
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ensureDirExists } from '../log-folder.util';

const tmp = path.join(os.tmpdir(), 'sheetshift-ensuredir-test');

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('資料夾不存在時會建立並回傳路徑', () => {
  fs.rmSync(tmp, { recursive: true, force: true });
  expect(fs.existsSync(tmp)).toBe(false);

  const result = ensureDirExists(tmp);

  expect(result).toBe(tmp);
  expect(fs.existsSync(tmp)).toBe(true);
});

test('資料夾已存在時為冪等、不丟錯', () => {
  fs.mkdirSync(tmp, { recursive: true });

  expect(() => ensureDirExists(tmp)).not.toThrow();
  expect(fs.existsSync(tmp)).toBe(true);
});
