// src/components/ui/Button.tsx
import React from 'react';

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; size?: 'sm' | 'md' | 'lg' }) {
  const v = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];
  const s = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4', lg: 'h-12 px-6 text-lg' }[size];
  return <button className={`rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${v} ${s} ${className}`} {...props} />;
}
