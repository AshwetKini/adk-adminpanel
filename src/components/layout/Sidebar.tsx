// src/components/layout/Sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menu = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Employees', href: '/employees' },
];

export default function Sidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch('/api/session', { method: 'DELETE' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
  }

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold">ADK System</h1>
        <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
      </div>
      <nav className="mt-6">
        {menu.map((m) => {
          const active = pathname === m.href || pathname.startsWith(m.href + '/');
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`block px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white ${active ? 'bg-gray-800 text-white border-l-4 border-blue-500' : ''}`}
            >
              {m.title}
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <button onClick={handleLogout} className="w-full px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md">
          Logout
        </button>
      </div>
    </aside>
  );
}
