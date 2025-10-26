// src/components/ui/Input.tsx
import React from 'react';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label ? <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label> : null}
        <input
          ref={ref}
          className={`h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
          {...props}
        />
        {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  },
);
Input.displayName = 'Input';
