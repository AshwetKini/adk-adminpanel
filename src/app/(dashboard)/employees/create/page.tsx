// src/app/(dashboard)/employees/create/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { employeeApi } from '@/lib/api';
import type { CreateEmployeeInput } from '@/types/employee';

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

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setData({ ...data, [e.target.name]: e.target.value });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await employeeApi.create(data);
      router.push('/employees');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create Employee</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Employee ID *" name="employeeId" value={data.employeeId} onChange={onChange} required />
            <Input label="Full Name *" name="fullName" value={data.fullName} onChange={onChange} required />
            <Input label="Email *" name="email" type="email" value={data.email} onChange={onChange} required />
            <Input label="Password *" name="password" type="password" value={data.password} onChange={onChange} required />
            <Input label="Department" name="department" value={data.department} onChange={onChange} />
            <Input label="Position" name="position" value={data.position} onChange={onChange} />
            <Input label="Phone Number" name="phoneNumber" value={data.phoneNumber} onChange={onChange} />
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
