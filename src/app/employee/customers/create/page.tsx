// src/app/employee/customers/create/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { customerApi } from '@/lib/api';
import type { CreateCustomerInput } from '@/types/customer';

export default function EmployeeCreateCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState<CreateCustomerInput>({
    customerId: '',
    fullName: '',
    companyName: '',
    mobileNumber: '',
    password: '',
    notes: '',
  });

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
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
              label="Customer's Company Name (optional)"
              name="companyName"
              value={form.companyName || ''}
              onChange={onChange}
            />
            <Input
              label="Mobile Number"
              name="mobileNumber"
              value={form.mobileNumber}
              onChange={onChange}
            />

            {/* Password with eye (show/hide) */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  className="h-10 w-full rounded-md border bg-white px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

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
