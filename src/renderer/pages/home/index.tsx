import { useEffect } from "react";
// import icon from '../../../../assets/icon.svg';
import "./style.css";
import { useLoading } from "../../contexts/loading.context";
import { useDialog } from "../../contexts/dialog.context";

function Hello() {
  const { showDialog, hideDialog } = useDialog();
  const { showLoading, hideLoading } = useLoading();
  const fetchData = () => {
    window.electron.ipcRenderer.selectExcelFile();

    window.electron.ipcRenderer.once("excel-data", (data) => {
      const _data = data as { path: string; data: any[] };
      showDialog({
        content: `檔案已匯出至 ${_data.path}`,
        onConfirm: () => {
          hideDialog();
        },
      });

      hideLoading();
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
    </div>
  );
}

export default Hello;
