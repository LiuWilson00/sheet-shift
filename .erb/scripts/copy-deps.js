const fs = require('fs');
const path = require('path');

exports.default = async function copyDeps(context) {
  // 定義平台和架構
  const platform = process.platform; // 或者您可以自定義，如 'darwin'
  const arch = process.arch; // 或者您可以自定義，如 'arm64'
  //   console.log(context);
  // 定義原始檔案和目標路徑
  const sourceFile = `node_modules/onnxruntime-node/bin/napi-v3/${platform}/${arch}/libonnxruntime.1.16.2.dylib`;
  const buildFolder = `release/build/${
    platform === 'darwin' ? 'mac' : platform
  }-${arch}/ElectronReact.app/Contents/Resources/app/dist/main`;
  console.log('sourceFile', sourceFile);
  console.log('buildFolder', buildFolder);
  // show run path
  console.log('process.cwd()', process.cwd());

  // 確保目標路徑存在
  if (!fs.existsSync(buildFolder)) {
    fs.mkdirSync(buildFolder, { recursive: true });
  }

  // 定義目標檔案路徑
  const targetFile = path.join(buildFolder, 'libonnxruntime.1.16.2.dylib');

  // 複製檔案
  fs.copyFile(sourceFile, targetFile, (err) => {
    if (err) {
      console.error('Error occurred while copying file:', err);
    } else {
      console.log('File copied successfully.');
    }
  });
};
