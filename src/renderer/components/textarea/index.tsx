import React from 'react';
import { CommonProps } from '../base-input-component/common-props';
import BaseInputComponent from '../base-input-component';

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    CommonProps {}

const Textarea: React.FC<TextareaProps> = ({
  label,
  validationFn,
  ...restProps
}) => {
  return (
    <BaseInputComponent label={label} validationFn={validationFn}>
      <textarea {...restProps} />
    </BaseInputComponent>
  );
};

export default Textarea;
