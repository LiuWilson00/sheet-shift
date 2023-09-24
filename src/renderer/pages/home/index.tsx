import { useEffect } from 'react';
// import icon from '../../../../assets/icon.svg';
import './style.css';
import { useLoading } from '../../contexts/loading.context';
import { useDialog } from '../../contexts/dialog.context';

function Hello() {
  const { showDialog, hideDialog } = useDialog();
  const { showLoading, hideLoading } = useLoading();
  const fetchData = () => {
    window.electron.ipcRenderer.selectExcelFile();

    window.electron.ipcRenderer.once('excel-data', (data) => {
      const _data = data as { path: string; data: any[] };

      console.log(data);
      showDialog({
        content: `檔案已匯出至 ${_data.path}`,
        onConfirm: () => {
          hideDialog();
        },
      });
      setTimeout(() => {
        hideLoading();
      }, 1000);
    });
  };
  useEffect(() => {
    console.log('Hello');
  }, []);
  return (
    <div>
      <button
        onClick={() => {
          fetchData();
          showLoading();
        }}
      >
        點擊上傳圖片
      </button>
    </div>
  );
}

export default Hello;
