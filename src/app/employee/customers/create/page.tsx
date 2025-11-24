// src/app/employee/customers/create/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { customerApi, departmentApi } from '@/lib/api';
import type { CreateCustomerInput } from '@/types/customer';
import type { Department } from '@/types/department';

export default function EmployeeCreateCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<CreateCustomerInput>({
    customerId: '',
    email: '',
    fullName: '',
    password: '',
    department: '',
    notes: '',
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [depsLoading, setDepsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await departmentApi.all();
        setDepartments(list);
      } finally {
        setDepsLoading(false);
      }
    })();
  }, []);

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await customerApi.create(form);
      alert('Customer created successfully');
      router.push('/employee/customers');
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          'Failed to create customer',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">
        Create Customer
      </h1>

      <Card>
        <CardContent>
          <form
            onSubmit={onSubmit}
            className="space-y-4"
          >
            <Input
              label="Customer ID"
              name="customerId"
              value={form.customerId}
              onChange={onChange}
            />
            <Input
              label="Full Name"
              name="fullName"
              value={form.fullName}
              onChange={onChange}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
            />

            {/* Department (optional, any dept in tenant) */}
            {/* <div>
              <label className="block text-sm font-medium mb-1">
                Department (optional)
              </label>
              {depsLoading ? (
                <div className="text-sm text-gray-600">
                  Loading departments...
                </div>
              ) : departments.length === 0 ? (
                <div className="text-sm text-gray-600">
                  No departments found.
                </div>
              ) : (
                <select
                  name="department"
                  value={form.department || ''}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div> */}

            <Input
              label="Notes (optional)"
              name="notes"
              value={form.notes || ''}
              onChange={onChange}
            />

            <div className="flex gap-3 mt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Customer'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/employee/customers')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
