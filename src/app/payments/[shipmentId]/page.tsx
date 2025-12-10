// src/app/payments/[shipmentId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { paymentApi, type PaymentAccount, type PaymentStatus } from '@/lib/api';

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params?.shipmentId as string;

  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'cash',
    reference: '',
    note: '',
  });

  useEffect(() => {
    void load();
  }, [shipmentId]);

  async function load() {
    try {
      setLoading(true);
      const data = await paymentApi.getAccount(shipmentId);
      setAccount(data);
    } catch (err) {
      console.error(err);
      alert('Failed to load payment account');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) return;

    try {
      await paymentApi.recordPayment(shipmentId, {
        amount: parseFloat(form.amount),
        date: form.date,
        method: form.method,
        reference: form.reference || undefined,
        note: form.note || undefined,
      });
      setShowForm(false);
      setForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'cash',
        reference: '',
        note: '',
      });
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to record payment');
    }
  }

  async function handleDelete(paymentId: string) {
    if (!confirm('Delete this payment?')) return;
    try {
      await paymentApi.deletePayment(shipmentId, paymentId);
      await load();
    } catch (err) {
      console.error(err);
      alert('Failed to delete payment');
    }
  }

  function getStatusBadge(status: PaymentStatus) {
    const styles: Record<PaymentStatus, string> = {
      unpaid: 'bg-red-100 text-red-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-purple-100 text-purple-800',
    };
    return (
      <span
        className={`px-3 py-1 text-sm font-semibold rounded ${styles[status]}`}
      >
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6">
        <button
          className="mb-3 text-blue-600 hover:underline"
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <div className="text-red-600">Payment account not found.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <button
        className="text-blue-600 hover:underline"
        onClick={() => router.back()}
      >
        ← Back to payments
      </button>

      <h1 className="text-2xl font-bold">
        Payment for shipment {account.shipmentId}
      </h1>

      {/* Summary */}
      <div className="rounded bg-white p-6 shadow space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-gray-600">Customer</div>
            <div className="text-lg font-semibold">{account.customerName}</div>
            <div className="text-xs text-gray-500">{account.userId}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Invoice date</div>
            <div className="text-lg">
              {account.invoiceDate
                ? new Date(account.invoiceDate).toLocaleDateString()
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Due date</div>
            <div className="text-lg">
              {account.dueDate
                ? new Date(account.dueDate).toLocaleDateString()
                : '-'}
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t pt-4 md:grid-cols-4">
          <div>
            <div className="text-sm text-gray-600">Invoice amount</div>
            <div className="text-xl font-bold">
              ₹ {account.invoiceAmount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total paid</div>
            <div className="text-xl font-bold text-green-600">
              ₹ {account.totalPaid.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Balance</div>
            <div className="text-xl font-bold text-red-600">
              ₹ {account.balance.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm text-gray-600">Status</div>
            {getStatusBadge(account.status)}
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="rounded bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Payment history</h2>
          {account.status !== 'paid' && (
            <button
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Close form' : 'Add payment'}
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 grid gap-4 rounded border bg-gray-50 p-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm font-medium">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Method *
              </label>
              <select
                value={form.method}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, method: e.target.value }))
                }
                className="w-full rounded border px-3 py-2"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Reference
              </label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reference: e.target.value }))
                }
                className="w-full rounded border px-3 py-2"
                placeholder="Cheque no, UTR, etc."
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Note</label>
              <textarea
                value={form.note}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, note: e.target.value }))
                }
                className="w-full rounded border px-3 py-2"
                rows={2}
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Save payment
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded bg-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {account.payments.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            No payments recorded yet.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Date</Th>
                <Th align="right">Amount</Th>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th>Collected by</Th>
                <Th>Note</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {account.payments.map((p) => (
                <tr key={p.id}>
                  <Td>
                    {new Date(p.date).toLocaleDateString()}
                  </Td>
                  <Td align="right" className="font-semibold text-green-600">
                    ₹ {p.amount.toLocaleString()}
                  </Td>
                  <Td className="capitalize">
                    {p.method.replace('_', ' ')}
                  </Td>
                  <Td className="text-gray-600">
                    {p.reference || '-'}
                  </Td>
                  <Td>
                    {p.collectedByEmployeeName || '-'}
                  </Td>
                  <Td className="text-gray-600">
                    {p.note || '-'}
                  </Td>
                  <Td align="right">
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  const cls =
    align === 'right'
      ? 'text-right'
      : align === 'center'
      ? 'text-center'
      : 'text-left';
  return (
    <th
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 ${cls}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const base =
    align === 'right'
      ? 'text-right'
      : align === 'center'
      ? 'text-center'
      : 'text-left';
  return (
    <td className={`px-4 py-3 ${base} ${className}`}>{children}</td>
  );
}
