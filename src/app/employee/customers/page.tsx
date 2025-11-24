// src/app/employee/customers/page.tsx

'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { customerApi } from '@/lib/api';
import type { Customer } from '@/types/customer';
import { useRouter } from 'next/navigation';

export default function EmployeeCustomersPage() {
  const router = useRouter();
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await customerApi.all();
      setList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Customers
        </h1>
        <Button
          onClick={() =>
            router.push('/employee/customers/create')
          }
        >
          Create Customer
        </Button>
      </div>

      <Card>
        <CardContent>
          {list.length === 0 ? (
            <div className="text-sm text-gray-600">
              No customers yet. Create the first one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">
                    Customer ID
                  </th>
                  <th className="text-left py-2">
                    Name
                  </th>
                  <th className="text-left py-2">
                    Email
                  </th>
                  <th className="text-left py-2">
                    Department
                  </th>
                  <th className="text-left py-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr
                    key={c._id}
                    className="border-b last:border-0"
                  >
                    <td className="py-2">
                      {c.customerId}
                    </td>
                    <td className="py-2">
                      {c.fullName}
                    </td>
                    <td className="py-2">
                      {c.email}
                    </td>
                    <td className="py-2">
                      {c.department || '-'}
                    </td>
                    <td className="py-2">
                      {c.isActive ? 'Active' : 'Inactive'}
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
