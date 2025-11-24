// src/app/(dashboard)/departments/[id]/edit/page.tsx

'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { departmentApi } from '@/lib/api';
import type {
  Department,
  UpdateDepartmentInput,
} from '@/types/department';

const PERMISSIONS = [
  {
    value: 'customer:reset-password',
    label: 'Customer: Reset Password',
    description:
      'Allow this department to reset passwords for any customer.',
  },
];

export default function EditDepartmentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dept, setDept] = useState<Department | null>(null);
  const [form, setForm] = useState<UpdateDepartmentInput>({});

  useEffect(() => {
    (async () => {
      try {
        const all = await departmentApi.all();
        const found = all.find((d) => d._id === id); // <-- compare _id
        setDept(found || null);

        if (found) {
          setForm({
            name: found.name,
            description: found.description,
            isActive: found.isActive,
            permissions: found.permissions || [],
          });
        }
      } catch {
        // ignore for now
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function onChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function togglePermission(value: string) {
    setForm((prev) => {
      const current = prev.permissions || [];
      const exists = current.includes(value);
      if (exists) {
        return {
          ...prev,
          permissions: current.filter((p) => p !== value),
        };
      }
      return {
        ...prev,
        permissions: [...current, value],
      };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dept) return;
    setSaving(true);

    try {
      await departmentApi.update(dept._id, form); // <-- use _id
      alert('Department updated successfully');
      router.push('/departments');
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          'Failed to update department',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!dept) return <div>Department not found</div>;

  const selectedPermissions = form.permissions || [];

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">
        Edit Department
      </h1>

      <Card>
        <CardContent>
          <form
            onSubmit={onSubmit}
            className="space-y-4"
          >
            <Input
              label="Department Name"
              name="name"
              value={form.name || ''}
              onChange={onChange}
            />
            <Input
              label="Description (optional)"
              name="description"
              value={form.description || ''}
              onChange={onChange}
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                checked={!!form.isActive}
                onChange={onChange}
              />
              <span>Active</span>
            </label>

            <div className="space-y-2">
              <div className="text-sm font-medium">
                Permissions
              </div>
              <div className="text-xs text-gray-500">
                These permissions control what employees in this
                department can do (for example, on customers).
              </div>

              <div className="mt-2 space-y-1 border rounded-md px-3 py-2 bg-white">
                {PERMISSIONS.map((p) => {
                  const checked =
                    selectedPermissions.includes(p.value);
                  return (
                    <label
                      key={p.value}
                      className="flex items-start gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4"
                        checked={checked}
                        onChange={() =>
                          togglePermission(p.value)
                        }
                      />
                      <span>
                        <span className="font-medium">
                          {p.label}
                        </span>
                        {p.description && (
                          <span className="block text-xs text-gray-500">
                            {p.description}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
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
