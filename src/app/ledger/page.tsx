'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { customerApi, paymentApi, ledgerApi } from '@/lib/api';

type ViewMode = 'outstanding' | 'statement';
type PaymentStatusFilter = 'all' | 'unpaid' | 'partiallypaid' | 'paid' | 'overdue';

function formatINR(value?: number | null) {
  const v = typeof value === 'number' ? value : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);
}

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function statusPill(status?: string) {
  const s = String(status || '').toLowerCase();
  const isOverdue = s === 'overdue';
  const isPaid = s === 'paid';
  const isPartial = s === 'partiallypaid';
  const isUnpaid = s === 'unpaid';

  const cls = isOverdue
    ? 'bg-red-50 text-red-700 ring-red-200'
    : isPaid
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : isPartial
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : isUnpaid
          ? 'bg-slate-50 text-slate-700 ring-slate-200'
          : 'bg-slate-50 text-slate-700 ring-slate-200';

  const label = isOverdue
    ? 'Overdue'
    : isPaid
      ? 'Paid'
      : isPartial
        ? 'Partially paid'
        : isUnpaid
          ? 'Unpaid'
          : status || '-';

  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', cls)}>
      {label}
    </span>
  );
}

function safeNum(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function clampMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default function LedgerPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string>('');

  // View mode
  const [view, setView] = useState<ViewMode>('outstanding');

  // Filters
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState<string>(toISO(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState<string>(toISO(today));
  const [useDueDateFilter, setUseDueDateFilter] = useState<boolean>(false);

  const [shipmentId, setShipmentId] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [status, setStatus] = useState<PaymentStatusFilter>('all');

  // Data
  const [accounts, setAccounts] = useState<any[]>([]);
  const [statement, setStatement] = useState<any>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState('');

  // Record payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(toISO(new Date()));
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payReference, setPayReference] = useState<string>('');
  const [payNote, setPayNote] = useState<string>('');
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState<string>('');

  // used to debounce server reload when typing
  const debounceRef = useRef<any>(null);

  const customerOptions = useMemo(() => {
    return customers
      .map((c) => {
        const id: string | undefined = c?._id || c?.id;
        const label = c?.fullName || c?.companyName || c?.customerId || c?.mobileNumber || id || 'Customer';
        return id ? { id, label } : null;
      })
      .filter(Boolean) as Array<{ id: string; label: string }>;
  }, [customers]);

  useEffect(() => {
    (async () => {
      setErrorMsg('');
      try {
        const res = await customerApi.all({ page: 1, limit: 50 });
        const list = res?.data || [];
        setCustomers(list);

        const firstId = (list?.[0]?._id || list?.[0]?.id) as string | undefined;
        if (firstId) setCustomerId(firstId);
      } catch (e: any) {
        setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to load customers');
      }
    })();
  }, []);

  const loadOutstanding = useCallback(async () => {
    if (!customerId) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const data = await paymentApi.queryAccounts({
        customerId,
        shipmentId: shipmentId.trim() ? shipmentId.trim() : undefined,
        search: q.trim() ? q.trim() : undefined,
        status: status === 'all' ? undefined : (status as any),
        dueDateFrom: useDueDateFilter ? from : undefined,
        dueDateTo: useDueDateFilter ? to : undefined,
      });

      setAccounts(Array.isArray(data) ? data : []);
      setStatement(null);
    } catch (e: any) {
      setAccounts([]);
      setStatement(null);
      setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to load receivables');
    } finally {
      setLoading(false);
    }
  }, [customerId, shipmentId, q, status, useDueDateFilter, from, to]);

  const loadStatement = useCallback(async () => {
    if (!customerId) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const fn = (ledgerApi as any).customerStatement;
      if (typeof fn !== 'function') throw new Error('Statement API not implemented (ledgerApi.customerStatement missing).');

      const data = await fn(customerId, {
        from,
        to,
        shipmentId: shipmentId.trim() ? shipmentId.trim() : undefined,
      });

      setStatement(data);
      setAccounts([]);
    } catch (e: any) {
      setStatement(null);
      setAccounts([]);
      setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  }, [customerId, from, to, shipmentId]);

  const load = useCallback(async () => {
    if (view === 'outstanding') return loadOutstanding();
    return loadStatement();
  }, [view, loadOutstanding, loadStatement]);

  // Auto-load on key filter changes (not on every keystroke)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, view, from, to, useDueDateFilter, status]);

  // Debounced reload when typing Search / Shipment ID (ERP-like feel)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (view === 'outstanding') loadOutstanding();
      else loadStatement();
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, shipmentId, view, loadOutstanding, loadStatement]);

  // KPIs from accounts
  const kpis = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts : [];
    const balanceTotal = list.reduce((s, a) => s + safeNum(a?.balance), 0);
    const overdueBalance = list.reduce((s, a) => s + (String(a?.status).toLowerCase() === 'overdue' ? safeNum(a?.balance) : 0), 0);
    const currentBalance = Math.max(0, balanceTotal - overdueBalance);

    const totalCount = list.length;
    const overdueCount = list.filter((a) => String(a?.status).toLowerCase() === 'overdue').length;

    return {
      balanceTotal,
      overdueBalance,
      currentBalance,
      totalCount,
      overdueCount,
      currentCount: totalCount - overdueCount,
    };
  }, [accounts]);

  // Drawer: load latest account on open
  useEffect(() => {
    const sid = selectedShipmentId;
    if (!drawerOpen || !sid) return;

    (async () => {
      setDrawerLoading(true);
      setDrawerError('');
      try {
        const full = await paymentApi.getAccount(sid);
        setSelectedAccount(full);
      } catch (e: any) {
        setSelectedAccount(null);
        setDrawerError(e?.response?.data?.message || e?.message || 'Failed to load account details');
      } finally {
        setDrawerLoading(false);
      }
    })();
  }, [drawerOpen, selectedShipmentId]);

  const openDrawerFor = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setSelectedAccount(null);
    setDrawerError('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedShipmentId(null);
    setSelectedAccount(null);
    setDrawerError('');
  };

  const openPayModal = () => {
    setPayError('');
    setPayAmount('');
    setPayDate(toISO(new Date()));
    setPayMethod('cash');
    setPayReference('');
    setPayNote('');
    setPayOpen(true);
  };

  const submitPayment = async () => {
    const sid = selectedAccount?.shipmentId || selectedShipmentId;
    if (!sid) return;

    const amount = clampMoney(Number(payAmount));
    const bal = clampMoney(safeNum(selectedAccount?.balance));

    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError('Enter a valid amount.');
      return;
    }
    if (bal > 0 && amount - bal > 0.0001) {
      setPayError(`Amount cannot exceed balance (${formatINR(bal)}).`);
      return;
    }

    setPaySaving(true);
    setPayError('');

    try {
      const updated = await paymentApi.recordPayment(sid, {
        amount,
        date: payDate || undefined,
        method: payMethod || 'cash',
        reference: payReference.trim() ? payReference.trim() : undefined,
        note: payNote.trim() ? payNote.trim() : undefined,
      });

      setSelectedAccount(updated);
      setPayOpen(false);

      // update list row without full reload
      setAccounts((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex((a) => a?.shipmentId === sid);
        if (idx >= 0) next[idx] = updated;
        return next;
      });
    } catch (e: any) {
      setPayError(e?.response?.data?.message || e?.message || 'Failed to record payment');
    } finally {
      setPaySaving(false);
    }
  };

  const deletePayment = async (paymentId: string) => {
    const sid = selectedAccount?.shipmentId || selectedShipmentId;
    if (!sid || !paymentId) return;

    const ok = window.confirm('Delete this payment entry? This action cannot be undone.');
    if (!ok) return;

    try {
      const updated = await paymentApi.deletePayment(sid, paymentId);
      setSelectedAccount(updated);

      setAccounts((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex((a) => a?.shipmentId === sid);
        if (idx >= 0) next[idx] = updated;
        return next;
      });
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed to delete payment');
    }
  };

  const statementRows = useMemo(() => {
    const s = statement;
    const rows = (s?.entries as any[]) || (s?.rows as any[]) || (s?.transactions as any[]) || (s?.data as any[]) || [];
    return Array.isArray(rows) ? rows : [];
  }, [statement]);

  const statementKpis = useMemo(() => {
    const debit = statementRows.reduce((s, r) => s + safeNum(r?.debit), 0);
    const credit = statementRows.reduce((s, r) => s + safeNum(r?.credit), 0);
    return { debit, credit, net: debit - credit, count: statementRows.length };
  }, [statementRows]);

  const downloadCsv = () => {
    const fileBase = view === 'outstanding' ? `ledger-ar-${customerId}` : `ledger-statement-${customerId}-${from}_to_${to}`;

    const rows =
      view === 'outstanding'
        ? (accounts || []).map((a) => ({
            shipmentId: a?.shipmentId ?? '',
            invoiceDate: a?.invoiceDate ?? '',
            dueDate: a?.dueDate ?? '',
            invoiceAmount: safeNum(a?.invoiceAmount),
            totalPaid: safeNum(a?.totalPaid),
            balance: safeNum(a?.balance),
            status: a?.status ?? '',
            customerName: a?.customerName ?? '',
            userId: a?.userId ?? '',
            mobileNumber: a?.mobileNumber ?? '',
          }))
        : statementRows.map((r) => ({
            date: r.date ?? r.createdAt ?? '',
            type: r.type ?? '',
            shipmentId: r.shipmentId ?? '',
            reference: r.reference ?? '',
            narration: r.narration ?? '',
            debit: safeNum(r.debit),
            credit: safeNum(r.credit),
            balance: r.balance ?? '',
            employee: r.collectedByEmployeeName || r.createdByEmployeeName || r.employeeName || r.createdBy || '',
          }));

    const header = Object.keys(rows[0] || { empty: '' });
    const csv = [
      header.join(','),
      ...rows.map((obj) =>
        header
          .map((k) => {
            const val = (obj as any)[k];
            const s = String(val ?? '').replaceAll('"', '""');
            return `"${s}"`;
          })
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileBase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">Finance</div>
            <h1 className="text-xl font-semibold text-slate-900">Ledger / Accounts Receivable</h1>
            <div className="mt-1 text-sm text-slate-500">Click a row to view payments and record receipts.</div>
          </div>

          <div className="flex gap-2">
            <button
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100"
              onClick={load}
              disabled={loading || !customerId}
              title="Reload"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>

            <button
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100"
              onClick={downloadCsv}
              disabled={view === 'outstanding' ? (accounts?.length ?? 0) === 0 : statementRows.length === 0}
              title="Download CSV"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <div className="mb-1 text-xs font-medium text-slate-600">Customer</div>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="mb-1 text-xs font-medium text-slate-600">View</div>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                value={view}
                onChange={(e) => setView(e.target.value as ViewMode)}
              >
                <option value="outstanding">Receivables (AR)</option>
                <option value="statement">Statement</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <div className="mb-1 text-xs font-medium text-slate-600">Search</div>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Shipment / customer / amount…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <div className="mb-1 text-xs font-medium text-slate-600">Status</div>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentStatusFilter)}
              >
                <option value="all">All</option>
                <option value="unpaid">Unpaid</option>
                <option value="partiallypaid">Partially paid</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <div className="mb-1 text-xs font-medium text-slate-600">Shipment ID</div>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Optional"
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
              />
            </div>

            <div className="md:col-span-6">
              <div className="mb-1 text-xs font-medium text-slate-600">Period (From → To)</div>
              <div className="flex gap-2">
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="mb-1 text-xs font-medium text-slate-600">Use period filter</div>
              <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={view === 'statement' ? true : useDueDateFilter}
                  onChange={(e) => setUseDueDateFilter(e.target.checked)}
                  disabled={view === 'statement'}
                />
                {view === 'statement' ? 'Statement uses From–To' : 'Filter AR by Due Date'}
              </label>
            </div>
          </div>

          {errorMsg ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</div>
          ) : null}
        </div>

        {/* KPI Cards */}
        {view === 'outstanding' ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Total Outstanding</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{formatINR(kpis.balanceTotal)}</div>
              <div className="mt-1 text-sm text-slate-500">{kpis.totalCount} account(s)</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Overdue</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{formatINR(kpis.overdueBalance)}</div>
              <div className="mt-1 text-sm text-slate-500">{kpis.overdueCount} overdue</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Current</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{formatINR(kpis.currentBalance)}</div>
              <div className="mt-1 text-sm text-slate-500">{kpis.currentCount} current</div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Total Debit</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{formatINR(statementKpis.debit)}</div>
              <div className="mt-1 text-sm text-slate-500">{statementKpis.count} row(s)</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Total Credit</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{formatINR(statementKpis.credit)}</div>
              <div className="mt-1 text-sm text-slate-500">Payments/adjustments</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Net</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{formatINR(statementKpis.net)}</div>
              <div className="mt-1 text-sm text-slate-500">Debit - Credit</div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">{view === 'outstanding' ? 'Receivables (AR Accounts)' : 'Statement'}</div>
            <div className="text-sm text-slate-500">
              Period: <span className="font-medium text-slate-700">{formatDate(from)}</span> →{' '}
              <span className="font-medium text-slate-700">{formatDate(to)}</span>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-600">Loading…</div>
          ) : view === 'outstanding' ? (
            (accounts?.length ?? 0) === 0 ? (
              <div className="p-10 text-center">
                <div className="text-sm font-medium text-slate-900">No receivables found</div>
                <div className="mt-1 text-sm text-slate-500">Try removing filters or confirm payment accounts exist for this customer.</div>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-[1250px] w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                      <th className="px-4 py-3">Shipment</th>
                      <th className="px-4 py-3">Invoice Date</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Invoice</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr
                        key={a?.id || a?.shipmentId}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => openDrawerFor(String(a?.shipmentId))}
                        title="Click to view details"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{a?.shipmentId}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(a?.invoiceDate)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(a?.dueDate)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatINR(safeNum(a?.invoiceAmount))}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatINR(safeNum(a?.totalPaid))}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatINR(safeNum(a?.balance))}</td>
                        <td className="px-4 py-3">{statusPill(a?.status)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{a?.ageDays != null ? `${a.ageDays}d` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : statementRows.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-sm font-medium text-slate-900">No statement rows found</div>
              <div className="mt-1 text-sm text-slate-500">If this is new, add backend support for ledgerApi.customerStatement.</div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Shipment</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Narration</th>
                  </tr>
                </thead>
                <tbody>
                  {statementRows.map((r, idx) => {
                    const employee =
                      r?.collectedByEmployeeName || r?.createdByEmployeeName || r?.employeeName || r?.createdBy || '-';

                    return (
                      <tr key={r.id || r._id || `${idx}`} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{formatDate(r.date || r.createdAt)}</td>
                        <td className="px-4 py-3 text-slate-700">{r.type || '-'}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{r.shipmentId || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{r.reference || '-'}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatINR(safeNum(r.debit))}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatINR(safeNum(r.credit))}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {r.balance != null ? formatINR(Number(r.balance)) : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{employee}</td>
                        <td className="px-4 py-3 text-slate-700">{r.narration || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Drawer */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
            <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div>
                  <div className="text-xs text-slate-500">Receivable</div>
                  <div className="text-base font-semibold text-slate-900">{selectedShipmentId || '-'}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
                    onClick={closeDrawer}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-4">
                {drawerLoading ? (
                  <div className="text-sm text-slate-600">Loading details…</div>
                ) : drawerError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{drawerError}</div>
                ) : !selectedAccount ? (
                  <div className="text-sm text-slate-600">No data.</div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary card */}
                    <div className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-500">Customer</div>
                          <div className="text-sm font-semibold text-slate-900">{selectedAccount?.customerName || '-'}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {selectedAccount?.userId ? `User: ${selectedAccount.userId}` : ''}
                            {selectedAccount?.mobileNumber ? ` • Mobile: ${selectedAccount.mobileNumber}` : ''}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {statusPill(selectedAccount?.status)}
                          <button
                            className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            onClick={openPayModal}
                            disabled={safeNum(selectedAccount?.balance) <= 0}
                            title={safeNum(selectedAccount?.balance) <= 0 ? 'No balance remaining' : 'Record Payment'}
                          >
                            Record Payment
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-md bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Invoice amount</div>
                          <div className="mt-1 font-semibold text-slate-900">{formatINR(safeNum(selectedAccount?.invoiceAmount))}</div>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Balance</div>
                          <div className="mt-1 font-semibold text-slate-900">{formatINR(safeNum(selectedAccount?.balance))}</div>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Invoice date</div>
                          <div className="mt-1 text-slate-900">{formatDate(selectedAccount?.invoiceDate)}</div>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Due date</div>
                          <div className="mt-1 text-slate-900">{formatDate(selectedAccount?.dueDate)}</div>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Total paid</div>
                          <div className="mt-1 text-slate-900">{formatINR(safeNum(selectedAccount?.totalPaid))}</div>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Last payment</div>
                          <div className="mt-1 text-slate-900">{formatDate(selectedAccount?.lastPaymentDate)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Payments table */}
                    <div className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">Payments</div>
                        <div className="text-xs text-slate-500">{(selectedAccount?.payments?.length ?? 0)} entry(s)</div>
                      </div>

                      {Array.isArray(selectedAccount?.payments) && selectedAccount.payments.length > 0 ? (
                        <div className="mt-3 overflow-auto">
                          <table className="min-w-[900px] w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                                <th className="px-3 py-2">Date</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                                <th className="px-3 py-2">Method</th>
                                <th className="px-3 py-2">Reference</th>
                                <th className="px-3 py-2">Collected by</th>
                                <th className="px-3 py-2">Note</th>
                                <th className="px-3 py-2 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedAccount.payments.map((p: any) => (
                                <tr key={p.id || p._id || `${p.date}-${p.amount}`} className="border-b border-slate-100">
                                  <td className="px-3 py-2 text-slate-700">{formatDate(p?.date)}</td>
                                  <td className="px-3 py-2 text-right text-slate-900 font-medium">{formatINR(safeNum(p?.amount))}</td>
                                  <td className="px-3 py-2 text-slate-700">{p?.method || '-'}</td>
                                  <td className="px-3 py-2 text-slate-700">{p?.reference || '-'}</td>
                                  <td className="px-3 py-2 text-slate-700">{p?.collectedByEmployeeName || '-'}</td>
                                  <td className="px-3 py-2 text-slate-700">{p?.note || '-'}</td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                                      onClick={() => deletePayment(String(p?.id || p?._id))}
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-slate-500">No payments recorded.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Record Payment Modal */}
        {payOpen ? (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/40" onClick={() => (paySaving ? null : setPayOpen(false))} />
            <div className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div>
                  <div className="text-xs text-slate-500">Record payment</div>
                  <div className="text-sm font-semibold text-slate-900">{selectedShipmentId || selectedAccount?.shipmentId || '-'}</div>
                </div>
                <button
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                  disabled={paySaving}
                  onClick={() => setPayOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="p-4 space-y-3">
                {payError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{payError}</div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-600">Amount</div>
                    <input
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="0.00"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      inputMode="decimal"
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      Balance: {formatINR(safeNum(selectedAccount?.balance))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-600">Date</div>
                    <input
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-600">Method</div>
                    <select
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-600">Reference</div>
                    <input
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Txn ID / Cheque no."
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium text-slate-600">Note</div>
                  <textarea
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    rows={3}
                    placeholder="Optional"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                  <button
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    disabled={paySaving}
                    onClick={() => setPayOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="h-10 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={paySaving}
                    onClick={submitPayment}
                  >
                    {paySaving ? 'Saving…' : 'Save payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
