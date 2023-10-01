import React from 'react';
import { CommonProps } from '../base-input-component/common-props';
import BaseInputComponent from '../base-input-component';

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    CommonProps {}

const Input: React.FC<InputProps> = ({ label, validationFn, ...restProps }) => {
  return (
    <BaseInputComponent label={label} validationFn={validationFn}>
      <input {...restProps} />
    </BaseInputComponent>
  );
};

export default Input;
