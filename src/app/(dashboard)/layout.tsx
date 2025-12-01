// src/app/(dashboard)/layout.tsx

import type { ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Left sidebar */}
      <Sidebar />

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top header */}
        <Header />

        {/* Content area - now full width, no max-w constraint */}
        <main className="flex-1 bg-slate-50 px-3 py-4 lg:px-4">
          {children}
        </main>
      </div>
    </div>
  );
}
