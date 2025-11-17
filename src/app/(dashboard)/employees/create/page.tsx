// src/app/(dashboard)/employees/create/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { employeeApi, departmentApi } from '@/lib/api';
import type { CreateEmployeeInput } from '@/types/employee';
import type { Department } from '@/types/department';

export default function CreateEmployee() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState<CreateEmployeeInput>({
    employeeId: '',
    email: '',
    password: '',
    fullName: '',
    department: '',
    position: '',
    phoneNumber: '',
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

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  }

  function onSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await employeeApi.create(data);
      router.push('/employees');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Create Employee</h1>

      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Employee ID"
              name="employeeId"
              value={data.employeeId}
              onChange={onChange}
            />
            <Input
              label="Full Name"
              name="fullName"
              value={data.fullName}
              onChange={onChange}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={data.email}
              onChange={onChange}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={data.password}
              onChange={onChange}
            />

            {/* Department dropdown */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Department
              </label>
              {depsLoading ? (
                <div className="text-sm text-gray-600">Loading departments...</div>
              ) : departments.length === 0 ? (
                <div className="text-sm text-gray-600">
                  No departments found. Please create a department first.
                </div>
              ) : (
                <select
                  name="department"
                  value={data.department || ''}
                  onChange={onSelectChange}
                  className="w-full border rounded h-10 px-3 text-sm"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Input
              label="Position"
              name="position"
              value={data.position || ''}
              onChange={onChange}
            />
            <Input
              label="Phone Number"
              name="phoneNumber"
              value={data.phoneNumber || ''}
              onChange={onChange}
            />

            <div className="flex gap-3 mt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Employee'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/employees')}
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
