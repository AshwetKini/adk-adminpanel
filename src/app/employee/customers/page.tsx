// src/app/employee/customers/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { customerApi, type PagedResult } from '@/lib/api';
import type { Customer } from '@/types/customer';

function StatusPill({ active }: { active: boolean }) {
  const cls = active
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-rose-200 bg-rose-50 text-rose-700';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b last:border-0">
      <td className="py-3 px-3">
        <div className="h-4 w-24 rounded bg-slate-200" />
      </td>
      <td className="py-3 px-3">
        <div className="h-4 w-44 rounded bg-slate-200" />
      </td>
      <td className="py-3 px-3">
        <div className="h-4 w-40 rounded bg-slate-200" />
      </td>
      <td className="py-3 px-3">
        <div className="h-4 w-28 rounded bg-slate-200" />
      </td>
      <td className="py-3 px-3">
        <div className="h-6 w-20 rounded-full bg-slate-200" />
      </td>
    </tr>
  );
}

export default function EmployeeCustomersPage() {
  const router = useRouter();

  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const hasSearch = search.trim().length > 0;

  async function load(p = 1, q = search) {
    setLoading(true);
    setErr(null);

    try {
      const result: PagedResult<Customer> = await customerApi.all({
        page: p,
        limit,
        search: q.trim() ? q.trim() : undefined,
      });

      setList(result.data);
      setTotal(result.total);
      setPage(result.page);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(1, search);
  }

  function onClear() {
    setSearch('');
    load(1, '');
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search customers and open details to manage password and profile.
          </p>
        </div>

        <Button type="button" onClick={() => router.push('/employee/customers/create')}>
          Create Customer
        </Button>
      </div>

      {/* Filters */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <form onSubmit={onSearchSubmit} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-md">
                <Input
                  label="Search"
                  placeholder="Search by ID, name, company, mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClear}
                  disabled={loading || !hasSearch}
                >
                  Clear
                </Button>
              </div>
            </form>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Total: <span className="font-semibold text-slate-800">{total.toLocaleString()}</span>
              </span>
              <span className="hidden sm:inline rounded-full bg-slate-100 px-3 py-1">
                Page: <span className="font-semibold text-slate-800">{page}</span> / {totalPages}
              </span>
            </div>
          </div>

          {err ? (
            <div className="flex flex-col gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{err}</span>
              <Button type="button" variant="secondary" onClick={() => load(page)}>
                Retry
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr className="border-b">
                  <th className="py-3 px-3 text-left">Customer ID</th>
                  <th className="py-3 px-3 text-left">Name</th>
                  <th className="py-3 px-3 text-left">Company</th>
                  <th className="py-3 px-3 text-left">Mobile</th>
                  <th className="py-3 px-3 text-left">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      {hasSearch ? 'No customers match your search.' : 'No customers yet. Create the first one.'}
                    </td>
                  </tr>
                ) : (
                  list.map((c, index) => (
                    <tr
                      key={c._id}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                      }`}
                      onClick={() => router.push(`/employee/customers/${c._id}`)}
                      title="Open customer"
                    >
                      <td className="py-3 px-3 font-medium text-blue-700 underline">{c.customerId}</td>
                      <td className="py-3 px-3 text-slate-900">{c.fullName}</td>
                      <td className="py-3 px-3 text-slate-700">{c.companyName || '-'}</td>
                      <td className="py-3 px-3 font-mono text-slate-800">{c.mobileNumber}</td>
                      <td className="py-3 px-3">
                        <StatusPill active={!!c.isActive} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {list.length > 0 && !loading ? (
            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing{' '}
                <span className="font-medium">{(page - 1) * limit + 1}</span> –{' '}
                <span className="font-medium">{(page - 1) * limit + list.length}</span> of{' '}
                <span className="font-medium">{total.toLocaleString()}</span> customers
              </span>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => load(page - 1)}
                >
                  Prev
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => load(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
