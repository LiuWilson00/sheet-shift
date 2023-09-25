import { useEffect } from "react";
// import icon from '../../../../assets/icon.svg';
import "./style.css";
import { useLoading } from "../../contexts/loading.context";
import { useDialog } from "../../contexts/dialog.context";
import DebugConsole from "../../components/debug-console";

function Hello() {
  const { showDialog, hideDialog } = useDialog();
  const { showLoading, hideLoading } = useLoading();
  const fetchData = () => {
    window.electron.ipcRenderer.selectExcelFile();

    window.electron.ipcRenderer.once("excel-data", (data) => {
      const _data = data as {
        path: string;
        data: any[];
        isError: boolean;
        message: any;
      };
      if (_data.isError) {
        hideLoading();
        showDialog({
          title: "錯誤",
          content: `檔案匯入失敗，原因：${_data.message}`,
          onConfirm: () => {
            hideDialog();
          },
        });

        return;
      }
      hideLoading();
      showDialog({
        content: `檔案已匯出至 ${_data.path}`,
        onConfirm: () => {
          hideDialog();
        },
      });
    });
  };
  useEffect(() => {
    console.log("Hello");
  }, []);
  return (
    <div>
      <button
        onClick={() => {
          fetchData();
          showLoading();
        }}
      >
        點擊上傳文件{" "}
        <span
          style={{
            color: "red",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {" "}
          (xlsx or xls)
        </span>
      </button>
      <DebugConsole></DebugConsole>
    </div>
  );
}

export default Hello;
