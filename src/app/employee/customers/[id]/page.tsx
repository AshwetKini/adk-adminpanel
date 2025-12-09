// src/app/employee/customers/[id]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { customerApi } from '@/lib/api';
import type { Customer } from '@/types/customer';

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function EmployeeCustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await customerApi.one(id);
        setCustomer(data);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = resetPassword.trim();
    if (!trimmed) {
      setResetError('Please enter a new password.');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      await customerApi.resetPassword(id, trimmed);
      setResetSuccess(true);
      setResetPassword('');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Failed to reset customer password.';
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-gray-600">
              Loading customer details...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Card>
          <CardContent className="flex items-center justify-between gap-4 py-6">
            <div>
              <h1 className="text-lg font-semibold">
                Customer not found
              </h1>
              <p className="mt-1 text-xs text-gray-500">
                This customer may have been removed or the link is invalid.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/employee/customers')}
            >
              Back to Customers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabel = customer.isActive ? 'Active' : 'Inactive';
  const statusClasses = customer.isActive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-0">
      {/* Top header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Customers / Detail
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {customer.fullName}
            </h1>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-slate-600">
              ID: {customer.customerId}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Mobile{' '}
            <span className="font-medium text-slate-800">
              {customer.mobileNumber}
            </span>
            {customer.companyName && (
              <>
                {' · '}
                Company{' '}
                <span className="font-medium text-slate-800">
                  {customer.companyName}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusClasses}`}
          >
            {statusLabel}
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/employee/customers')}
          >
            Back to Customers
          </Button>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
        {/* Left: profile / meta */}
        <Card>
          <CardContent className="space-y-5 px-5 py-5 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Customer Overview
              </h2>
            </div>

            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Customer ID
                </dt>
                <dd className="mt-0.5 text-slate-900">
                  {customer.customerId}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Full Name
                </dt>
                <dd className="mt-0.5 text-slate-900">
                  {customer.fullName}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Company
                </dt>
                <dd className="mt-0.5 text-slate-900">
                  {customer.companyName || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Mobile
                </dt>
                <dd className="mt-0.5 text-slate-900">
                  {customer.mobileNumber}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Status
                </dt>
                <dd className="mt-0.5 text-slate-900">
                  <span
                    className={
                      customer.isActive
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }
                  >
                    {statusLabel}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Notes
                </dt>
                <dd className="mt-0.5 text-slate-900">
                  {customer.notes || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Created At
                </dt>
                <dd className="mt-0.5 text-slate-900">
                  {formatDate((customer as any).createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Last Updated
                </dt>
                <dd className="mt-0.5 text-slate-900">
                  {formatDate((customer as any).updatedAt)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Right: account security / reset password */}
        <Card>
          <CardContent className="space-y-5 px-5 py-5 md:px-6 md:py-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Account Security
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Reset the login password for this customer when required.
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                Sensitive
              </span>
            </div>

            {resetSuccess && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Password reset successfully. The customer can now log in with
                the new password.
              </div>
            )}

            {resetError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <Input
                label="New Password"
                name="newPassword"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
              <p className="text-[11px] text-slate-400">
                Use a strong password (minimum 8 characters). Share it with the
                customer via a secure channel; they will be asked to use this on
                their next login.
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/employee/customers')}
                  disabled={resetLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={resetLoading || !resetPassword.trim()}
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </form>

            <p className="border-t pt-3 text-[11px] text-slate-400">
              Only admins or employees from departments with the appropriate
              customer reset permission can perform this action. All attempts
              are validated by backend permission checks.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
