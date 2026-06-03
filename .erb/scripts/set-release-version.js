/**
 * 從 git tag 設定 release 版本號。
 *
 * CI（release.yml）在打包前呼叫，把 tag（如 v4.8.2）寫進
 * release/app/package.json 的 version — electron-builder 即以此為打包版本。
 *
 * 用法：node .erb/scripts/set-release-version.js [tag]
 *   未給 tag 時讀環境變數 GITHUB_REF_NAME（GitHub Actions tag 推送時的 tag 名）。
 */
const fs = require('fs');
const path = require('path');

/** 將 git tag 轉為版本號：去掉前綴 v，並驗證為合法 semver */
function normalizeTagToVersion(tag) {
  if (!tag || typeof tag !== 'string') {
    throw new Error(`缺少 tag（收到：${tag}）`);
  }
  const version = tag.trim().replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(
      `tag 不是合法版本號：${tag}（預期如 v4.8.2 或 v4.8.2-test）`,
    );
  }
  return version;
}
exports.normalizeTagToVersion = normalizeTagToVersion;

/** 將版本號寫入 release/app/package.json，回傳檔案路徑 */
function writeAppVersion(version, repoRoot = path.join(__dirname, '../..')) {
  const pkgPath = path.join(repoRoot, 'release', 'app', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  return pkgPath;
}
exports.writeAppVersion = writeAppVersion;

// CLI 入口
if (require.main === module) {
  const tag = process.argv[2] || process.env.GITHUB_REF_NAME;
  const version = normalizeTagToVersion(tag);
  const pkgPath = writeAppVersion(version);
  // eslint-disable-next-line no-console
  console.log(`版本號設為 ${version} → ${pkgPath}`);
}
