'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { broadcastApi, customerApi, type BroadcastRecipient } from '@/lib/api';

function initials(name?: string) {
  const s = String(name ?? '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('');
}

export default function EmployeeCreateBroadcastPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const debounceRef = useRef<any>(null);

  const selectedIds = useMemo(() => {
    return new Set(selected.map((c) => String(c?.id ?? c?._id ?? '')));
  }, [selected]);

  async function loadCustomers(searchText: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await customerApi.all({ page: 1, limit: 50, search: searchText.trim() || undefined });
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (e: any) {
      setItems([]);
      setErr(e?.response?.data?.message ?? e?.message ?? 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers('');
  }, []);

  function onSearchChange(t: string) {
    setQuery(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCustomers(t), 350);
  }

  function togglePick(c: any) {
    const id = String(c?.id ?? c?._id ?? '');
    if (!id) return;

    setSelected((prev) => {
      const exists = prev.some((x: any) => String(x?.id ?? x?._id ?? '') === id);
      if (exists) return prev.filter((x: any) => String(x?.id ?? x?._id ?? '') !== id);
      return [...prev, c];
    });
  }

  async function onCreate() {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      window.alert('Broadcast name must be at least 2 characters.');
      return;
    }

    if (selected.length < 1) {
      window.alert('Select at least 1 customer.');
      return;
    }

    try {
      setCreating(true);

      const recipients: BroadcastRecipient[] = selected.map((c: any) => ({
        userType: 'customer',
        userId: String(c.id ?? c._id),
        displayName: String(c.fullName || c.customerId || 'Customer'),
      }));

      await broadcastApi.create({ name: trimmed, recipients });

      window.alert('Broadcast list created.');
      router.replace('/employee/broadcasts');
    } catch (e: any) {
      window.alert(e?.response?.data?.message ?? e?.message ?? 'Failed to create broadcast list');
    } finally {
      setCreating(false);
    }
  }

  const canCreate = name.trim().length >= 2 && selected.length >= 1 && !creating;

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New broadcast</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a list by selecting customers, then you can send a broadcast message.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/employee/broadcasts')} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={!canCreate}>
            {creating ? 'Creating…' : 'Create broadcast'}
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <Input
            label="Broadcast name"
            placeholder="e.g. December Offers"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Search customers</label>
            <div className="flex gap-2">
              <input
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by ID, name, mobile…"
                value={query}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <Button variant="secondary" onClick={() => onSearchChange('')} disabled={!query.trim()}>
                Clear
              </Button>
            </div>

            {err ? <div className="mt-2 text-sm text-rose-700">{err}</div> : null}

            <div className="mt-3 text-sm text-slate-600">
              Selected: <span className="font-semibold text-slate-900">{selected.length}</span>{' '}
              customer{selected.length === 1 ? '' : 's'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-sm text-slate-600">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No customers found.</div>
          ) : (
            <div className="divide-y">
              {items.map((c: any, idx: number) => {
                const id = String(c?.id ?? c?._id ?? `row-${idx}`);
                const active = selectedIds.has(String(c?.id ?? c?._id ?? ''));

                return (
                  <button
                    key={id}
                    onClick={() => togglePick(c)}
                    className={[
                      'w-full text-left p-4 hover:bg-slate-50 flex items-center justify-between gap-3',
                      active ? 'bg-blue-50' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl border bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                        {initials(c.fullName || c.customerId)}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{c.fullName || '—'}</div>
                        <div className="mt-1 text-sm text-slate-600 truncate">
                          ID: {c.customerId || '—'} • Mobile: {c.mobileNumber || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="w-8 text-right font-bold text-emerald-600">{active ? '✓' : ''}</div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
