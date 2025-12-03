
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  touched, 
  className = '', 
  ...props 
}) => {
  const hasError = touched && error;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-300 mb-1.5 ml-1">
        {label}
      </label>
      <div className="relative">
        <input
          className={`
            w-full bg-secondary-900 border rounded-lg px-4 py-2.5 text-white 
            placeholder-gray-600 transition-all duration-200 outline-none
            ${hasError 
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' 
              : 'border-secondary-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 hover:border-secondary-500'
            }
            ${className}
          `}
          {...props}
        />
        {hasError && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      <div className={`mt-1 h-5 text-xs text-red-400 transition-opacity duration-200 ${hasError ? 'opacity-100' : 'opacity-0'}`}>
        {error}
      </div>
    </div>
  );
};
