// src/components/ui/Card.tsx
import React from 'react';

export function Card({ className = '', children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>;
}
export function CardHeader({ className = '', children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pb-4 ${className}`}>{children}</div>;
}
export function CardContent({ className = '', children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}
