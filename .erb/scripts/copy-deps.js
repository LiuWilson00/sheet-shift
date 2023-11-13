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

exports.default = async function copyDeps(context) {
  // 定義平台和架構
  const platform = process.platform; // 或者您可以自定義，如 'darwin'
  const arch = process.arch; // 或者您可以自定義，如 'arm64'
  //   console.log(context);
  // 定義原始檔案和目標路徑
  const sourceFolder = `node_modules/onnxruntime-node/bin/napi-v3/${platform}/${arch}`;

  let buildFolder = '';

  switch (platform) {
    case 'darwin':
      buildFolder = `release/build/${
        platform === 'darwin' ? 'mac' : platform
      }-${arch}/ElectronReact.app/Contents/Resources/app/dist/main`;
      break;

    case 'win32':
      buildFolder = `release/build/win-unpacked/resources/app/dist/main`;
      break;

    default:
      break;
  }

  // 確保目標路徑存在
  if (!fs.existsSync(buildFolder)) {
    fs.mkdirSync(buildFolder, { recursive: true });
  }

  copyfileOfFolderToTarget(sourceFolder, buildFolder);
};
