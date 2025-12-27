'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function LedgerLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar collapsed={sidebarCollapsed} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
        />

        <main className="mt-16 flex-1 bg-slate-50 px-3 py-4 lg:px-4">
          {children}
        </main>
      </div>
    </div>
  );
}
