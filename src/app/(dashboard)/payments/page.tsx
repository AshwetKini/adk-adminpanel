// src/app/payments/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  paymentApi,
  type PaymentAccount,
  type PaymentSummary,
  type PaymentStatus,
} from '@/lib/api';
import {
  Search,
  Filter,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  IndianRupee,
} from 'lucide-react';

export default function PaymentsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    status: PaymentStatus | '';
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
      unpaid: 'bg-red-100 text-red-800 ring-red-200',
      partially_paid: 'bg-amber-100 text-amber-800 ring-amber-200',
      paid: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
      overdue: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200',
    };

    const icon =
      status === 'paid'
        ? <CheckCircle2 className="h-3.5 w-3.5" />
        : status === 'overdue'
        ? <AlertTriangle className="h-3.5 w-3.5" />
        : <CreditCard className="h-3.5 w-3.5" />;

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${styles[status]}`}
      >
        {icon}
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-white px-6 py-4 text-sm shadow">
          Loading payments…
        </div>
      </div>
    );
  }

  const totalCount = accounts.length;

  return (
    <div className="space-y-6 p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Payments & Receivables
          </h1>
          <p className="text-xs text-slate-500">
            Track outstanding amounts per shipment, filter by status, and drill into details.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
            <CreditCard className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-medium">
              Records: {totalCount.toLocaleString()}
            </span>
          </div>
          {summary && (
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium">
                Overdue: {summary.overdue}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
          <SummaryCard
            label="Unpaid"
            value={summary.unpaid}
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            tone="danger"
          />
          <SummaryCard
            label="Partially paid"
            value={summary.partiallyPaid}
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            tone="warning"
          />
          <SummaryCard
            label="Paid"
            value={summary.paid}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            tone="success"
          />
          <SummaryCard
            label="Overdue"
            value={summary.overdue}
            icon={<AlertTriangle className="h-4 w-4 text-fuchsia-500" />}
            tone="accent"
          />
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Total receivable
                </div>
                <div className="mt-1 flex items-baseline gap-1 text-blue-600">
                  <IndianRupee className="h-3.5 w-3.5" />
                  <span className="text-xl font-semibold">
                    {summary.totalReceivable.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            Filters
          </div>
          <div className="hidden items-center gap-2 text-[11px] text-slate-500 sm:flex">
            <span>Status and global search are applied server-side.</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Status pill filters */}
          <div className="flex flex-wrap gap-2 text-[11px] md:w-[420px]">
            {renderStatusPill('All', '', filters.status, setFilters)}
            {renderStatusPill('Unpaid', 'unpaid', filters.status, setFilters)}
            {renderStatusPill(
              'Partially paid',
              'partially_paid',
              filters.status,
              setFilters,
            )}
            {renderStatusPill('Paid', 'paid', filters.status, setFilters)}
            {renderStatusPill(
              'Overdue',
              'overdue',
              filters.status,
              setFilters,
            )}
          </div>

          {/* Search box */}
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Customer, shipment ID, customer code..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
          <tbody className="divide-y divide-slate-100 bg-white">
            {accounts.map((a, idx) => (
              <tr
                key={a.id}
                className={`cursor-pointer transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                } hover:bg-blue-50/60`}
                onClick={() => router.push(`/payments/${a.shipmentId}`)}
              >
                <Td className="font-mono text-xs font-semibold text-blue-700">
                  {a.shipmentId}
                </Td>
                <Td>
                  <div className="text-sm text-slate-900">
                    {a.customerName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {a.userId}
                  </div>
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
                <Td align="right" className="text-emerald-600">
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
          <div className="p-8 text-center text-sm text-slate-500">
            No payment accounts found.
          </div>
        )}
      </div>
    </div>
  );
}

function renderStatusPill(
  label: string,
  value: PaymentStatus | '',
  current: PaymentStatus | '',
  setFilters: React.Dispatch<
    React.SetStateAction<{ status: PaymentStatus | ''; search: string }>
  >,
) {
  const isActive = current === value || (!current && value === '');
  const base =
    'inline-flex items-center gap-1 rounded-full px-3 py-1 border text-[11px] cursor-pointer transition-colors';
  const active =
    'border-blue-500 bg-blue-50 text-blue-700';
  const inactive =
    'border-slate-200 bg-white text-slate-600 hover:bg-slate-50';

  return (
    <button
      type="button"
      onClick={() =>
        setFilters((prev) => ({
          ...prev,
          status: value,
        }))
      }
      className={`${base} ${isActive ? active : inactive}`}
    >
      {label}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'success' | 'danger' | 'warning' | 'accent';
}) {
  const toneMap: Record<string, string> = {
    success: 'text-emerald-600',
    danger: 'text-red-600',
    warning: 'text-amber-600',
    accent: 'text-fuchsia-600',
    default: 'text-slate-900',
  };
  const color = tone ? toneMap[tone] : toneMap.default;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className={`mt-1 text-xl font-semibold ${color}`}>
            {value}
          </div>
        </div>
        <div className="rounded-full bg-slate-50 p-2 text-slate-500">
          {icon}
        </div>
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
    <th className={`px-4 py-3 ${cls}`}>
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
