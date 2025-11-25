// src/app/(dashboard)/employees/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { employeeApi } from '@/lib/api';
import type { Employee } from '@/types/employee';

export default function EmployeesPage() {
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await employeeApi.all();
      setList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id: string) {
    if (!confirm('Delete this employee?')) return;
    await employeeApi.remove(id);
    await load();
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Link href="/employees/create">
          <Button>Add Employee</Button>
        </Link>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.map((e) => {
                const departments =
                  (e as any).departments && (e as any).departments.length > 0
                    ? (e as any).departments.join(', ')
                    : e.department || '-';

                return (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{e.employeeId}</td>
                    <td className="px-6 py-4">{e.fullName}</td>
                    <td className="px-6 py-4">{e.email}</td>
                    <td className="px-6 py-4">{departments}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          e.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {e.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Link
                          className="underline"
                          href={`/employees/${e._id}/edit`}
                        >
                          Edit
                        </Link>
                        <button
                          className="text-red-600 underline"
                          onClick={() => onDelete(e._id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
