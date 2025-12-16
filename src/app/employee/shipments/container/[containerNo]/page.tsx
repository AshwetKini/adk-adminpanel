'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { shipmentApi } from '@/lib/api';
import type { Shipment } from '@/types/shipment';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function ContainerShipmentsPage() {
  const router = useRouter();
  const params = useParams<{ containerNo: string }>();
  const containerNo = decodeURIComponent(params.containerNo);

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  async function load(p = 1) {
    setLoading(true);
    try {
      const res = await shipmentApi.listByContainer(containerNo, {
        page: p,
        limit,
        search: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setShipments(res.data);
      setTotal(res.total);
      setPage(res.page);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerNo]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Container: {containerNo}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Click a shipment to open its existing detail page.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/employee/shipments')}>
            Back
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-3 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-700">Search</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">From date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">To date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => load(1)} disabled={loading}>
              Apply
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setFromDate('');
                setToDate('');
                setTimeout(() => load(1), 0);
              }}
              disabled={loading}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Shipment ID</th>
                  {/* <th className="px-3 py-2 text-left">Shipment type</th> */}
                  <th className="px-3 py-2 text-left">Container status</th>
                  <th className="px-3 py-2 text-left">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {shipments.length === 0 && !loading ? (
                  <tr>
                    {/* <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500"> */}
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                      No shipments found in this container.
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer hover:bg-slate-100"
                      onClick={() => router.push(`/employee/shipments/${s.id}`)}
                    >
                      <td className="px-3 py-2 text-xs text-slate-700">{formatDate(s.date)}</td>
                      <td className="px-3 py-2 text-sm font-medium text-slate-900">
                        {s.customerName}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">
                        {s.shipmentId ?? s.id}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {s.shipmentType ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                           {s.containerStatus ?? '-'}
                       <div className="text-11px text-slate-500">
                     {s.containerCurrentLocation ?? '-'}
       </div>
     </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {s.deliveryLocation ?? '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <span>
              Page {page} of {totalPages} (Total: {total})
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => load(page - 1)}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages || loading}
                onClick={() => load(page + 1)}
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
