'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { shipmentApi, type ContainerSummary, type ContainerStatus } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

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

function formatShipmentTypes(types: (string | null | undefined)[]) {
  if (!types || types.length === 0) return '-';
  const cleaned = types.map((t) => (t ?? '').trim()).filter(Boolean);
  if (!cleaned.length) return '-';
  return Array.from(new Set(cleaned)).join(', ');
}

// Keep EXACT text values as your api.ts union type
const STATUS_OPTIONS: ContainerStatus[] = [
  'Order Placed',
  'Order Confirmed',
  'In Transit',
  'Arrived at Warehouse',
  'Departed from Warehouse',
  'Out for Delivery',
  'Delivered',
  'Delivery Delayed',
];

type ContainerRow = ContainerSummary;

export default function EmployeeShipmentsPage() {
  const router = useRouter();

  // Main table state (existing behavior)
  const [containers, setContainers] = useState<ContainerRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Modal state (new)
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const [modalSearch, setModalSearch] = useState('');
  const [modalPage, setModalPage] = useState(1);
  const [modalLimit] = useState(10);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalRows, setModalRows] = useState<ContainerRow[]>([]);

  const [selected, setSelected] = useState<ContainerRow | null>(null);

  const [status, setStatus] = useState<ContainerStatus>('Order Placed');
  const [currentLocation, setCurrentLocation] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(''); // yyyy-mm-dd
  const [remarks, setRemarks] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const modalTotalPages = useMemo(
    () => Math.max(1, Math.ceil(modalTotal / modalLimit)),
    [modalTotal, modalLimit],
  );

  async function loadData(p = 1) {
    setLoading(true);
    try {
      const result = await shipmentApi.listContainers({
        page: p,
        limit,
        search: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      setContainers(result.data);
      setTotal(result.total);
      setPage(result.page);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to load containers');
    } finally {
      setLoading(false);
    }
  }

  async function loadModalData(p = 1, q = modalSearch) {
    setModalLoading(true);
    try {
      const result = await shipmentApi.listContainers({
        page: p,
        limit: modalLimit,
        search: q.trim() ? q.trim() : undefined,
      });

      setModalRows(result.data);
      setModalTotal(result.total);
      setModalPage(result.page);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to load container list');
    } finally {
      setModalLoading(false);
    }
  }

  function openUpdateModal() {
    setShowUpdateModal(true);

    // reset modal ui
    setModalSearch('');
    setSelected(null);
    setStatus('Order Placed');
    setCurrentLocation('');
    setExpectedDeliveryDate('');
    setRemarks('');

    // load modal list
    void loadModalData(1, '');
  }

  function closeUpdateModal() {
    setShowUpdateModal(false);
    setSelected(null);
  }

  function selectContainer(c: ContainerRow) {
    setSelected(c);

    const incomingStatus = (c.status || 'Order Placed') as ContainerStatus;
    setStatus(STATUS_OPTIONS.includes(incomingStatus) ? incomingStatus : 'Order Placed');

    setCurrentLocation(c.currentLocation || '');

    setExpectedDeliveryDate(
      c.expectedDeliveryDate ? new Date(c.expectedDeliveryDate).toISOString().slice(0, 10) : '',
    );

    setRemarks(c.trackingRemarks || '');
  }

  useEffect(() => {
    loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(1);
  };

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
      alert(err?.response?.data?.message || 'Failed to import shipments');
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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Shipments</h1>
          <p className="mt-1 text-sm text-slate-500">Import Excel files and manage shipments.</p>
        </div>

        <div className="flex gap-3 text-xs sm:text-sm">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Total records
            </div>
            <div className="text-base font-semibold text-slate-900">{total.toLocaleString()}</div>
          </div>
          <div className="hidden sm:block rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Page size
            </div>
            <div className="text-base font-semibold text-slate-900">{limit}</div>
          </div>
        </div>
      </div>

      {/* Top row: Import + Filters */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Import card (KEEP EXACTLY AS IS) */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Import shipments</h2>
              {importing && (
                <span className="rounded-full bg-amber-50 px-2 py-[2px] text-[11px] font-medium text-amber-700">
                  Uploading…
                </span>
              )}
            </div>
            <form onSubmit={onImport} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Excel file</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
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
              <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
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
                <label className="text-xs font-medium text-slate-700">Global search</label>
                <Input
                  placeholder="Search by customer, user ID, mobile, shipment ID, item, location…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">From date</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">To date</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
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

      {/* One global action button (NEW) */}
      <div className="flex justify-end">
        <Button type="button" onClick={openUpdateModal}>
          Update container status
        </Button>
      </div>

      {/* Table (existing behavior kept; no per-row button now) */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Container No</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Shipment count</th>
                  <th className="px-3 py-2 text-right">Total net</th>
                  <th className="px-3 py-2 text-left">Shipment type(s)</th>
                  <th className="px-3 py-2 text-left">Last date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {containers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                      No containers found for the selected filters.
                    </td>
                  </tr>
                )}

                {containers.map((c, index) => {
                  const lastDate = c.lastDate ?? c.lastCreatedAt;

                  return (
                    <tr
                      key={c.containerNo || `container-${index}`}
                      onClick={() =>
                        router.push(
                          `/employee/shipments/container/${encodeURIComponent(c.containerNo)}`,
                        )
                      }
                      className={`cursor-pointer ${
                        index % 2 === 0 ? 'bg-slate-50/40' : ''
                      } hover:bg-slate-100`}
                      title="Open container"
                    >
                      <td className="px-3 py-2 text-sm font-mono text-slate-800">
                        {c.containerNo || '-'}
                      </td>

                      <td className="px-3 py-2 text-xs text-slate-700">
                        <div className="font-semibold text-slate-900">
                          {c.status || 'Order Placed'}
                        </div>
                        <div className="text-[11px] text-slate-500">{c.currentLocation || '-'}</div>
                      </td>

                      <td className="px-3 py-2 text-right text-sm text-slate-800">
                        {c.shipmentCount != null ? c.shipmentCount.toLocaleString() : '-'}
                      </td>

                      <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                        {c.totalNetCharges != null ? c.totalNetCharges.toLocaleString() : '-'}
                      </td>

                      <td className="px-3 py-2 text-xs text-slate-700">
                        {formatShipmentTypes(c.shipmentTypes)}
                      </td>

                      <td className="px-3 py-2 text-xs text-slate-700">{formatDate(lastDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar (existing behavior kept) */}
          <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing{' '}
              <span className="font-medium">{containers.length ? (page - 1) * limit + 1 : 0}</span>{' '}
              –{' '}
              <span className="font-medium">{(page - 1) * limit + containers.length}</span> of{' '}
              <span className="font-medium">{total.toLocaleString()}</span> containers
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

      {/* Modal: search/select container + update form (NEW) */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-lg">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Update container status</div>
                <div className="mt-1 text-xs text-slate-600">
                  Search a container, select it, then update status/location/EDD.
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={closeUpdateModal}>
                Close
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
              {/* Left: container search + list */}
              <div className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 p-3">
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void loadModalData(1, modalSearch);
                    }}
                  >
                    <Input
                      placeholder="Search container no / type / customer / shipment id…"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                    />
                    <Button type="submit" disabled={modalLoading}>
                      {modalLoading ? '...' : 'Search'}
                    </Button>
                  </form>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Total: {modalTotal.toLocaleString()}</span>
                    <span>
                      Page {modalPage} / {modalTotalPages}
                    </span>
                  </div>
                </div>

                <div className="max-h-[360px] overflow-auto">
                  <table className="min-w-full table-auto text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Container</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Count</th>
                        <th className="px-3 py-2 text-right">Select</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {!modalLoading && modalRows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                            No containers found.
                          </td>
                        </tr>
                      )}

                      {modalRows.map((c, idx) => {
                        const isActive = selected?.containerNo === c.containerNo;
                        return (
                          <tr key={`${c.containerNo}-${idx}`} className={isActive ? 'bg-blue-50/60' : ''}>
                            <td className="px-3 py-2 font-mono text-slate-800">{c.containerNo || '-'}</td>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-slate-900">{c.status || 'Order Placed'}</div>
                              <div className="text-[11px] text-slate-500">{c.currentLocation || '-'}</div>
                            </td>
                            <td className="px-3 py-2 text-right text-slate-800">
                              {c.shipmentCount != null ? c.shipmentCount.toLocaleString() : '-'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button type="button" variant="secondary" onClick={() => selectContainer(c)}>
                                Select
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 p-3 text-xs">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={modalPage <= 1 || modalLoading}
                    onClick={() => loadModalData(modalPage - 1, modalSearch)}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={modalPage >= modalTotalPages || modalLoading}
                    onClick={() => loadModalData(modalPage + 1, modalSearch)}
                  >
                    Next
                  </Button>
                </div>
              </div>

              {/* Right: update form */}
              <div className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Selected container
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {selected?.containerNo ? (
                      <span className="font-mono">{selected.containerNo}</span>
                    ) : (
                      'None'
                    )}
                  </div>
                </div>

                <form
                  className="space-y-4 p-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selected?.containerNo) {
                      alert('Please select a container first.');
                      return;
                    }

                    setSavingStatus(true);
                    try {
                      await shipmentApi.updateContainerStatus(selected.containerNo, {
                        status,
                        currentLocation: currentLocation.trim() ? currentLocation.trim() : undefined,
                        expectedDeliveryDate: expectedDeliveryDate || undefined,
                        remarks: remarks.trim() ? remarks.trim() : undefined,
                      });

                      // refresh main table (keep current page)
                      await loadData(page);

                      // refresh modal list too (to reflect new status immediately)
                      await loadModalData(modalPage, modalSearch);

                      alert('Container status updated successfully.');
                    } catch (err: any) {
                      alert(err?.response?.data?.message ?? 'Failed to update container status');
                    } finally {
                      setSavingStatus(false);
                    }
                  }}
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ContainerStatus)}
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={!selected}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Current location</label>
                    <Input
                      placeholder="e.g., Mumbai Port / Delhi Warehouse"
                      value={currentLocation}
                      onChange={(e) => setCurrentLocation(e.target.value)}
                      disabled={!selected}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Expected delivery date (manual)
                    </label>
                    <Input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      disabled={!selected}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Remarks</label>
                    <textarea
                      className="min-h-[90px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Optional notes..."
                      disabled={!selected}
                    />
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                    <Button type="button" variant="secondary" onClick={closeUpdateModal} disabled={savingStatus}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!selected || savingStatus}>
                      {savingStatus ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            <div className="border-t border-slate-200 p-3 text-[11px] text-slate-500">
              Tip: Search or select a container on the left, then update its status on the right.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
