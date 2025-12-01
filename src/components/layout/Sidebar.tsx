// src/components/layout/Sidebar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

type MenuItem = { title: string; href: string };

const tenantMenu: MenuItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Employees', href: '/employees' },
  { title: 'Departments', href: '/departments' },
];

const platformMenu: MenuItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Tenants', href: '/tenants' },
];

// Employee sidebar menu: existing customer module + new import shipments link
const employeeMenu: MenuItem[] = [
  { title: 'My Dashboard', href: '/employee/dashboard' },
  { title: 'My Department', href: '/employee/department' },
  { title: 'Customers', href: '/employee/customers' }, // customer module
  { title: 'Shipments', href: '/employee/shipments' },
  { title: 'Import Shipments', href: '/shipments/import' }, // new shipments import page
];

export default function Sidebar() {
  const pathname = usePathname();

  const [role, setRole] = useState<string | null>(null);
  const [tenantKey, setTenantKey] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('access_token');
    const payload = parseJwt(token);
    if (payload) {
      setRole(payload.role || null);
      setTenantKey(payload.tenantKey || null);
      setUserName(payload.fullName || payload.email || null);
    }
  }, []);

  const isPlatformAdmin =
    role === 'platform-admin' && tenantKey === 'platform';
  const isEmployee = role === 'employee';
  const isTenantAdmin = role === 'superadmin' || role === 'admin';

  let menu: MenuItem[] = tenantMenu;
  if (isPlatformAdmin) {
    menu = platformMenu;
  } else if (isEmployee) {
    menu = employeeMenu;
  } else if (!isTenantAdmin && !isPlatformAdmin && !isEmployee) {
    menu = [{ title: 'Dashboard', href: '/dashboard' }];
  }

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
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
      {/* Brand / Tenant */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <div>
          <div className="text-sm font-semibold tracking-wide">
            ADK System
          </div>
          <div className="text-[11px] text-slate-400">
            {tenantKey || 'Admin Panel'}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {menu.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-800 px-3 py-3 text-xs flex items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex flex-col overflow-hidden">
          <span className="font-medium truncate">
            {userName || 'Logged in'}
          </span>
          <span className="text-slate-400 capitalize truncate">
            {role || 'user'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded-md bg-slate-800 text-slate-100 hover:bg-red-600 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
