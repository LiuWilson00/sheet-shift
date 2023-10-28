import React, { useState, useEffect } from 'react';
import { CommonProps } from '../base-input-component/common-props';
import BaseInputComponent from '../base-input-component';
import './style.css';
interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    CommonProps {
  searchHandler?: (inputValue: string) => string[];
  optionClickHandler?: (selectedValue: string) => void;
}

const Input: React.FC<InputProps> = ({
  label,
  validationFn,
  searchHandler,
  optionClickHandler,
  onChange, // Destructuring the original onChange from props
  ...restProps
}) => {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isClicked, setIsClicked] = useState<boolean>(false); // 是否點擊過選項
  const [value, setValue] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsClicked(false);
    setValue(e.target.value);
    if (!e.target.value) {
      setSearchResults([]);
    } // Clear the results if the input is empty

    // Call the original onChange if provided
    if (onChange) {
      onChange(e);
    }
  };

  useEffect(() => {
    if (!value) {
      setSearchResults([]);
      return;
    }
    if (!searchHandler) return;
    if (isClicked) return;
    const results = searchHandler(value);
    setSearchResults(results);
  }, [value]);

  const handleOptionClick = (selectedValue: string) => {
    setValue(selectedValue);
    setIsClicked(true);

    // Manually invoke the onChange prop with a synthetic event object
    if (onChange) {
      const syntheticEvent = {
        target: { value: selectedValue },
        currentTarget: { value: selectedValue },
        ...restProps,
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }

    optionClickHandler ? optionClickHandler(selectedValue) : null;
    setSearchResults([]); // Clear the results after option is selected
  };

  return (
    <BaseInputComponent label={label} validationFn={validationFn}>
      <div className='input-container'>
        <input value={value} {...restProps} onChange={handleInputChange} />
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((result) => (
              <div key={result} onClick={() => handleOptionClick(result)}>
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseInputComponent>
  );
};

export default Input;
