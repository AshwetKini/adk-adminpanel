// src/app/(dashboard)/dashboard/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { employeeApi } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  useEffect(() => {
    (async () => {
      try {
        const list = await employeeApi.all();
        setStats({
          total: list.length,
          active: list.filter((e) => e.isActive).length,
          inactive: list.filter((e) => !e.isActive).length,
        });
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardContent className="p-6"><div className="text-sm text-gray-600">Total Employees</div><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-sm text-gray-600">Active</div><div className="text-3xl font-bold text-green-600">{stats.active}</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-sm text-gray-600">Inactive</div><div className="text-3xl font-bold text-red-600">{stats.inactive}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Welcome to ADK System Admin Panel</h2></CardHeader>
        <CardContent><p className="text-gray-600">Manage employees: create, update, deactivate, and delete.</p></CardContent>
      </Card>
    </div>
  );
}
