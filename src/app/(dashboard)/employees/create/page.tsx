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
    // multi-department access
    departments: [] as string[],
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

  function toggleDepartment(name: string) {
    setData((prev) => {
      const current = prev.departments || [];
      const exists = current.includes(name);
      if (exists) {
        return {
          ...prev,
          departments: current.filter((d) => d !== name),
        };
      }
      return {
        ...prev,
        departments: [...current, name],
      };
    });
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

  const selectedDepartments = data.departments || [];

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

            {/* Departments selection – checkbox list + selected chips */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Departments
              </label>

              {depsLoading ? (
                <div className="text-sm text-gray-600">
                  Loading departments...
                </div>
              ) : departments.length === 0 ? (
                <div className="text-sm text-gray-600">
                  No departments found. Please create a department first.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selected pills */}
                  {selectedDepartments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {selectedDepartments.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 text-xs px-3 py-1 border border-blue-200"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => toggleDepartment(name)}
                            className="ml-2 text-blue-500 hover:text-blue-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Checkbox list */}
                  <div className="max-h-48 overflow-y-auto border rounded-md px-3 py-2 space-y-1 bg-white">
                    {departments.map((d) => {
                      const checked = selectedDepartments.includes(d.name);
                      return (
                        <label
                          key={d._id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDepartment(d.name)}
                            className="h-4 w-4"
                          />
                          <span>{d.name}</span>
                          {d.description && (
                            <span className="text-xs text-gray-500">
                              – {d.description}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-xs text-gray-500">
                    Click to select or unselect departments. You can choose
                    multiple.
                  </p>
                </div>
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
