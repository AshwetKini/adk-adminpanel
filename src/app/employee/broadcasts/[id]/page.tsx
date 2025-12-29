'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { broadcastApi, customerApi, type BroadcastList, type BroadcastRecipient } from '@/lib/api';

function initials(name?: string) {
  const s = String(name ?? '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('');
}

async function copyToClipboard(value: string) {
  const v = String(value ?? '');
  try {
    await navigator.clipboard.writeText(v);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = v;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function newClientRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function getBroadcastId(list: BroadcastList | null) {
  const anyList: any = list as any;
  return String(anyList?._id ?? anyList?.id ?? '');
}

function prettyRecipientLabel(r: { userType?: string; userId?: string; displayName?: string }) {
  const d = String((r as any).displayName ?? '').trim();
  if (d) return d;

  const t = String((r as any).userType ?? '').toLowerCase();
  if (t === 'customer') return 'Customer';
  if (t === 'employee') return 'Employee';
  if (t === 'admin') return 'Admin';
  return 'User';
}

function typeBadgeClass(type: string) {
  const t = String(type ?? '').toLowerCase();
  if (t === 'customer') return 'border-indigo-200 bg-indigo-50 text-indigo-700';
  if (t === 'employee') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (t === 'admin') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function SkeletonLine({ w = 'w-40' }: { w?: string }) {
  return <div className={`h-4 ${w} rounded skeleton-shimmer`} />;
}

function SkeletonTableRow() {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full skeleton-shimmer" />
          <div className="space-y-2">
            <SkeletonLine w="w-44" />
            <SkeletonLine w="w-28" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <SkeletonLine w="w-24" />
      </td>
      <td className="px-4 py-3">
        <SkeletonLine w="w-40" />
      </td>
      <td className="px-4 py-3 text-right">
        <SkeletonLine w="w-16" />
      </td>
    </tr>
  );
}

type ToastType = 'success' | 'error' | 'info';

export default function EmployeeBroadcastDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [list, setList] = useState<BroadcastList | null>(null);

  // rename
  const [nameDraft, setNameDraft] = useState('');

  // send broadcast
  const [messageText, setMessageText] = useState('');

  // recipients search (view only)
  const [recipientQuery, setRecipientQuery] = useState('');
  const recipientSearchRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  // recipients pagination (for thousands)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // edit recipients modal
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<any[]>([]);
  const [savingRecipients, setSavingRecipients] = useState(false);
  const debounceRef = useRef<any>(null);

  // Map: recipient.userId (mongo id) -> customer.customerId (human ID)
  const [customerIdMap, setCustomerIdMap] = useState<Record<string, string>>({});
  const [customerIdLoading, setCustomerIdLoading] = useState(false);

  // NEW: Map: recipient.userId (mongo id) -> customer.fullName (display name)
  const [customerNameMap, setCustomerNameMap] = useState<Record<string, string>>({});

  // Animations: re-trigger row entrance on paging/search
  const [rowsAnimKey, setRowsAnimKey] = useState(0);

  // Toast (replaces alert())
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const toastTimerRef = useRef<any>(null);

  function showToast(message: string, type: ToastType = 'info') {
    setToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => {
    return () => toastTimerRef.current && clearTimeout(toastTimerRef.current);
  }, []);

  const listId = useMemo(() => getBroadcastId(list), [list]);

  const recipients = useMemo(
    () => (Array.isArray(list?.recipients) ? (list!.recipients as BroadcastRecipient[]) : []),
    [list],
  );

  const recipientCount = recipients.length;

  const meta = useMemo(() => {
    const name = String((list as any)?.name ?? '').trim() || 'Broadcast';
    const createdAt = String((list as any)?.createdAt ?? '');
    const updatedAt = String((list as any)?.updatedAt ?? '');
    return { name, createdAt, updatedAt };
  }, [list]);

  function getRecipientLabel(r: BroadcastRecipient) {
    const typeLower = String((r as any)?.userType ?? '').toLowerCase();
    const uid = String((r as any)?.userId ?? '').trim();

    const rawDisplayName = String((r as any)?.displayName ?? '').trim();
    const rawLower = rawDisplayName.toLowerCase();

    // Treat generic displayName like "Customer" as not-a-real name,
    // so we can show resolved customerName instead.
    const generic =
      rawLower === 'customer' || rawLower === 'employee' || rawLower === 'admin' || rawLower === 'user';

    if (rawDisplayName && !generic) return rawDisplayName;

    if (typeLower === 'customer') {
      const resolvedName = String(customerNameMap[uid] ?? '').trim();
      if (resolvedName) return resolvedName;

      const resolvedCustomerId = String(customerIdMap[uid] ?? '').trim();
      if (resolvedCustomerId) return resolvedCustomerId;
    }

    return prettyRecipientLabel(r);
  }

  const filteredRecipients = useMemo(() => {
    const t = recipientQuery.trim().toLowerCase();
    if (!t) return recipients;

    return recipients.filter((r) => {
      const type = String((r as any)?.userType ?? '').toLowerCase();
      const uid = String((r as any)?.userId ?? '');

      const customerId = type === 'customer' ? (customerIdMap[uid] ?? '') : '';
      const customerName = type === 'customer' ? (customerNameMap[uid] ?? '') : '';

      const s = [r?.displayName, customerName, r?.userType, r?.userId, customerId].filter(Boolean).join(' ');
      return String(s).toLowerCase().includes(t);
    });
  }, [recipients, recipientQuery, customerIdMap, customerNameMap]);

  // Reset pagination when search changes or list changes
  useEffect(() => {
    setPage(1);
  }, [recipientQuery, listId]);

  const totalFiltered = filteredRecipients.length;

  const totalPages = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 1);
    return Math.max(1, Math.ceil(totalFiltered / size));
  }, [totalFiltered, pageSize]);

  useEffect(() => {
    // Keep page in range
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const visibleRecipients = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 1);
    const start = (page - 1) * size;
    return filteredRecipients.slice(start, start + size);
  }, [filteredRecipients, page, pageSize]);

  const showingFrom = useMemo(() => {
    if (totalFiltered === 0) return 0;
    return (page - 1) * pageSize + 1;
  }, [page, pageSize, totalFiltered]);

  const showingTo = useMemo(() => {
    return Math.min(page * pageSize, totalFiltered);
  }, [page, pageSize, totalFiltered]);

  useEffect(() => {
    // re-run row entrance animation on these changes
    setRowsAnimKey((k) => k + 1);
  }, [page, pageSize, recipientQuery]);

  function getDisplayedId(r: BroadcastRecipient) {
    const type = String((r as any)?.userType ?? '').toLowerCase();
    const uid = String((r as any)?.userId ?? '').trim();

    if (type === 'customer') {
      // If resolved and non-empty -> show it
      if (Object.prototype.hasOwnProperty.call(customerIdMap, uid)) {
        const cid = String(customerIdMap[uid] ?? '').trim();
        return cid || '—';
      }
      // Not resolved yet -> show blank placeholder (no "Resolving…" text)
      return '—';
    }

    return uid || '—';
  }

  function isCustomerIdResolved(r: BroadcastRecipient) {
    const type = String((r as any)?.userType ?? '').toLowerCase();
    const uid = String((r as any)?.userId ?? '').trim();
    if (type !== 'customer') return true;
    return Object.prototype.hasOwnProperty.call(customerIdMap, uid);
  }

  // Resolve customerId + customerName ONLY for visible page (fast even if list has 10k recipients)
  useEffect(() => {
    const ids = Array.from(
      new Set(
        visibleRecipients
          .filter((r) => String((r as any)?.userType ?? '').toLowerCase() === 'customer')
          .map((r) => String((r as any)?.userId ?? '').trim())
          .filter(Boolean),
      ),
    );

    const missing = ids.filter(
      (uid) =>
        !Object.prototype.hasOwnProperty.call(customerIdMap, uid) ||
        !Object.prototype.hasOwnProperty.call(customerNameMap, uid),
    );

    if (missing.length === 0) return;

    let cancelled = false;

    async function run() {
      setCustomerIdLoading(true);

      const queue = [...missing];
      const foundIds: Record<string, string> = {};
      const foundNames: Record<string, string> = {};

      const concurrency = Math.min(6, queue.length);

      async function worker() {
        while (!cancelled) {
          const uid = queue.shift();
          if (!uid) break;

          try {
            const customer = await customerApi.one(uid);

            const cid = String((customer as any)?.customerId ?? '').trim();
            const name = String((customer as any)?.fullName ?? (customer as any)?.name ?? '').trim();

            foundIds[uid] = cid || '';
            foundNames[uid] = name || '';
          } catch {
            foundIds[uid] = '';
            foundNames[uid] = '';
          }
        }
      }

      await Promise.all(Array.from({ length: concurrency }).map(() => worker()));

      if (!cancelled) {
        setCustomerIdMap((prev) => ({ ...prev, ...foundIds }));
        setCustomerNameMap((prev) => ({ ...prev, ...foundNames }));
        setCustomerIdLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // NOTE: include maps so we don't re-fetch cached keys
  }, [visibleRecipients, customerIdMap, customerNameMap]);

  const selectedIds = useMemo(() => {
    return new Set(selectedCustomers.map((c) => String(c?.id ?? c?._id ?? '')));
  }, [selectedCustomers]);

  const canSend = !!messageText.trim() && recipientCount > 0 && !sending && !deleting;
  const canSaveName = nameDraft.trim().length >= 2 && !savingName && !deleting;

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setErr(null);
    try {
      const data = await broadcastApi.get(id);
      setList(data);
      setNameDraft(String((data as any)?.name ?? ''));
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Failed to load broadcast list');
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Shortcuts: "/" focus recipient search, "M" focus message, "Esc" clear/close, "R" refresh
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as any)?.tagName?.toLowerCase?.();
      const isTyping = tag === 'input' || tag === 'textarea' || (e.target as any)?.isContentEditable;

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        recipientSearchRef.current?.focus();
      }

      if ((e.key === 'm' || e.key === 'M') && !isTyping) {
        e.preventDefault();
        messageRef.current?.focus();
      }

      if (e.key === 'Escape') {
        if (editOpen) setEditOpen(false);
        setRecipientQuery('');
        if (document.activeElement === recipientSearchRef.current) recipientSearchRef.current?.blur();
      }

      if ((e.key === 'r' || e.key === 'R') && !isTyping) {
        e.preventDefault();
        load();
        showToast('Refreshing…', 'info');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen, load]);

  async function onSaveName() {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2) {
      showToast('Name must be at least 2 characters.', 'error');
      return;
    }
    if (!listId) return;

    setSavingName(true);
    try {
      const updated = await broadcastApi.rename(listId, trimmed);
      setList(updated);
      showToast('Name updated.', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? e?.message ?? 'Failed to rename list', 'error');
    } finally {
      setSavingName(false);
    }
  }

  async function onDeleteList() {
    if (!listId) return;
    const ok = window.confirm('Delete this broadcast list?');
    if (!ok) return;

    setDeleting(true);
    try {
      await broadcastApi.remove(listId);
      showToast('Broadcast list deleted.', 'success');
      router.replace('/employee/broadcasts');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? e?.message ?? 'Failed to delete list', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function onSend() {
    const text = messageText.trim();
    if (!text) {
      showToast('Message cannot be empty.', 'error');
      return;
    }
    if (!listId) return;

    setSending(true);
    try {
      const clientRequestId = newClientRequestId();
      const res = await broadcastApi.send(listId, { text, clientRequestId });
      const sent = typeof (res as any)?.sent === 'number' ? (res as any).sent : undefined;
      showToast(sent !== undefined ? `Broadcast sent to ${sent} recipients.` : 'Broadcast sent.', 'success');
      setMessageText('');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? e?.message ?? 'Failed to send broadcast', 'error');
    } finally {
      setSending(false);
    }
  }

  async function loadCustomers(searchText: string) {
    setEditLoading(true);
    setEditErr(null);
    try {
      const res = await customerApi.all({ page: 1, limit: 50, search: searchText.trim() || undefined });
      setCustomers(Array.isArray((res as any)?.data) ? (res as any).data : []);
    } catch (e: any) {
      setCustomers([]);
      setEditErr(e?.response?.data?.message ?? e?.message ?? 'Failed to load customers');
    } finally {
      setEditLoading(false);
    }
  }

  function openEditRecipients() {
    if (!list) return;

    const existingCustomers = (list.recipients || []).filter(
      (r) => String((r as any)?.userType ?? '').toLowerCase() === 'customer',
    ) as BroadcastRecipient[];

    setSelectedCustomers(
      existingCustomers.map((r) => {
        const uid = String((r as any)?.userId ?? '').trim();
        const label = getRecipientLabel(r); // already resolves customerNameMap if available
        const cid = String(customerIdMap[uid] ?? '').trim();

        return {
          id: uid,
          _id: uid,
          fullName: label && label.toLowerCase() !== 'customer' ? label : '',
          customerId: cid,
          mobileNumber: '',
        };
      }),
    );

    setEditOpen(true);
  }

  useEffect(() => {
    if (!editOpen) return;
    setQ('');
    loadCustomers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen]);

  useEffect(() => {
    if (!editOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCustomers(q), 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, editOpen]);

  function togglePick(c: any) {
    const cid = String(c?.id ?? c?._id ?? '');
    if (!cid) return;

    setSelectedCustomers((prev) => {
      const exists = prev.some((x: any) => String(x?.id ?? x?._id ?? '') === cid);
      if (exists) return prev.filter((x: any) => String(x?.id ?? x?._id ?? '') !== cid);
      return [...prev, c];
    });
  }

  async function onSaveRecipients() {
    if (!listId) return;

    if (selectedCustomers.length < 1) {
      showToast('Select at least 1 customer.', 'error');
      return;
    }

    const nextRecipients: BroadcastRecipient[] = selectedCustomers.map((c: any) => {
      const uid = String(c.id ?? c._id).trim();

      // Fill from cached maps if modal has placeholder items
      const fullName =
        String(c.fullName ?? '').trim() || String(customerNameMap[uid] ?? '').trim();

      const customerId =
        String(c.customerId ?? '').trim() || String(customerIdMap[uid] ?? '').trim();

      const displayName =
        fullName && customerId ? `${fullName} (${customerId})` : fullName || customerId || 'Customer';

      return {
        userType: 'customer',
        userId: uid,
        displayName,
      };
    });

    setSavingRecipients(true);
    try {
      const updated = await broadcastApi.setRecipients(listId, nextRecipients);
      setList(updated);
      setEditOpen(false);
      showToast('Recipients updated.', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? e?.message ?? 'Failed to update recipients', 'error');
    } finally {
      setSavingRecipients(false);
    }
  }

  async function onCopy(value: string) {
    const v = String(value ?? '').trim();
    if (!v || v === '—') return;
    await copyToClipboard(v);
    showToast('Copied to clipboard.', 'success');
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-0 page-enter">
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
              Employee <span className="text-slate-300">/</span> Broadcasts <span className="text-slate-300">/</span>{' '}
              Detail
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-slate-50 font-bold text-slate-700">
                {initials(meta.name)}
              </div>

              <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-slate-900">
                {loading ? 'Loading…' : meta.name}
              </h1>

              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-11px font-medium text-slate-700">
                {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
              </span>

              {customerIdLoading ? (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-11px font-medium text-blue-700 border border-blue-200">
                  Syncing IDs…
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                Created: <span className="font-medium text-slate-700">{formatDateTime(meta.createdAt)}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Updated: <span className="font-medium text-slate-700">{formatDateTime(meta.updatedAt)}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">
                Shortcuts: <span className="font-medium">/</span> search, <span className="font-medium">M</span>{' '}
                message, <span className="font-medium">R</span> refresh, <span className="font-medium">Esc</span> clear.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => router.push('/employee/broadcasts')} disabled={deleting}>
              Back
            </Button>
            <Button variant="secondary" onClick={load} disabled={loading || deleting || sending || savingRecipients}>
              Refresh
            </Button>
            <Button variant="danger" onClick={onDeleteList} disabled={loading || deleting || !listId}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>

        {err ? (
          <div className="mt-3 flex flex-col gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 truncate">{err}</span>
            <Button type="button" variant="secondary" onClick={load}>
              Retry
            </Button>
          </div>
        ) : null}
      </div>

      {/* Top cards */}
      <div className="grid gap-3 panel-enter panel-delay-1 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Message composer */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Send message</div>
                <div className="mt-1 text-xs text-slate-500">This will broadcast one message to everyone in this list.</div>
              </div>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-11px font-medium uppercase tracking-wide text-slate-600">
                Shortcut: <span className="font-semibold text-slate-900">M</span>
              </span>
            </div>

            <div className="mt-4">
              <label className="block text-11px font-medium uppercase tracking-wide text-slate-500">Message</label>
              <textarea
                ref={messageRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your broadcast message…"
                rows={5}
                maxLength={500}
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
              />
              <div className="mt-2 flex items-center justify-between text-11px text-slate-500">
                <span>{recipientCount < 1 ? 'Add recipients before sending.' : 'Keep it clear and short.'}</span>
                <span className="font-medium tabular-nums text-slate-600">{messageText.trim().length}/4000</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setMessageText('')} disabled={sending || deleting || !messageText.trim()}>
                Clear
              </Button>
              <Button onClick={onSend} disabled={!canSend || loading || !listId}>
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>

            {recipientCount < 1 ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Add at least 1 recipient before sending.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* List settings + insights */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">List settings</div>
              <div className="mt-1 text-xs text-slate-500">Rename the list and manage recipients.</div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-11px font-medium uppercase tracking-wide text-slate-500">Recipients</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
                  {loading ? '—' : recipientCount.toLocaleString()}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-11px font-medium uppercase tracking-wide text-slate-500">Filtered</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
                  {loading ? '—' : totalFiltered.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Input label="List name" value={nameDraft} onChange={(e: any) => setNameDraft(e.target.value)} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={() => onCopy(listId)} disabled={!listId} title="Copy list id">
                  Copy list id
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setNameDraft(String((list as any)?.name ?? ''))}
                  disabled={savingName || deleting || loading}
                >
                  Reset
                </Button>

                <Button onClick={onSaveName} disabled={!canSaveName || loading || !listId}>
                  {savingName ? 'Saving…' : 'Save name'}
                </Button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
              Tip: Use search + paging to verify recipients quickly.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipients */}
      <Card className="border border-slate-200 bg-white shadow-sm panel-enter panel-delay-2">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="border-b border-slate-100 p-4 sm:p-5 recipients-toolbar">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">Recipients</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Built for large lists: search, paging, fast copy, and smooth table interactions.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end lg:w-auto">
                <div className="w-full sm:w-[380px]">
                  <Input
                    ref={recipientSearchRef}
                    label="Search recipients"
                    placeholder="Name, type, customer ID…"
                    value={recipientQuery}
                    onChange={(e: any) => setRecipientQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setRecipientQuery('')} disabled={!recipientQuery.trim().length}>
                    Clear
                  </Button>

                  <Button onClick={openEditRecipients} disabled={loading || deleting || !listId}>
                    Edit
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                {totalFiltered > 0 ? (
                  <span>
                    Showing <span className="font-semibold text-slate-700">{showingFrom}</span>–
                    <span className="font-semibold text-slate-700">{showingTo}</span> of{' '}
                    <span className="font-semibold text-slate-700">{totalFiltered.toLocaleString()}</span>
                  </span>
                ) : (
                  <span>Showing 0 results</span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-xs text-slate-500">Rows</span>
                <select
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-slate-200"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>

                <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Prev
                </Button>

                <div className="text-xs text-slate-500">
                  Page <span className="font-semibold text-slate-700">{page}</span> /{' '}
                  <span className="font-semibold text-slate-700">{totalPages}</span>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left">Recipient</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Customer ID / User ID</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody key={rowsAnimKey} className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} />)
                ) : !list ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                      Broadcast list not found.
                    </td>
                  </tr>
                ) : visibleRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                      {recipientQuery.trim() ? 'No recipients match your search.' : 'No recipients in this list.'}
                    </td>
                  </tr>
                ) : (
                  visibleRecipients.map((r, idx) => {
                    const label = getRecipientLabel(r);
                    const type = String((r as any)?.userType ?? '—');
                    const shownId = getDisplayedId(r);

                    const typeLower = String(type).toLowerCase();
                    const canCopy = shownId && shownId !== '—';

                    const rowIndex = (page - 1) * pageSize + idx;

                    return (
                      <tr
                        key={`${typeLower}:${String((r as any)?.userId ?? '')}:${rowIndex}`}
                        style={{ animationDelay: `${Math.min(idx * 18, 240)}ms` }}
                        className={['recipient-row row-enter', idx % 2 === 1 ? 'bg-slate-50/20' : 'bg-white'].join(' ')}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="avatar h-9 w-9 rounded-full border flex items-center justify-center font-bold text-slate-700">
                              {initials(label)}
                            </div>

                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">{label}</div>
                              <div className="mt-0.5 text-11px text-slate-500 truncate">Included in this list</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              'inline-flex items-center rounded-full border px-2.5 py-1 text-11px font-semibold capitalize',
                              typeBadgeClass(type),
                            ].join(' ')}
                          >
                            {typeLower}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {typeLower === 'customer' && !isCustomerIdResolved(r) ? (
                            <div className="h-4 w-28 rounded skeleton-shimmer" />
                          ) : (
                            <div className="font-mono text-xs text-slate-900" title={shownId}>
                              {shownId}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="row-actions inline-flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onCopy(shownId)}
                              disabled={!canCopy}
                              title={typeLower === 'customer' ? 'Copy Customer ID' : 'Copy User ID'}
                            >
                              Copy
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

      {/* Edit Recipients Modal */}
      <div className={['modal-root', editOpen ? 'open' : ''].join(' ')}>
        <div className="modal-backdrop" onClick={() => !savingRecipients && setEditOpen(false)} />

        <div className="modal-panel">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">Edit recipients</div>
              <div className="mt-1 text-xs text-slate-500">
                Customer-only picker. Selected: <span className="font-semibold text-slate-900">{selectedCustomers.length}</span>
              </div>
            </div>

            <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)} disabled={savingRecipients}>
              Close
            </Button>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex gap-2">
              <input
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search customers…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button variant="secondary" onClick={() => setQ('')} disabled={!q.trim()}>
                Clear
              </Button>
            </div>

            {editErr ? <div className="text-sm text-rose-700">{editErr}</div> : null}

            <div className="border rounded divide-y max-h-[420px] overflow-auto">
              {editLoading ? (
                <div className="p-3 text-sm text-slate-600">Loading…</div>
              ) : customers.length === 0 ? (
                <div className="p-3 text-sm text-slate-600">No customers found.</div>
              ) : (
                customers.map((c: any, idx: number) => {
                  const cid = String(c?.id ?? c?._id ?? `row-${idx}`);
                  const active = selectedIds.has(String(c?.id ?? c?._id ?? ''));

                  return (
                    <button
                      key={cid}
                      onClick={() => togglePick(c)}
                      className={[
                        'w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors',
                        active ? 'bg-blue-50' : '',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{c.fullName || '—'}</div>
                        <div className="text-sm text-slate-600 truncate">
                          ID: {c.customerId || '—'} • Mobile: {c.mobileNumber || '—'}
                        </div>
                      </div>
                      <div className="w-8 text-right font-bold text-emerald-600">{active ? '✓' : ''}</div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setSelectedCustomers([])} disabled={savingRecipients}>
                Clear
              </Button>
              <Button onClick={onSaveRecipients} disabled={savingRecipients || selectedCustomers.length < 1}>
                {savingRecipients ? 'Saving…' : 'Save recipients'}
              </Button>
            </div>
          </div>
        </div>
      </div>

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

          .recipient-row {
            transition: background-color 140ms ease, box-shadow 160ms ease;
          }

          .recipient-row:hover {
            box-shadow: inset 0 0 0 9999px rgba(59, 130, 246, 0.03);
          }

          .row-actions {
            opacity: 0.92;
            transform: translateX(0);
            transition: opacity 140ms ease, transform 140ms ease;
          }

          .recipient-row:hover .row-actions {
            opacity: 1;
            transform: translateX(0);
          }

          .avatar {
            background: radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.12), rgba(255, 255, 255, 1));
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

        /* Modal */
        .modal-root {
          position: fixed;
          inset: 0;
          z-index: 60;
          pointer-events: none;
        }
        .modal-root.open {
          pointer-events: auto;
        }
        .modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(2, 6, 23, 0.35);
          opacity: 0;
          transition: opacity 180ms ease;
        }
        .modal-root.open .modal-backdrop {
          opacity: 1;
        }
        .modal-panel {
          position: absolute;
          left: 50%;
          top: 8%;
          transform: translateX(-50%) translateY(8px);
          width: min(720px, calc(100vw - 24px));
          background: white;
          border: 1px solid rgba(226, 232, 240, 1);
          border-radius: 14px;
          box-shadow: 0 20px 45px rgba(2, 6, 23, 0.18);
          opacity: 0;
          transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease;
          overflow: hidden;
        }
        .modal-root.open .modal-panel {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>
    </div>
  );
}
