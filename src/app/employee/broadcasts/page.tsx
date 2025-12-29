'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { broadcastApi, type BroadcastList } from '@/lib/api';

export default function EmployeeBroadcastsPage() {
  const [items, setItems] = useState<BroadcastList[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const list = await broadcastApi.list();
      setItems(list);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load broadcast lists');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((x) => String(x.name || '').toLowerCase().includes(t));
  }, [items, q]);

  async function onDelete(id: string) {
    const ok = window.confirm('Do you want to delete this broadcast list?');
    if (!ok) return;

    try {
      await broadcastApi.remove(id);
      await load();
    } catch (e: any) {
      window.alert(e?.response?.data?.message || e?.message || 'Failed to delete');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Broadcasts</h1>
          <p className="mt-1 text-sm text-slate-500">Create lists and send one message to many customers.</p>
        </div>

        <Link href="/employee/broadcasts/new">
          <Button>+ Create</Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-md">
              <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
              <div className="flex gap-2">
                <input
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search broadcast lists…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button variant="secondary" onClick={() => setQ('')} disabled={!q.trim()}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Total: <span className="font-semibold text-slate-800">{items.length}</span>
              </span>
            </div>
          </div>

          {err ? (
            <div className="mt-3 flex flex-col gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{err}</span>
              <Button type="button" variant="secondary" onClick={() => load()}>
                Retry
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-sm text-slate-600">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              {q.trim() ? 'No broadcast lists match your search.' : 'No broadcast lists yet.'}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((it) => {
                const count = Array.isArray(it.recipients) ? it.recipients.length : undefined;
                const href = `/employee/broadcasts/${encodeURIComponent(String(it._id))}`;

                return (
                  <Link
                    key={String(it._id)}
                    href={href}
                    className="block p-4 hover:bg-slate-50"
                    title="Open broadcast"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{it.name || '—'}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {typeof count === 'number' ? `${count} recipients` : 'Open to view recipients'}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault(); // stop Link navigation
                            e.stopPropagation();
                            onDelete(String(it._id));
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
