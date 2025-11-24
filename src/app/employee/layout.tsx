// src/app/employee/layout.tsx

'use client';

import type React from 'react';
import { useEffect, useState } from 'react';

function parseJwt(token: string | null): any | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

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
    } catch {}

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-800">

      {/* Top Navigation */}
      <header className="h-16 flex items-center justify-between px-6 bg-white border-b shadow-sm sticky top-0 z-30">
        
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            AD
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">ADK Employee Portal</p>
            <p className="text-xs text-gray-500 -mt-0.5">
              Secure access to your account
            </p>
          </div>
        </div>

        {/* Right: User Section */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-medium truncate max-w-[180px]">
              {userName || 'Employee'}
            </span>
            <span className="text-[11px] text-gray-500 capitalize">
              {role || 'employee'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-md bg-slate-800 text-white hover:bg-red-600 transition-all shadow-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main CRM Body Layout */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-6">

        {/* CRM-style card wrapper */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-7 transition-all hover:shadow-md">
          {children}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-3 text-center text-[11px] text-gray-500">
        © {new Date().getFullYear()} ADK System · Employee Portal
      </footer>

    </div>
  );
}
