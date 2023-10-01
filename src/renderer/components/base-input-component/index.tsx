import React from 'react';

interface BaseInputProps<T> extends React.InputHTMLAttributes<T> {
  label?: string;
  validationFn?: (value: string) => string | null;
}

const BaseInputComponent: React.FC<BaseInputProps<any>> = ({
  label,
  validationFn,
  children,
}) => {
  const [error, setError] = React.useState<string | null>(null);

  const handleBlur = (e: React.FocusEvent<any>) => {
    if (validationFn) {
      const errorMsg = validationFn(e.target.value);
      setError(errorMsg);
    }
  };

  const cloneChildren = React.cloneElement(children as any, {
    onBlur: handleBlur,
  });

  return (
    <div className="input-wrapper">
      {label && <label>{label}</label>}
      {cloneChildren}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default BaseInputComponent;
