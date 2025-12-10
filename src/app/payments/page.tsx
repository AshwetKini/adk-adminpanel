// src/app/payments/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { paymentApi, type PaymentAccount, type PaymentSummary, type PaymentStatus } from '@/lib/api';

export default function PaymentsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    status: PaymentStatus | '' ;
    search: string;
  }>({
    status: '',
    search: '',
  });

  useEffect(() => {
    void loadData();
  }, [filters]);

  async function loadData() {
    try {
      setLoading(true);
      const [summaryRes, accountsRes] = await Promise.all([
        paymentApi.getSummary(),
        paymentApi.queryAccounts({
          status: filters.status || undefined,
          search: filters.search || undefined,
        }),
      ]);
      setSummary(summaryRes);
      setAccounts(accountsRes);
    } catch (err) {
      console.error(err);
      alert('Failed to load payments data');
    } finally {
      setLoading(false);
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
        className={`px-2 py-1 text-xs font-semibold rounded ${styles[status]}`}
      >
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Payments & Receivables</h1>

      {/* Summary */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-5">
          <SummaryCard label="Unpaid" value={summary.unpaid} />
          <SummaryCard label="Partially paid" value={summary.partiallyPaid} />
          <SummaryCard label="Paid" value={summary.paid} accent="text-green-600" />
          <SummaryCard label="Overdue" value={summary.overdue} accent="text-red-600" />
          <div className="rounded bg-white p-4 shadow">
            <div className="text-sm text-gray-600">Total receivable</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">
              ₹ {summary.totalReceivable.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded bg-white p-4 shadow">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as PaymentStatus | '',
                }))
              }
              className="rounded border px-3 py-2"
            >
              <option value="">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Search</label>
            <input
              type="text"
              placeholder="Customer, shipment ID, customer code..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Shipment ID</Th>
              <Th>Customer</Th>
              <Th>Invoice date</Th>
              <Th>Due date</Th>
              <Th align="right">Invoice amt</Th>
              <Th align="right">Paid</Th>
              <Th align="right">Balance</Th>
              <Th align="center">Status</Th>
              <Th align="center">Age</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {accounts.map((a) => (
              <tr
                key={a.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => router.push(`/payments/${a.shipmentId}`)}
              >
                <Td className="font-medium text-blue-600">{a.shipmentId}</Td>
                <Td>
                  <div>{a.customerName}</div>
                  <div className="text-xs text-gray-500">{a.userId}</div>
                </Td>
                <Td>
                  {a.invoiceDate
                    ? new Date(a.invoiceDate).toLocaleDateString()
                    : '-'}
                </Td>
                <Td>
                  {a.dueDate
                    ? new Date(a.dueDate).toLocaleDateString()
                    : '-'}
                </Td>
                <Td align="right">
                  ₹ {a.invoiceAmount.toLocaleString()}
                </Td>
                <Td align="right" className="text-green-600">
                  ₹ {a.totalPaid.toLocaleString()}
                </Td>
                <Td align="right" className="font-semibold text-red-600">
                  ₹ {a.balance.toLocaleString()}
                </Td>
                <Td align="center">{getStatusBadge(a.status)}</Td>
                <Td align="center">
                  {a.ageDays === null || a.ageDays === undefined
                    ? '-'
                    : `${a.ageDays}d`}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>

        {accounts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No payment accounts found
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded bg-white p-4 shadow">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ?? ''}`}>{value}</div>
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
    <td className={`px-4 py-3 ${base} ${className}`}>
      {children}
    </td>
  );
}
