'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { broadcastApi, type BroadcastList } from '@/lib/api';

function getListId(it: any) {
  return String(it?.id ?? it?._id ?? '');
}

function recipientsCount(it: any) {
  const r = it?.recipients;
  return Array.isArray(r) ? r.length : 0;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function SkeletonRow() {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-4">
        <div className="h-4 w-64 rounded skeleton-shimmer" />
        <div className="mt-2 h-3 w-44 rounded skeleton-shimmer" />
      </td>
      <td className="px-4 py-4">
        <div className="h-6 w-24 rounded-full skeleton-shimmer" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 w-36 rounded skeleton-shimmer" />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="ml-auto h-9 w-40 rounded skeleton-shimmer" />
      </td>
    </tr>
  );
}

export default function EmployeeBroadcastsPage() {
  const router = useRouter();

  const [items, setItems] = useState<BroadcastList[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await broadcastApi.list();
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load broadcast lists');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Shortcuts: "/" focus search, "Esc" clear, "R" refresh
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as any)?.tagName?.toLowerCase?.();
      const isTyping = tag === 'input' || tag === 'textarea' || (e.target as any)?.isContentEditable;

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
      }

      if (e.key === 'Escape') {
        setQ('');
        if (document.activeElement === searchRef.current) searchRef.current?.blur();
      }

      if ((e.key === 'r' || e.key === 'R') && !isTyping) {
        e.preventDefault();
        load();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = Array.isArray(items) ? [...items] : [];

    // Recent first (enterprise default)
    list.sort((a: any, b: any) => {
      const ad = new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime();
      const bd = new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime();
      return bd - ad;
    });

    if (!t) return list;
    return list.filter((x: any) => String(x?.name || '').toLowerCase().includes(t));
  }, [items, q]);

  const stats = useMemo(() => {
    const totalLists = items.length;
    const totalRecipients = items.reduce((acc, it: any) => acc + recipientsCount(it), 0);
    const emptyLists = items.reduce((acc, it: any) => acc + (recipientsCount(it) === 0 ? 1 : 0), 0);
    return { totalLists, totalRecipients, emptyLists };
  }, [items]);

  const hasSearch = q.trim().length > 0;

  const onDelete = useCallback(
    async (id: string) => {
      const ok = window.confirm('Do you want to delete this broadcast list?');
      if (!ok) return;

      try {
        setDeletingId(id);

        // optimistic remove
        setItems((prev: any) => (Array.isArray(prev) ? prev.filter((x: any) => getListId(x) !== id) : prev));

        await broadcastApi.remove(id);
        await load();
      } catch (e: any) {
        window.alert(e?.response?.data?.message || e?.message || 'Failed to delete');
        await load();
      } finally {
        setDeletingId(null);
      }
    },
    [load],
  );

  return (
    <div className="flex w-full flex-col gap-4 page-enter">
      {/* Header */}
      <div className="panel-enter">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Employee</div>

            <div className="mt-1 flex items-end gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Broadcasts</h1>

              {/* Subtle animated accent bar */}
              <div className="relative hidden sm:block">
                <div className="h-1 w-28 rounded-full header-accent" />
                <div className="pointer-events-none absolute -inset-3 rounded-full header-accent-blur" />
              </div>
            </div>

            <p className="mt-1 text-[14px] leading-6 text-slate-600">
              Create lists and send one message to many customers.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Link href="/employee/broadcasts/new">
              <Button>+ Create</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 panel-enter panel-delay-1">
        <div className="kpi-card rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total lists</div>
          <div className="mt-1 text-[20px] font-semibold tracking-tight text-slate-900">
            {stats.totalLists.toLocaleString()}
          </div>
        </div>

        <div className="kpi-card rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total recipients</div>
          <div className="mt-1 text-[20px] font-semibold tracking-tight text-slate-900">
            {stats.totalRecipients.toLocaleString()}
          </div>
        </div>

        <div className="kpi-card rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Empty lists</div>
          <div className="mt-1 text-[20px] font-semibold tracking-tight text-slate-900">
            {stats.emptyLists.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-slate-200 bg-white shadow-sm panel-enter panel-delay-2">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-md">
              <Input
                ref={searchRef}
                label="Search"
                placeholder="Search by broadcast name"
                value={q}
                onChange={(e: any) => setQ(e.target.value)}
              />
              <div className="mt-2 text-[11px] text-slate-500">
                Shortcuts: <span className="font-medium">/</span> search, <span className="font-medium">R</span>{' '}
                refresh, <span className="font-medium">Esc</span> clear.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setQ('')} disabled={!hasSearch}>
                Clear
              </Button>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Showing <span className="font-semibold text-slate-900">{filtered.length}</span>
              </span>
            </div>
          </div>

          {err ? (
            <div className="flex flex-col gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 truncate">{err}</span>
              <Button type="button" variant="secondary" onClick={load}>
                Retry
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-slate-200 bg-white shadow-sm panel-enter panel-delay-2">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-[13.5px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left">List</th>
                  <th className="px-4 py-3 text-left">Recipients</th>
                  <th className="px-4 py-3 text-left">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">
                      {hasSearch ? 'No broadcast lists match your search.' : 'No broadcast lists yet.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((it: any, index: number) => {
                    const id = getListId(it);
                    const name = String(it?.name ?? '').trim() || '—';
                    const count = recipientsCount(it);
                    const updatedAt = String(it?.updatedAt ?? it?.createdAt ?? '');
                    const rowDeleting = deletingId === id;

                    return (
                      <tr
                        key={id || `${name}-${index}`}
                        style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
                        className={[
                          'group row-enter row-glow cursor-pointer',
                          rowDeleting ? 'opacity-60' : '',
                        ].join(' ')}
                        onClick={() => router.push(`/employee/broadcasts/${encodeURIComponent(id)}`)}
                        title="Open broadcast"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            {/* Left accent indicator (subtle) */}
                            <div className="pt-0.5">
                              <div className="h-9 w-1.5 rounded-full bg-gradient-to-b from-blue-500 via-indigo-500 to-fuchsia-500 opacity-50 transition-all duration-200 group-hover:opacity-100 group-hover:h-10" />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-[15px] font-semibold leading-5 text-slate-900">
                                {name}
                              </div>
                              <div className="mt-1 text-xs leading-5 text-slate-600">
                                Open to view recipients and send a message
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={[
                              'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                              count > 0
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600',
                            ].join(' ')}
                          >
                            {count} recipient{count === 1 ? '' : 's'}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-700">{formatDate(updatedAt)}</td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e: any) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/employee/broadcasts/${encodeURIComponent(id)}`);
                              }}
                              disabled={!id}
                            >
                              Open
                            </Button>

                            <Button
                              variant="danger"
                              size="sm"
                              disabled={!id || rowDeleting}
                              onClick={(e: any) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!id) return;
                                onDelete(id);
                              }}
                            >
                              {rowDeleting ? 'Deleting…' : 'Delete'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .page-enter {
            animation: pageIn 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }

          .panel-enter {
            animation: fadeUp 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          .panel-delay-1 {
            animation-delay: 60ms;
          }
          .panel-delay-2 {
            animation-delay: 120ms;
          }

          .kpi-card {
            transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
            will-change: transform;
          }
          .kpi-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 14px 36px rgba(15, 23, 42, 0.09);
            border-color: rgba(148, 163, 184, 0.75);
          }

          .row-enter {
            animation: rowIn 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
            will-change: transform, opacity;
          }

          /* Shimmer skeletons */
          .skeleton-shimmer {
            background: linear-gradient(
              90deg,
              rgba(226, 232, 240, 1) 0%,
              rgba(241, 245, 249, 1) 30%,
              rgba(226, 232, 240, 1) 60%,
              rgba(226, 232, 240, 1) 100%
            );
            background-size: 200% 100%;
            animation: shimmer 1.1s linear infinite;
          }

          /* Header accent animation */
          .header-accent {
            background: linear-gradient(90deg, #2563eb, #6366f1, #d946ef, #2563eb);
            background-size: 220% 100%;
            animation: gradientShift 2.2s linear infinite;
          }

          .header-accent-blur {
            background: linear-gradient(90deg, rgba(37, 99, 235, 0.25), rgba(99, 102, 241, 0.22), rgba(217, 70, 239, 0.18));
            filter: blur(12px);
            opacity: 0.9;
          }

          /* Table row “glow” (subtle, still professional) */
          .row-glow td {
            transition: background-color 160ms ease, box-shadow 160ms ease;
          }
          .row-glow:hover td {
            background-color: rgba(37, 99, 235, 0.03);
            box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.12);
          }

          @keyframes pageIn {
            from {
              opacity: 0;
              transform: translateY(10px);
              filter: blur(2px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0);
            }
          }

          @keyframes fadeUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes rowIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes shimmer {
            from {
              background-position: 200% 0;
            }
            to {
              background-position: -200% 0;
            }
          }

          @keyframes gradientShift {
            0% {
              background-position: 0% 0;
            }
            100% {
              background-position: 220% 0;
            }
          }
        }
      `}</style>
    </div>
  );
}
