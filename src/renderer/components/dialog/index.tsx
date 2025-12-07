import React from 'react';
import './style.css';

type DialogVariant = 'message' | 'settings';

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
  variant?: DialogVariant; // dialog 樣式變體
}

const Dialog: React.FC<DialogProps> = ({
  title = '訊息',
  content,
  showCancel = false,
  onConfirm,
  onCancel,
  showMask = false, // 預設不顯示遮罩
  width,
  height,
  contentRender,
  variant = 'message', // 預設為訊息類型
}) => {
  // 根據 variant 決定是否使用自訂尺寸
  const useCustomSize = width !== undefined || height !== undefined;
  const dialogStyle = useCustomSize
    ? {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }
    : {};

  // 根據 variant 決定 CSS class
  const variantClass =
    variant === 'settings' ? 'dialog-content--settings' : 'dialog-content--message';

  return (
    <div className={`dialog-container ${showMask ? 'mask' : ''}`}>
      <div
        className={`dialog-content ${variantClass}`}
        style={dialogStyle}
      >
        <h2>{title}</h2>
        <div className="dialog-content-main">
          {contentRender ? contentRender() : <p>{content}</p>}
        </div>
        <div className="dialog-buttons">
          {showCancel && (
            <button type="button" onClick={onCancel}>
              取消
            </button>
          )}
          <button type="button" className="confirm" onClick={onConfirm}>
            確認
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
