// src/renderer/components/select/index.tsx
import React from 'react';
import BaseInputComponent from '../base-input-component';
import './style.css'; // 如果您有自定義樣式的話

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  items: { value: string; label: string }[]; // 假設每個項目都有一個 value 和 label
  validationFn?: (value: string) => string | null; // 驗證函數（如果需要）
}

const Select: React.FC<SelectProps> = ({
  items,
  validationFn,
  ...restProps
}) => {
  return (
    <BaseInputComponent validationFn={validationFn}>
      <select {...restProps}>
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </BaseInputComponent>
  );
};

export default Select;
