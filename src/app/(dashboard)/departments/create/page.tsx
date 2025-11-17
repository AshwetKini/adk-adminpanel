// src/app/(dashboard)/departments/create/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { departmentApi } from '@/lib/api';
import type { CreateDepartmentInput } from '@/types/department';

export default function CreateDepartmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateDepartmentInput>({
    name: '',
    description: '',
  });

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await departmentApi.create(form);
      router.push('/departments');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Create Department</h1>

      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Department Name"
              name="name"
              value={form.name}
              onChange={onChange}
            />
            <Input
              label="Description (optional)"
              name="description"
              value={form.description || ''}
              onChange={onChange}
            />

            <div className="flex gap-3 mt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/departments')}
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
