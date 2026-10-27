import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="mb-3">
      {label && <label className="label">{label}</label>}
      <input
        className={`input ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-300' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
