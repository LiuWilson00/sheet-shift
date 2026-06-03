/**
 * set-release-version：將 git tag 轉為版本號的邏輯測試
 */
const { normalizeTagToVersion } = require('./set-release-version');

test('去掉 v 前綴', () => {
  expect(normalizeTagToVersion('v4.8.2')).toBe('4.8.2');
  expect(normalizeTagToVersion('4.8.2')).toBe('4.8.2');
});

test('支援 prerelease（如 v4.8.2-test）', () => {
  expect(normalizeTagToVersion('v4.8.2-test')).toBe('4.8.2-test');
});

test('去除前後空白', () => {
  expect(normalizeTagToVersion('  v4.8.2  ')).toBe('4.8.2');
});

test('非法 tag 丟錯', () => {
  expect(() => normalizeTagToVersion('release-foo')).toThrow();
  expect(() => normalizeTagToVersion('v4.8')).toThrow();
  expect(() => normalizeTagToVersion('')).toThrow();
  expect(() => normalizeTagToVersion(undefined)).toThrow();
});
