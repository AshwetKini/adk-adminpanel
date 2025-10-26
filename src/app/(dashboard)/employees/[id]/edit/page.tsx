// src/app/(dashboard)/employees/[id]/edit/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { employeeApi } from '@/lib/api';
import type { UpdateEmployeeInput, Employee } from '@/types/employee';

export default function EditEmployee() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState<UpdateEmployeeInput>({});

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await employeeApi.one(id);
        setEmp(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await employeeApi.update(id, form);
    router.push('/employees');
  }

  if (loading) return <div>Loading...</div>;
  if (!emp) return <div>Not found</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Employee</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Employee ID" name="employeeId" defaultValue={emp.employeeId} onChange={onChange} />
            <Input label="Full Name" name="fullName" defaultValue={emp.fullName} onChange={onChange} />
            <Input label="Email" name="email" type="email" defaultValue={emp.email} onChange={onChange} />
            <Input label="New Password" name="password" type="password" onChange={onChange} />
            <Input label="Department" name="department" defaultValue={emp.department} onChange={onChange} />
            <Input label="Position" name="position" defaultValue={emp.position} onChange={onChange} />
            <Input label="Phone Number" name="phoneNumber" defaultValue={emp.phoneNumber} onChange={onChange} />
            <div className="flex items-center gap-2">
              <input id="isActive" name="isActive" type="checkbox" defaultChecked={emp.isActive} onChange={onChange} />
              <label htmlFor="isActive">Active</label>
            </div>
            <div className="flex gap-3">
              <Button type="submit">Save</Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
