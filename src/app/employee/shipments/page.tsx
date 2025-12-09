// src/app/employee/shipments/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { shipmentApi } from '@/lib/api';
import type { Shipment } from '@/types/shipment';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

// Extend Shipment type locally to include lineItems from the backend
type ShipmentWithLines = Shipment & {
  lineItems?: {
    soNo?: string;
    ctns?: number;
    itemName?: string;
    value?: number;
    pcsRaw?: string;
    pcs?: number;
    pcsParts?: number[];
    rateRaw?: string;
    rate?: number;
    rateParts?: number[];
    kgs?: number;
    cbm?: number;
    mark?: string;
    unit?: string;
    amount?: number;
    securityDeposit?: number;
    chargesOnDeposit?: number;
    depositCharges?: number;
    localTransportCharges?: number;
    outstationTransportCharges?: number;
    packingCharges?: number;
    gstBillingCharges?: number;
    extraChargesIfAny?: number;
    discountIfAny?: number;
    totalNetCharges?: number;
    detailItems?: { name: string; qty: number }[];
  }[];
};

// Always display dates as dd/MM/yyyy
function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// helpers for lineItems-based model
function getFirstLineItem(s: ShipmentWithLines) {
  return s.lineItems && s.lineItems.length > 0 ? s.lineItems[0] : null;
}

function getTotalNetCharges(s: ShipmentWithLines) {
  if (!s.lineItems || s.lineItems.length === 0) return undefined;
  return s.lineItems.reduce(
    (sum, li) => sum + (li.totalNetCharges ?? 0),
    0,
  );
}

export default function EmployeeShipmentsPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<ShipmentWithLines[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  async function loadData(p = 1) {
    setLoading(true);
    try {
      const result = await shipmentApi.list({
        page: p,
        limit,
        search: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setShipments(result.data as ShipmentWithLines[]);
      setTotal(result.total);
      setPage(result.page);
    } catch (err: any) {
      alert(
        err?.response?.data?.message || 'Failed to load shipments',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      alert('Please select an Excel file first.');
      return;
    }
    setImporting(true);
    try {
      const res = await shipmentApi.importExcel(file);
      alert(`${res.message}. Inserted ${res.insertedCount} rows.`);
      await loadData(1);
    } catch (err: any) {
      alert(
        err?.response?.data?.message || 'Failed to import shipments',
      );
    } finally {
      setImporting(false);
    }
  }

  const hasActiveFilters = !!search || !!fromDate || !!toDate;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Shipments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Import Excel files and manage shipments.
          </p>
        </div>
        <div className="flex gap-3 text-xs sm:text-sm">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Total records
            </div>
            <div className="text-base font-semibold text-slate-900">
              {total.toLocaleString()}
            </div>
          </div>
          <div className="hidden sm:block rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Page size
            </div>
            <div className="text-base font-semibold text-slate-900">
              {limit}
            </div>
          </div>
        </div>
      </div>

      {/* Top row: Import + Filters */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Import card */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Import shipments
              </h2>
              {importing && (
                <span className="rounded-full bg-amber-50 px-2 py-[2px] text-[11px] font-medium text-amber-700">
                  Uploading…
                </span>
              )}
            </div>
            <form onSubmit={onImport} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Excel file
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) =>
                    setFile(e.target.files?.[0] || null)
                  }
                  className="block w-full cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:border-slate-400"
                />
              </div>
              <p className="text-[11px] leading-snug text-slate-500">
                Make sure the Excel file follows the required format.
              </p>
              <div className="flex justify-end">
                <Button type="submit" disabled={importing}>
                  {importing ? 'Importing…' : 'Import shipments'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Filters card spans remaining columns */}
        <Card className="border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Filters
              </h2>
              {hasActiveFilters && (
                <span className="rounded-full bg-blue-50 px-2 py-[2px] text-[11px] font-medium text-blue-700">
                  Filters applied
                </span>
              )}
            </div>
            <form
              onSubmit={onFilterSubmit}
              className="grid grid-cols-1 items-end gap-3 md:grid-cols-4"
            >
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-700">
                  Global search
                </label>
                <Input
                  placeholder="Search by customer, user ID, mobile, shipment ID, item, location…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  From date
                </label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  To date
                </label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2 md:col-span-4 md:justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Loading…' : 'Apply filters'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setFromDate('');
                    setToDate('');
                    loadData(1);
                  }}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">User ID</th>
                  <th className="px-3 py-2 text-left">Mobile</th>
                  <th className="px-3 py-2 text-left">Shipment ID</th>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Net charges</th>
                  <th className="px-3 py-2 text-left">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {shipments.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-sm text-slate-500"
                    >
                      No shipments found for the selected filters.
                    </td>
                  </tr>
                )}
                {shipments.map((s, index) => {
                  const first = getFirstLineItem(s);
                  const net = getTotalNetCharges(s);
                  return (
                    <tr
                      key={s.id ?? `${s.shipmentId ?? 'shipment'}-${index}`}
                      onClick={() =>
                        router.push(`/employee/shipments/${s.id}`)
                      }
                      className={`cursor-pointer ${
                        index % 2 === 0 ? 'bg-slate-50/40' : ''
                      } hover:bg-slate-100`}
                    >
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {formatDate(s.date)}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-sm font-medium text-slate-900">
                        {s.customerName}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {s.userId}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {s.mobileNumber}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-700">
                        {s.shipmentId}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-sm text-slate-700">
                        {first?.itemName ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                        {net != null ? net.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {s.deliveryLocation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing{' '}
              <span className="font-medium">
                {shipments.length ? (page - 1) * limit + 1 : 0}
              </span>{' '}
              –{' '}
              <span className="font-medium">
                {(page - 1) * limit + shipments.length}
              </span>{' '}
              of{' '}
              <span className="font-medium">
                {total.toLocaleString()}
              </span>{' '}
              shipments
            </span>
            <div className="flex items-center justify-end gap-2">
              <span className="hidden text-[11px] text-slate-500 sm:inline">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => loadData(page - 1)}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages || loading}
                onClick={() => loadData(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
