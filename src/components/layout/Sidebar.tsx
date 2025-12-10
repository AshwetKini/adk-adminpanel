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

// Tenant admin / superadmin menu
const tenantMenu: MenuItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Employees', href: '/employees' },
  { title: 'Departments', href: '/departments' },
  { title: 'Payments', href: '/payments' },
];

// Platform admin menu
const platformMenu: MenuItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Tenants', href: '/tenants' },
];

// Employee sidebar menu: existing customer module + import shipments + payments
const employeeMenu: MenuItem[] = [
  { title: 'My Dashboard', href: '/employee/dashboard' },
  { title: 'My Department', href: '/employee/department' },
  { title: 'Customers', href: '/employee/customers' },
  { title: 'Shipments', href: '/employee/shipments' },
  { title: 'Payments', href: '/payments' },
];

type SidebarProps = {
  // Optional so existing usages like <Sidebar /> keep working
  collapsed?: boolean;
};

export default function Sidebar({ collapsed = false }: SidebarProps) {
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

  const isPlatformAdmin = role === 'platform-admin' && tenantKey === 'platform';
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
    <aside
      className={`flex h-screen flex-col border-r border-slate-200 bg-slate-900 text-slate-100 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top: logo / app name */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-xs font-bold">
          ADK
        </div>
        <div
          className={`overflow-hidden text-sm font-semibold tracking-tight transition-opacity duration-200 ${
            collapsed ? 'w-0 opacity-0' : 'opacity-100'
          }`}
        >
          ADK System
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-2 text-sm">
        {menu.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-200 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              {/* Simple initial as icon placeholder */}
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-[11px] font-semibold uppercase">
                {item.title.charAt(0)}
              </span>
              <span
                className={`truncate transition-opacity duration-200 ${
                  collapsed ? 'w-0 opacity-0' : 'opacity-100'
                }`}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-800 bg-slate-950/40 px-3 py-3 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-semibold">
                {userName || 'Logged in'}
              </div>
              <div className="truncate text-[10px] capitalize text-slate-400">
                {role || 'user'}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto inline-flex items-center justify-center rounded-md bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-red-600 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
