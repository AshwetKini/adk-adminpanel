// src/app/employee/customers/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { customerApi, type PagedResult } from '@/lib/api';
import type { Customer } from '@/types/customer';

export default function EmployeeCustomersPage() {
  const router = useRouter();

  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function load(p = 1, q = search) {
    setLoading(true);
    try {
      const result: PagedResult<Customer> = await customerApi.all({
        page: p,
        limit,
        search: q || undefined,
      });

      setList(result.data);
      setTotal(result.total);
      setPage(result.page);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
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

  if (!list.length && loading) {
    return <div>Loading customers...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header + search + create button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Customers</h1>

        <form
          onSubmit={onSearchSubmit}
          className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"
        >
          {/* Search bar */}
          <div className="w-full max-w-xs">
            <Input
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
              disabled={loading && !search}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => router.push('/employee/customers/create')}
            >
              Create Customer
            </Button>
          </div>
        </form>
      </div>

      {/* Table card */}
      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">
              {search
                ? 'No customers match your search.'
                : 'No customers yet. Create the first one.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="py-2 px-3 text-left">Customer ID</th>
                    <th className="py-2 px-3 text-left">Name</th>
                    <th className="py-2 px-3 text-left">Company</th>
                    <th className="py-2 px-3 text-left">Mobile</th>
                    <th className="py-2 px-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr
                      key={c._id ?? c.customerId}
                      className="border-b last:border-0"
                    >
                      <td className="py-2 px-3">{c.customerId}</td>
                      <td className="py-2 px-3">{c.fullName}</td>
                      <td className="py-2 px-3">{c.companyName || '-'}</td>
                      <td className="py-2 px-3">{c.mobileNumber}</td>
                      <td className="py-2 px-3">
                        {c.isActive ? 'Active' : 'Inactive'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination bar */}
          {list.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing{' '}
                <span className="font-medium">
                  {list.length ? (page - 1) * limit + 1 : 0}
                </span>{' '}
                –{' '}
                <span className="font-medium">
                  {(page - 1) * limit + list.length}
                </span>{' '}
                of <span className="font-medium">{total}</span> customers
              </span>
              <div className="flex items-center justify-end gap-2">
                <span className="hidden text-[11px] text-slate-500 sm:inline">
                  Page {page} of {totalPages}
                </span>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
