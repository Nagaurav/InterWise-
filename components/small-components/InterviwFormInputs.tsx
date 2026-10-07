"use client";
import React from "react";

interface InputProps {
  label: string;
  type: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  accept?: string;
  required?: boolean;
  isOptional?: boolean;
}

const InterviwFormInputs = ({
  label,
  type,
  placeholder,
  value,
  onChange,
  min,
  max,
  accept,
  required = true,
  isOptional = false,
}: InputProps) => {
  // Helper components for label styling
  const RequiredLabel = () => (
    <span className="ml-1 text-xs text-[var(--theme-hover)]">*</span>
  );

  const OptionalLabel = () => (
    <span className="ml-1 text-xs text-zinc-500">(Optional)</span>
  );

  return (
    <div className="flex flex-col w-full">
      <label className="flex items-center mb-2 text-sm font-medium text-gray-200">
        {label}
        {isOptional ? <OptionalLabel /> : (required ? <RequiredLabel /> : null)}
      </label>
      <input
        className="w-full h-12 px-4 text-white transition-colors border rounded-lg outline-none bg-[var(--input-bg)] border-[#352a31] placeholder-zinc-500 focus:border-[var(--theme-color)]"
        type={type}
        required={required && !isOptional}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        accept={accept}
      />
    </div>
  );
};

export default InterviwFormInputs;
