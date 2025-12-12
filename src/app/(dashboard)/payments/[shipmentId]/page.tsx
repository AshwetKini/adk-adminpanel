// src/app/payments/[shipmentId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  paymentApi,
  shipmentApi,
  type PaymentAccount,
  type PaymentStatus,
} from '@/lib/api';
import type { Shipment, LineItem } from '@/types/shipment';
import {
  ArrowLeft,
  CreditCard,
  IndianRupee,
  Clock,
  FileText,
} from 'lucide-react';

// Extend Shipment to guarantee lineItems on the frontend side
type ShipmentWithLines = Shipment & {
  lineItems?: LineItem[];
};

// Helper: format dates as dd/MM/yyyy like Excel display
function formatDate(value?: string | Date) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper: sum a numeric field across line items
function sumField(lineItems: LineItem[] | undefined, field: keyof LineItem) {
  if (!lineItems || lineItems.length === 0) return 0;
  return lineItems.reduce((sum, li) => {
    const v = li[field];
    if (typeof v === 'number') return sum + v;
    return sum;
  }, 0);
}

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params?.shipmentId as string;

  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [shipment, setShipment] = useState<ShipmentWithLines | null>(null);
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
      const acc = await paymentApi.getAccount(shipmentId);
      setAccount(acc);

      const ship = await shipmentApi.get(acc.shipmentMongoId);
      setShipment(ship as ShipmentWithLines);
    } catch (err) {
      console.error(err);
      alert('Failed to load payment or shipment details');
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
      unpaid: 'bg-red-100 text-red-800 ring-red-200',
      partially_paid: 'bg-amber-100 text-amber-800 ring-amber-200',
      paid: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
      overdue: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200',
    };
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles[status]}`}
      >
        <CreditCard className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-white px-6 py-4 text-sm shadow">
          Loading payment details…
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6">
        <button
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Payment account not found.
        </div>
      </div>
    );
  }

  const percentPaid =
    account.invoiceAmount > 0
      ? Math.min(100, Math.round((account.totalPaid / account.invoiceAmount) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6 animate-fadeIn">
      {/* Page header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <button
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-3 w-3" />
            Back to payments
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Shipment {account.shipmentId}
            </h1>
            {getStatusBadge(account.status)}
          </div>
          <p className="text-xs text-slate-500">
            Full receivable view combining shipment details, line items and payment history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-medium">
              Age:{' '}
              {account.ageDays != null ? `${account.ageDays} days` : '—'}
            </span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-medium">
              Receipt:{' '}
              {shipment ? formatDate(shipment.receiptDate) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Top summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-5 text-slate-50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-300">
                Invoice amount
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <IndianRupee className="h-4 w-4 text-emerald-300" />
                <span className="text-2xl font-semibold">
                  {account.invoiceAmount.toLocaleString()}
                </span>
              </div>
            </div>
            <CreditCard className="h-8 w-8 text-slate-300/70" />
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-600">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-300">
            <span>Paid {percentPaid}%</span>
            <span>Balance {account.balance.toLocaleString()}</span>
          </div>
        </div>

        <SummaryBox
          label="Total paid"
          value={`₹ ${account.totalPaid.toLocaleString()}`}
          tone="success"
        />
        <SummaryBox
          label="Balance"
          value={`₹ ${account.balance.toLocaleString()}`}
          tone="danger"
        />
        <SummaryBox
          label="Customer"
          value={account.customerName}
          helper={account.userId}
        />
      </div>

      {/* Main two-column layout */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: shipment + line items */}
        <div className="space-y-5 lg:col-span-2">
          {/* Shipment details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-900">
                Shipment details
              </h2>
              {shipment?.remarks && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">
                  {shipment.remarks}
                </span>
              )}
            </div>

            {shipment ? (
              <div className="space-y-4 text-xs text-slate-600">
                <div className="grid gap-4 md:grid-cols-4">
                  <DetailField
                    label="Receipt date"
                    value={formatDate(shipment.receiptDate)}
                  />
                  <DetailField
                    label="Document date"
                    value={formatDate(shipment.date)}
                  />
                  <DetailField
                    label="Shipment ID"
                    value={shipment.shipmentId || '-'}
                    mono
                  />
                  <DetailField
                    label="Delivery location"
                    value={shipment.deliveryLocation || '-'}
                  />
                </div>

                <div className="grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Customer
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {shipment.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      User ID:{' '}
                      <span className="font-mono">{shipment.userId}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Mobile:{' '}
                      <span className="font-mono">{shipment.mobileNumber}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Internal notes
                    </div>
                    <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      {shipment.remarks || 'No remarks recorded for this shipment.'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Shipment details could not be loaded.
              </div>
            )}
          </div>

          {/* Line items & charges */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-900">
                Line items & charges
              </h2>
              {shipment && (
                <div className="text-[11px] text-slate-500">
                  {shipment.lineItems?.length || 0} items
                </div>
              )}
            </div>

            {shipment && shipment.lineItems && shipment.lineItems.length > 0 ? (
              <>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <Th>SO</Th>
                        <Th>Ctns</Th>
                        <Th>Item</Th>
                        <Th>PCS</Th>
                        <Th>KGS</Th>
                        <Th>CBM</Th>
                        <Th align="right">Net charges</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {shipment.lineItems.map((li, idx) => (
                        <tr
                          key={`${li.soNo || idx}-${li.itemName}`}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                        >
                          <Td>{li.soNo || '-'}</Td>
                          <Td>{li.ctns ?? '-'}</Td>
                          <Td className="max-w-[220px] truncate">
                            {li.itemName}
                          </Td>
                          <Td>{li.pcsRaw ?? li.pcs ?? '-'}</Td>
                          <Td>{li.kgs ?? '-'}</Td>
                          <Td>{li.cbm ?? '-'}</Td>
                          <Td align="right" className="font-semibold text-slate-900">
                            {li.totalNetCharges != null
                              ? li.totalNetCharges.toLocaleString()
                              : li.amount != null
                              ? li.amount.toLocaleString()
                              : '-'}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals row similar to Excel charges summary */}
                <div className="mt-4 grid gap-4 text-[11px] text-slate-700 md:grid-cols-4">
                  <SummaryMini
                    label="Total CTNS"
                    value={sumField(shipment.lineItems, 'ctns')}
                  />
                  <SummaryMini
                    label="Total KGS"
                    value={sumField(shipment.lineItems, 'kgs')}
                  />
                  <SummaryMini
                    label="Total CBM"
                    value={sumField(shipment.lineItems, 'cbm')}
                  />
                  <SummaryMini
                    label="Total net charges"
                    value={
                      sumField(
                        shipment.lineItems,
                        'totalNetCharges',
                      ).toLocaleString() || 0
                    }
                    currency
                  />
                </div>
              </>
            ) : (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No line items found for this shipment.
              </div>
            )}
          </div>
        </div>

        {/* Right: payments panel (summary + form + history) */}
        <div className="space-y-5">
          {/* Payments control card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-slate-900">
                  Payments
                </h2>
                <p className="text-[11px] text-slate-500">
                  Record receipts against this shipment.
                </p>
              </div>
              {account.status !== 'paid' && (
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
                  onClick={() => setShowForm((v) => !v)}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {showForm ? 'Close form' : 'Add payment'}
                </button>
              )}
            </div>

            {showForm && (
              <form
                onSubmit={handleSubmit}
                className="mb-3 grid gap-3 rounded-lg bg-slate-50 p-4 text-xs md:grid-cols-2"
              >
                <div>
                    <label className="mb-1 block font-medium text-slate-700">
                        Amount
                     </label>
                        <input
                          type="text"
                            inputMode="decimal"
                                   required
                              value={form.amount}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, amount: e.target.value }))
                        }
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />

                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    Method *
                  </label>
                  <select
                    value={form.method}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, method: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    Reference
                  </label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, reference: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Cheque no, UTR, etc."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block font-medium text-slate-700">
                    Note
                  </label>
                  <textarea
                    value={form.note}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    Save payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="inline-flex items-center justify-center rounded-md bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Quick payment stats */}
            <div className="mt-2 grid gap-3 text-[11px] text-slate-600 md:grid-cols-3">
              <SummaryMini
                label="Last payment"
                value={
                  account.lastPaymentDate
                    ? formatDate(account.lastPaymentDate)
                    : 'No payments yet'
                }
              />
              <SummaryMini
                label="Payments count"
                value={account.payments.length}
              />
              <SummaryMini
                label="Outstanding"
                value={`₹ ${account.balance.toLocaleString()}`}
                currency
              />
            </div>
          </div>

          {/* Payment history */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-900">
                Payment history
              </h2>
              {account.payments.length > 0 && (
                <div className="text-[11px] text-slate-500">
                  {account.payments.length} record
                  {account.payments.length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {account.payments.length === 0 ? (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No payments recorded yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {account.payments.map((p, idx) => (
                      <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                        <Td>{formatDate(p.date)}</Td>
                        <Td
                          align="right"
                          className="font-semibold text-emerald-700"
                        >
                          ₹ {p.amount.toLocaleString()}
                        </Td>
                        <Td className="capitalize">
                          {p.method.replace('_', ' ')}
                        </Td>
                        <Td className="text-slate-600">
                          {p.reference || '-'}
                        </Td>
                        <Td>{p.collectedByEmployeeName || '-'}</Td>
                        <Td className="max-w-[180px] truncate text-slate-600">
                          {p.note || '-'}
                        </Td>
                        <Td align="right">
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="text-[11px] font-medium text-red-600 hover:text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
    <th
      className={`px-4 py-2.5 ${cls}`}
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
    <td className={`px-4 py-2.5 ${base} ${className}`}>{children}</td>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`text-sm text-slate-900 ${
          mono ? 'font-mono tracking-tight' : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: 'success' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600'
      : tone === 'danger'
      ? 'text-red-600'
      : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
      {helper && (
        <div className="mt-0.5 text-[11px] text-slate-500 truncate">
          {helper}
        </div>
      )}
    </div>
  );
}

function SummaryMini({
  label,
  value,
  currency,
}: {
  label: string;
  value: string | number;
  currency?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-medium text-slate-900">
        {currency ? `₹ ${value}` : value}
      </div>
    </div>
  );
}
