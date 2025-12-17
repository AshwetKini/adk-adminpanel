// src/app/employee/layout.tsx
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { Menu, PanelLeftClose } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';

function parseJwt(token: string | null): any | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setUserName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('access_token');
    const payload = parseJwt(token);
    if (payload) {
      setUserName(payload.fullName || payload.email || null);
      setRole(payload.role || null);
    }
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/session', { method: 'DELETE' });
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Shared, role-aware sidebar (collapsible) */}
      <Sidebar collapsed={sidebarCollapsed} />

      {/* Main employee portal area */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top Navigation with toggle */}
        <header
          className={`fixed top-0 right-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 transition-[left] duration-300 ${
            sidebarCollapsed ? 'left-16' : 'left-64'
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {sidebarCollapsed ? (
                <Menu className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            {/* Portal branding */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                AD
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  ADK Employee Portal
                </div>
                <div className="text-[11px] text-slate-500">
                  Secure access to your account
                </div>
              </div>
            </div>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="max-w-[180px] truncate font-medium">
              {userName || 'Logged in'}
            </span>
            <span className="hidden text-[11px] capitalize text-slate-400 sm:inline">
              {role || 'employee'}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main CRM-style body */}
        <main className="mt-16 flex-1 overflow-y-auto px-3 py-4 lg:px-4">
          {children}
        </main>
      </div>
    </div>
  );
}
