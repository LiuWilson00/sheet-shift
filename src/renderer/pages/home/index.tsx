import { useEffect, useState } from 'react';
// import icon from '../../../../assets/icon.svg';
import './style.css';
import { useLoading } from '../../contexts/loading.context';
import { useDialog } from '../../contexts/dialog.context';
import DebugConsole from '../../components/debug-console';
import { DataDebuggingDialog } from './components/data-debugging-dialog';
import { SheetData } from '../../utils/excel.interface';
import { useAuthDialog } from '../../contexts/auth-dialog-context';
import { useSetting } from '../../contexts/settings-dialog-context/indext';

function Hello() {
  const { showDialog, hideDialog } = useDialog();
  const { showLoading, hideLoading } = useLoading();
  const [showDataDebugging, setShowDataDebugging] = useState<boolean>(false);
  const [wrongData, setWrongData] = useState<SheetData[]>([]);
  const [selectFilePath, setSelectFilePath] = useState<string>();
  const { isAuth, userName, showLogin } = useAuthDialog();
  const { settingName } = useSetting();

  const fetchData = async () => {
    showLoading();
    const result = await window.electron.excelBridge.sendSelectExcelFile();
    hideLoading();
    if (result.isError && result.path !== null) {
      showDialog({
        content: '上傳失敗，請確認檔案是否正確。',
        onConfirm: () => {
          hideDialog();
        },
      });
    }

    setSelectFilePath(result.path);
  };
  const exportDefualtFormat = async () => {
    showLoading();
    const result =
      await window.electron.excelBridge.sendExportDefaultSheet(settingName);
    hideLoading();
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

  async function exportShopeeFormat() {
    showLoading();
    const result =
      await window.electron.excelBridge.sendExportShopeeSheet(settingName);
    hideLoading();
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
  }
  async function originalDataDebugging() {
    showLoading();
    const wrongDataResult =
      await window.electron.excelBridge.sendGetWrongData();
    console.log('wrongDataResult', wrongDataResult);
    hideLoading();
    if (wrongDataResult.isError) return;
    setWrongData(wrongDataResult.data.unMappingData);
    setShowDataDebugging(true);
    console.log('wrongData', wrongData);
  }

  useEffect(() => {}, []);

  return (
    <div className="home-context">
      <DataDebuggingDialog
        show={showDataDebugging}
        setShow={setShowDataDebugging}
        wrongData={wrongData}
        setWrongData={setWrongData}
      ></DataDebuggingDialog>
      {isAuth ? (
        <button
          onClick={() => {
            fetchData();
          }}
          disabled={
            selectFilePath !== undefined &&
            selectFilePath !== '' &&
            selectFilePath !== null
          }
        >
          hello {userName}! 點擊上傳文件{' '}
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
      ) : (
        <button
          onClick={() => {
            showLogin();
          }}
        >
          請登入
        </button>
      )}

      {selectFilePath ? (
        <div className="file-selected-group">
          <span>檔案已上傳，檔案路徑：</span>
          <a href="#">{selectFilePath}</a>
          <div>
            <button className="export-button" onClick={originalDataDebugging}>
              進行資料前處理
            </button>
          </div>
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
