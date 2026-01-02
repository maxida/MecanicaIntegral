// components/NumberInput.tsx
import React, { useState, useEffect } from 'react';
import { TextInput, TextInputProps, StyleProp, TextStyle } from 'react-native';

interface NumberInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: number;
  onChangeText: (numericValue: string) => void;
  style?: StyleProp<TextStyle>;
  decimalPlaces?: number;
}

const NumberInput: React.FC<NumberInputProps> = ({ 
  value, 
  onChangeText, 
  style,
  decimalPlaces = 2,
  ...props 
}) => {
  const [displayValue, setDisplayValue] = useState('');

  const formatNumber = (num: number): string => {
    if (decimalPlaces === 0) {
      return Math.round(num).toLocaleString('es-ES');
    }
    return num.toLocaleString('es-ES', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
  };

  const parseInput = (text: string): number => {
    const cleaned = text.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned);
  };

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (text: string) => {
    // Permitir solo números, comas y puntos
    const cleaned = text.replace(/[^\d,.]/g, '');
    
    // Aplicar formato mientras se escribe
    const numericValue = parseInput(cleaned);
    const formatted = formatNumber(numericValue);
    
    setDisplayValue(formatted);
    onChangeText(numericValue.toString());
  };

  return (
    <TextInput
      {...props}
      style={style}
      keyboardType="numeric"
      value={displayValue}
      onChangeText={handleChange}
    />
  );
};

export default NumberInput;