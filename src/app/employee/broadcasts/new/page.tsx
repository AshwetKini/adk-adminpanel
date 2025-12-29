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

type ToastType = 'success' | 'error' | 'info';

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-11 w-11 rounded-xl skeleton-shimmer" />
        <div className="min-w-0 space-y-2">
          <div className="h-4 w-56 max-w-[60vw] rounded skeleton-shimmer" />
          <div className="h-4 w-72 max-w-[70vw] rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="h-6 w-6 rounded skeleton-shimmer" />
    </div>
  );
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

  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const toastTimerRef = useRef<any>(null);

  const debounceRef = useRef<any>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  function showToast(message: string, type: ToastType = 'info') {
    setToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectedIds = useMemo(() => {
    return new Set(selected.map((c) => String(c?.id ?? c?._id ?? '')));
  }, [selected]);

  const canCreate = name.trim().length >= 2 && selected.length >= 1 && !creating;

  async function loadCustomers(searchText: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await customerApi.all({ page: 1, limit: 50, search: searchText.trim() || undefined });
      setItems(Array.isArray((res as any)?.data) ? (res as any).data : []);
    } catch (e: any) {
      setItems([]);
      const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to load customers';
      setErr(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts: "/" focus search, "Esc" clear search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as any)?.tagName?.toLowerCase?.();
      const isTyping = tag === 'input' || tag === 'textarea' || (e.target as any)?.isContentEditable;

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
      }

      if (e.key === 'Escape') {
        if (document.activeElement === searchRef.current) searchRef.current?.blur();
        if (query.trim()) onSearchChange('');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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

  function removePickedById(id: string) {
    setSelected((prev) => prev.filter((x: any) => String(x?.id ?? x?._id ?? '') !== id));
  }

  async function onCreate() {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      showToast('Broadcast name must be at least 2 characters.', 'error');
      return;
    }

    if (selected.length < 1) {
      showToast('Select at least 1 customer.', 'error');
      return;
    }

    try {
      setCreating(true);

      const recipients: BroadcastRecipient[] = selected.map((c: any) => {
        const fullName = String(c.fullName ?? '').trim();
        const customerId = String(c.customerId ?? '').trim();
        const displayName = fullName && customerId ? `${fullName} (${customerId})` : fullName || customerId || 'Customer';

        return {
          userType: 'customer',
          userId: String(c.id ?? c._id),
          displayName,
        };
      });

      await broadcastApi.create({ name: trimmed, recipients });

      showToast('Broadcast list created.', 'success');
      setTimeout(() => router.replace('/employee/broadcasts'), 350);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to create broadcast list';
      showToast(msg, 'error');
    } finally {
      setCreating(false);
    }
  }

  const selectedPreview = useMemo(() => selected.slice(0, 10), [selected]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-0 page-enter">
      {/* Toast */}
      {toast ? (
        <div className={['toast', `toast-${toast.type}`].join(' ')} role="status" aria-live="polite">
          <div className="toast-dot" />
          <div className="toast-msg">{toast.message}</div>
          <button className="toast-x" onClick={() => setToast(null)} aria-label="Close toast">
            ×
          </button>
        </div>
      ) : null}

      {/* Header */}
      <div className="panel-enter">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-11px font-medium uppercase tracking-wide text-slate-400">
              Employee <span className="text-slate-300">/</span> Broadcasts <span className="text-slate-300">/</span> New
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New broadcast</h1>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-11px font-medium text-slate-700">
                Selected: {selected.length}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-11px font-medium text-slate-700">
                Shortcut: <span className="ml-1 font-semibold text-slate-900">/</span>
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Create a list by selecting customers, then send a broadcast message to everyone in the list.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => router.push('/employee/broadcasts')} disabled={creating}>
              Cancel
            </Button>

            <Button onClick={onCreate} disabled={!canCreate}>
              {creating ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Creating…
                </span>
              ) : (
                'Create broadcast'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card className="border border-slate-200 bg-white shadow-sm panel-enter panel-delay-1">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2">
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
                  ref={searchRef}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  placeholder="Search by ID, name, mobile…"
                  value={query}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                <Button variant="secondary" onClick={() => onSearchChange('')} disabled={!query.trim()}>
                  Clear
                </Button>
              </div>

              {err ? (
                <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {err}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Showing <span className="font-semibold text-slate-700">{loading ? '—' : items.length}</span> result
                  {items.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  className="text-slate-600 hover:text-slate-900 underline underline-offset-2 disabled:opacity-50"
                  onClick={() => setSelected([])}
                  disabled={selected.length < 1 || creating}
                >
                  Clear selection
                </button>
              </div>
            </div>
          </div>

          {/* Selected chips preview */}
          {selected.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Selected customers ({selected.length})
                </div>
                {selected.length > selectedPreview.length ? (
                  <div className="text-xs text-slate-500">
                    Showing {selectedPreview.length} of {selected.length}
                  </div>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {selectedPreview.map((c: any, idx: number) => {
                  const id = String(c?.id ?? c?._id ?? `sel-${idx}`);
                  const label = String(c?.fullName ?? '').trim() || String(c?.customerId ?? '').trim() || 'Customer';
                  const sub = String(c?.customerId ?? '').trim();

                  return (
                    <div
                      key={id}
                      className="group inline-flex max-w-full items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-slate-700 shadow-sm"
                      title={sub ? `${label} (${sub})` : label}
                    >
                      <span className="truncate max-w-[240px]">{sub ? `${label} (${sub})` : label}</span>
                      <button
                        type="button"
                        className="h-5 w-5 rounded-full border bg-slate-50 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => removePickedById(String(c?.id ?? c?._id ?? ''))}
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              No customers selected yet. Click a customer below to add them.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer list */}
      <Card className="border border-slate-200 bg-white shadow-sm panel-enter panel-delay-2">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No customers found.</div>
          ) : (
            <div className="divide-y">
              {items.map((c: any, idx: number) => {
                const id = String(c?.id ?? c?._id ?? `row-${idx}`);
                const active = selectedIds.has(String(c?.id ?? c?._id ?? ''));

                const fullName = String(c?.fullName ?? '').trim() || '—';
                const customerId = String(c?.customerId ?? '').trim() || '—';
                const mobile = String(c?.mobileNumber ?? '').trim() || '—';

                return (
                  <button
                    key={id}
                    onClick={() => togglePick(c)}
                    className={[
                      'w-full text-left p-4 flex items-center justify-between gap-3 transition',
                      'hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100',
                      active ? 'bg-blue-50/70' : '',
                      'row-enter',
                    ].join(' ')}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={[
                          'h-11 w-11 rounded-xl border flex items-center justify-center font-bold',
                          active ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700',
                        ].join(' ')}
                      >
                        {initials(fullName !== '—' ? fullName : customerId)}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{fullName}</div>
                        <div className="mt-1 text-sm text-slate-600 truncate">
                          ID: {customerId} • Mobile: {mobile}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {active ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          Selected
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                          Tap to add
                        </span>
                      )}

                      <div className="w-7 text-right font-bold text-emerald-600">{active ? '✓' : ''}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
          .row-enter {
            animation: rowIn 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
            will-change: transform, opacity;
          }

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

          /* Toast */
          .toast {
            position: fixed;
            right: 18px;
            bottom: 18px;
            z-index: 80;
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 260px;
            max-width: min(520px, calc(100vw - 36px));
            padding: 10px 12px;
            border-radius: 12px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: white;
            box-shadow: 0 18px 40px rgba(2, 6, 23, 0.16);
            animation: toastIn 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          .toast-msg {
            font-size: 13px;
            color: rgba(15, 23, 42, 1);
            line-height: 1.25;
            flex: 1;
          }
          .toast-x {
            width: 26px;
            height: 26px;
            border-radius: 8px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: rgba(248, 250, 252, 1);
            color: rgba(100, 116, 139, 1);
            transition: background 140ms ease, color 140ms ease;
          }
          .toast-x:hover {
            background: rgba(241, 245, 249, 1);
            color: rgba(30, 41, 59, 1);
          }
          .toast-dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: rgba(148, 163, 184, 1);
          }
          .toast-success .toast-dot {
            background: rgba(16, 185, 129, 1);
          }
          .toast-error .toast-dot {
            background: rgba(239, 68, 68, 1);
          }
          .toast-info .toast-dot {
            background: rgba(59, 130, 246, 1);
          }
          @keyframes toastIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.98);
              filter: blur(1px);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
              filter: blur(0);
            }
          }
        }
      `}</style>
    </div>
  );
}
