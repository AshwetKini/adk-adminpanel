// src/app/(dashboard)/departments/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { departmentApi } from '@/lib/api';
import type { Department } from '@/types/department';

export default function DepartmentsPage() {
  const [list, setList] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await departmentApi.all();
      setList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id: string) {
    if (!confirm('Delete this department?')) return;
    await departmentApi.remove(id);
    await load();
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Departments</h1>
        <Link href="/departments/create">
          <Button>Add Department</Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          {list.length === 0 ? (
            <div className="text-sm text-gray-600">No departments yet. Create the first one.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d._id} className="border-b last:border-0">
                    <td className="py-2">{d.name}</td>
                    <td className="py-2">{d.description || '-'}</td>
                    <td className="py-2">{d.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="py-2 text-right">
                      {/* You can add an edit page later */}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(d._id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
