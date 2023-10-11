import exp from 'constants';
import { useEffect, useState } from 'react';

interface NumberRangeProps {
  value?: [number, number];
  defaultValue?: [number, number];
  onChange: (value: [number, number]) => void;
  validateFn?: (value: [number, number]) => string | null;
  label?: string;
  minLabel?: string;
  maxLabel?: string;
  name?: string;
  needParseFloat?: boolean;
}

const NumberRange: React.FC<NumberRangeProps> = ({
  value,
  defaultValue = [0, 0],
  onChange,
  validateFn,
  label = '',
  minLabel = 'Min',
  maxLabel = 'Max',
  name,
  needParseFloat = false,
}) => {
  const [min, setMin] = useState<string>(
    String(value ? value[0] : defaultValue[0]),
  );
  const [max, setMax] = useState<string>(
    String(value ? value[1] : defaultValue[1]),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setMin(String(value[0]));
      setMax(String(value[1]));
    }
  }, [value]);

  const handleBlur = () => {
    const parseFn = needParseFloat ? parseFloat : parseInt;

    const minNum = parseFn(min, 10);
    const maxNum = parseFn(max, 10);

    if (!isNaN(minNum) && !isNaN(maxNum)) {
      const newRange: [number, number] = [minNum, maxNum];
      onChange(newRange);

      // 驗證新的範圍
      if (validateFn) {
        const errorMsg = validateFn(newRange);
        setError(errorMsg);
      }
    }
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMin(e.target.value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMax(e.target.value);
  };

  return (
    <div className="number-range-wrapper">
      {label && <label>{label}</label>}
      <div className="range-inputs">
        <input
          type="number"
          name={`${name}-min`}
          value={min}
          onChange={handleMinChange}
          onBlur={handleBlur}
          placeholder={minLabel}
        />
        <input
          type="number"
          name={`${name}-max`}
          value={max}
          onChange={handleMaxChange}
          onBlur={handleBlur}
          placeholder={maxLabel}
        />
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default NumberRange;
