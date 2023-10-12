import { useEffect, useState } from 'react';
// import icon from '../../../../assets/icon.svg';
import './style.css';
import { useLoading } from '../../contexts/loading.context';
import { useDialog } from '../../contexts/dialog.context';
import DebugConsole from '../../components/debug-console';

function Hello() {
  const { showDialog, hideDialog } = useDialog();
  const { showLoading, hideLoading } = useLoading();
  const [selectFilePath, setSelectFilePath] = useState<string>();

  const fetchData = async () => {
    showLoading();
    const result = await window.electron.excelBridge.sendSelectExcelFile();
    hideLoading();
    if (result.isError) {
      showDialog({
        content: '上傳失敗，請確認檔案是否正確。',
        onConfirm: () => {
          hideDialog();
        },
      });
    }
    // const test = await window.electron.excelBridge.sendGetWrongData();
    // console.log('test',test);

    setSelectFilePath(result.path);
  };
  const exportDefualtFormat = async () => {
    showLoading();
    const result = await window.electron.excelBridge.sendExportDefaultSheet();
    hideLoading();
    console.log(result);
    if (result.isError) {
      showDialog({
        content: '匯出失敗，請確認檔案是否正確。',
        onConfirm: () => {
          hideDialog();
        },
      });
      return;
    }

    showDialog({
      content: `檔案已匯出，檔案路徑：${result.path}`,
      onConfirm: () => {
        hideDialog();
      },
    });
  };

  function exportShopeeFormat(): void {
    showLoading();
    window.electron.excelBridge.sendExportShopeeSheet();
    hideLoading();
    showDialog({
      content: `檔案已匯出，檔案路徑：${selectFilePath}`,
      onConfirm: () => {
        hideDialog();
      },
    });
  }

  return (
    <div className="home-context">
      <button
        onClick={() => {
          fetchData();
        }}
        disabled={selectFilePath !== undefined}
      >
        點擊上傳文件{' '}
        <span
          style={{
            color: 'red',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {' '}
          (xlsx or xls)
        </span>
      </button>
      {selectFilePath ? (
        <div className="file-selected-group">
          <span>檔案已上傳，檔案路徑：</span>
          <a href="#">{selectFilePath}</a>
          <div className="file-selected-group-button">
            <button className="export-button" onClick={exportDefualtFormat}>
              匯出成預設格式
            </button>
            <button className="export-button" onClick={exportShopeeFormat}>
              匯出成蝦皮格式
            </button>
          </div>
          <a
            href="#"
            onClick={() => {
              setSelectFilePath(undefined);
            }}
            className="re-upload-button"
          >
            重新上傳
          </a>
        </div>
      ) : (
        <></>
      )}

      <DebugConsole></DebugConsole>
    </div>
  );
}

export default Hello;
