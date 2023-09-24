import React from 'react';
import './style.css';

interface DialogProps {
  title?: string;
  content: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const Dialog: React.FC<DialogProps> = ({
  title = '訊息',
  content,
  showCancel = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="dialog-container">
      <div className="dialog-content">
        <h2>{title}</h2>
        <p>{content}</p>
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
