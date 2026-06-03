const fs = require('fs');
const path = require('path');

function copyfileOfFolderToTarget(sourceFolderPath, targetFolderPath) {
  const files = fs.readdirSync(sourceFolderPath);
  files.forEach((file) => {
    const sourceFile = path.join(sourceFolderPath, file);
    const targetFile = path.join(targetFolderPath, file);
    const stat = fs.statSync(sourceFile);
    if (stat.isFile()) {
      fs.copyFileSync(sourceFile, targetFile);
    } else if (stat.isDirectory()) {
      if (!fs.existsSync(targetFile)) {
        fs.mkdirSync(targetFile);
      }
      copyfileOfFolderToTarget(sourceFile, targetFile);
    }
  });
}

/**
 * 解析主程序 dist/main 的目標路徑（跨平台）
 *
 * 直接使用 electron-builder afterPack context 提供的 resources 目錄，
 * 不再依賴硬寫死的平台路徑：
 * - win / linux：<appOutDir>/resources/app/dist/main
 * - mac：<appOutDir>/<ProductName>.app/Contents/Resources/app/dist/main
 *
 * 先前以 switch(platform) 硬寫死且漏掉 linux，導致 Linux runner 上
 * buildFolder='' → fs.mkdirSync('') ENOENT。
 */
function resolveMainDistDir(context) {
  const resourcesDir = context.packager.getResourcesDir(context.appOutDir);
  return path.join(resourcesDir, 'app', 'dist', 'main');
}
exports.resolveMainDistDir = resolveMainDistDir;

exports.default = async function copyDeps(context) {
  // 定義平台和架構（用於選取 onnxruntime-node 對應的原生二進位）
  const { platform, arch } = process;

  // 自動偵測 napi 版本（支援 napi-v3、napi-v6 等）
  const onnxBinDir = 'node_modules/onnxruntime-node/bin';
  const napiDirs = fs
    .readdirSync(onnxBinDir)
    .filter((d) => d.startsWith('napi-'));
  if (napiDirs.length === 0) {
    throw new Error(`找不到 napi 目錄: ${onnxBinDir}`);
  }
  const napiVersion = napiDirs[napiDirs.length - 1]; // 取最新版本
  const sourceFolder = `${onnxBinDir}/${napiVersion}/${platform}/${arch}`;

  // 由 electron-builder context 取得跨平台正確的目標路徑
  const buildFolder = resolveMainDistDir(context);

  // 確保目標路徑存在
  if (!fs.existsSync(buildFolder)) {
    fs.mkdirSync(buildFolder, { recursive: true });
  }

  copyfileOfFolderToTarget(sourceFolder, buildFolder);
};
