// src/components/layout/Header.tsx
'use client';

import type React from 'react';
import { Menu, PanelLeftClose } from 'lucide-react';

type HeaderProps = {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

export default function Header({
  sidebarCollapsed,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <header
      className={`fixed top-0 right-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 transition-[left] duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Sidebar toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {sidebarCollapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        <h2 className="text-xl font-semibold text-gray-800">
          Employee Management
        </h2>
      </div>

      <div className="text-sm text-gray-600">Super Admin</div>
    </header>
  );
}
