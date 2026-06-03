import './style.css';

interface LoadingProps {
  isVisible: boolean;
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
      {message ? <div className="loading-message">{message}</div> : null}
    </div>
  );
};

export default Loading;
