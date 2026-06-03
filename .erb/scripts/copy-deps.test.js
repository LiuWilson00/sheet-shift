/**
 * copy-deps afterPack hook 路徑解析測試
 *
 * 回歸：先前 switch(platform) 只處理 darwin/win32，
 * Linux 落入 default 使 buildFolder='' → fs.mkdirSync('') ENOENT。
 * 改用 electron-builder context.packager.getResourcesDir 後，三平台皆正確。
 */
const path = require('path');
const { resolveMainDistDir } = require('./copy-deps');

/** 模擬 electron-builder 的 afterPack context */
function makeContext(resourcesDir) {
  return {
    appOutDir: 'release/build/app-out',
    packager: { getResourcesDir: () => resourcesDir },
  };
}

test('linux/win：回傳 resources/app/dist/main（不可為空字串）', () => {
  const resourcesDir = path.join('release/build/linux-unpacked', 'resources');
  const result = resolveMainDistDir(makeContext(resourcesDir));

  expect(result).toBe(path.join(resourcesDir, 'app', 'dist', 'main'));
  expect(result).not.toBe('');
});

test('mac：回傳 .app/Contents/Resources/app/dist/main', () => {
  const resourcesDir = path.join(
    'release/build/mac',
    'ElectronReact.app',
    'Contents',
    'Resources',
  );
  const result = resolveMainDistDir(makeContext(resourcesDir));

  expect(result).toBe(path.join(resourcesDir, 'app', 'dist', 'main'));
});
