import React from 'react';
import './style.css';

interface DialogProps {
  title?: string;
  content?: string; // 讓這個prop變為optional
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  showMask?: boolean; // 是否顯示遮罩
  width?: number | string; // dialog的寬度
  height?: number | string; // dialog的高度
  contentRender?: () => React.ReactNode; // 渲染內容部分的function
}

const Dialog: React.FC<DialogProps> = ({
  title = '訊息',
  content,
  showCancel = false,
  onConfirm,
  onCancel,
  showMask = false, // 預設不顯示遮罩
  width = 400, // 預設寬度
  height = 'auto', // 預設高度
  contentRender,
}) => {
  const dialogStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div className={`dialog-container ${showMask ? 'mask' : ''}`}>
      <div className="dialog-content" style={dialogStyle}>
        <h2>{title}</h2>
        <div className="dialog-content-main">
          {contentRender ? contentRender() : <p>{content}</p>}
        </div>
        <div className="dialog-buttons">
          <button className="confirm" onClick={onConfirm}>
            確認
          </button>
          {showCancel && <button onClick={onCancel}>取消</button>}
        </div>
      </div>
    </div>
  );
};

export default Dialog;
