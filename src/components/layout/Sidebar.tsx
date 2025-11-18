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

const tenantMenu = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Employees', href: '/employees' },
  { title: 'Departments', href: '/departments' },
];

const platformMenu = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Tenants', href: '/tenants' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('access_token');
    const payload = parseJwt(token);

    if (payload?.role === 'platform-admin' && payload?.tenantKey === 'platform') {
      setIsPlatformAdmin(true);
    } else {
      setIsPlatformAdmin(false);
    }
  }, []);

  async function handleLogout() {
    await fetch('/api/session', { method: 'DELETE' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
  }

  const menu = isPlatformAdmin ? platformMenu : tenantMenu;

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 font-bold text-xl border-b border-gray-700">
        ADK System Admin
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {menu.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded ${
                active ? 'bg-gray-700' : 'hover:bg-gray-800'
              }`}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="m-4 px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-sm"
      >
        Logout
      </button>
    </aside>
  );
}
