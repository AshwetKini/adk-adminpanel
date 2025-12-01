// src/app/employee/shipments/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { shipmentApi } from '@/lib/api';
import type { Shipment } from '@/types/shipment';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

// Always display dates as dd.MM.yyyy
function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`; // dd.MM.yyyy
}

export default function EmployeeShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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
      setShipments(result.data);
      setTotal(result.total);
      setPage(result.page);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          'Failed to load shipments',
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

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <h1 className="text-lg font-semibold">
            Shipments
          </h1>
          <form
            onSubmit={onFilterSubmit}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          >
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Search
              </label>
              <Input
                placeholder="Customer, user ID, mobile, shipment ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                From date
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                To date
              </label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Loading...' : 'Apply'}
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
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">User ID</th>
                  <th className="px-3 py-2 text-left">Mobile</th>
                  <th className="px-3 py-2 text-left">Shipment ID</th>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Net Charges</th>
                  <th className="px-3 py-2 text-left">Location</th>
                </tr>
              </thead>
              <tbody>
                {shipments.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-4 text-center text-slate-500"
                    >
                      No shipments found.
                    </td>
                  </tr>
                )}
                {shipments.map((s) => (
                  <tr
                    key={s._id}
                    className="border-t hover:bg-slate-50"
                  >
                    <td className="px-3 py-2">
                      {formatDate(s.date)}
                    </td>
                    <td className="px-3 py-2">
                      {s.customerName}
                    </td>
                    <td className="px-3 py-2">
                      {s.userId}
                    </td>
                    <td className="px-3 py-2">
                      {s.mobileNumber}
                    </td>
                    <td className="px-3 py-2">
                      {s.shipmentId}
                    </td>
                    <td className="px-3 py-2">
                      {s.itemName}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {s.totalNetCharges != null
                        ? s.totalNetCharges.toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {s.deliveryLocation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-600">
            <span>
              Page {page} of {totalPages} · {total} records
            </span>
            <div className="flex gap-2">
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
