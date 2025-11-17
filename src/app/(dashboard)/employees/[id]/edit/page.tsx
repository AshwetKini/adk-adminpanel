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
  const [saving, setSaving] = useState(false);

  const [emp, setEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState<UpdateEmployeeInput>({});

  // state for reset password
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // state for success popup
  const [showSuccess, setShowSuccess] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await employeeApi.one(id);
        setEmp(data);
        setForm({
          employeeId: data.employeeId,
          email: data.email,
          fullName: data.fullName,
          department: data.department,
          position: data.position,
          phoneNumber: data.phoneNumber,
          isActive: data.isActive,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await employeeApi.update(id, form);
      alert('Employee updated successfully');
      router.push('/employees');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (!newPassword) {
      // Could add nicer error popup here if desired
      return;
    }

    setResetLoading(true);
    try {
      await employeeApi.resetPassword(id, newPassword);
      setShowSuccess(true); // Show success popup instead of alert
      setNewPassword('');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  if (!emp) return <div>Employee not found</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      {showSuccess && (
        <div className="fixed z-50 inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full text-center">
            <h2 className="text-xl font-semibold mb-2">Password reset successfully</h2>
            <p className="text-gray-600 mb-4">
              The new password is now set. The employee will use this on their next login.
            </p>
            <button
              onClick={() => {
                setShowSuccess(false);
                router.push('/employees'); // Close edit after popup
              }}
              className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-semibold mb-4">Edit Employee</h1>

      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Employee ID"
              name="employeeId"
              value={form.employeeId || ''}
              onChange={onChange}
            />
            <Input
              label="Full Name"
              name="fullName"
              value={form.fullName || ''}
              onChange={onChange}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email || ''}
              onChange={onChange}
            />
            <Input
              label="Department"
              name="department"
              value={form.department || ''}
              onChange={onChange}
            />
            <Input
              label="Position"
              name="position"
              value={form.position || ''}
              onChange={onChange}
            />
            <Input
              label="Phone Number"
              name="phoneNumber"
              value={form.phoneNumber || ''}
              onChange={onChange}
            />

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isActive"
                checked={!!form.isActive}
                onChange={onChange}
              />
              <span>Active</span>
            </label>

            <div className="flex gap-3 mt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
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

      {/* Reset password section */}
      <Card className="mt-8">
        <CardContent>
          <form onSubmit={onResetPassword} className="space-y-4">
            <h2 className="text-lg font-semibold">Reset Password</h2>
            <p className="text-sm text-gray-600">
              Set a new password for this employee. They will use this new password on next login.
            </p>
            <Input
              label="New Password"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button type="submit" variant="danger" disabled={resetLoading}>
              {resetLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
