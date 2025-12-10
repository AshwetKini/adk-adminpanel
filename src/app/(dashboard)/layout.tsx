// src/app/(dashboard)/layout.tsx
'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // Controls collapsed / expanded sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Left sidebar (collapsible) */}
      <Sidebar collapsed={sidebarCollapsed} />

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top header with toggle button */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />

        {/* Content area */}
        <main className="mt-16 flex-1 bg-slate-50 px-3 py-4 lg:px-4">
          {children}
        </main>
      </div>
    </div>
  );
}
