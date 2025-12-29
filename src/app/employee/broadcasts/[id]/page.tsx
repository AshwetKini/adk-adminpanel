'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

export default function EmployeeBroadcastDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params.id || '');

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

  // edit recipients panel
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<any[]>([]);
  const [savingRecipients, setSavingRecipients] = useState(false);
  const debounceRef = useRef<any>(null);

  const recipients = useMemo(() => (Array.isArray(list?.recipients) ? list!.recipients! : []), [list]);
  const recipientCount = recipients.length;

  const selectedIds = useMemo(() => {
    return new Set(selectedCustomers.map((c) => String(c?.id ?? c?._id ?? '')));
  }, [selectedCustomers]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await broadcastApi.get(id);
      setList(data);
      setNameDraft(String(data?.name ?? ''));
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Failed to load broadcast list');
      setList(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSaveName() {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2) {
      alert('Name must be at least 2 characters.');
      return;
    }
    if (!list) return;

    setSavingName(true);
    try {
      const updated = await broadcastApi.rename(String(list._id), trimmed);
      setList(updated);
      alert('Name updated.');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? 'Failed to rename list');
    } finally {
      setSavingName(false);
    }
  }

  async function onDeleteList() {
    if (!list) return;
    const ok = window.confirm('Delete this broadcast list?');
    if (!ok) return;

    setDeleting(true);
    try {
      await broadcastApi.remove(String(list._id));
      alert('Broadcast list deleted.');
      router.replace('/employee/broadcasts');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? 'Failed to delete list');
    } finally {
      setDeleting(false);
    }
  }

  async function onSend() {
    const text = messageText.trim();
    if (!text) {
      alert('Message cannot be empty.');
      return;
    }
    if (!list) return;

    setSending(true);
    try {
      const clientRequestId = newClientRequestId();
      const res = await broadcastApi.send(String(list._id), { text, clientRequestId });
      const sent = typeof res?.sent === 'number' ? res.sent : undefined;
      alert(sent !== undefined ? `Broadcast sent to ${sent} recipients.` : 'Broadcast sent.');
      setMessageText('');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  }

  async function loadCustomers(searchText: string) {
    setEditLoading(true);
    setEditErr(null);
    try {
      const res = await customerApi.all({ page: 1, limit: 50, search: searchText.trim() || undefined });
      setCustomers(Array.isArray(res?.data) ? res.data : []);
    } catch (e: any) {
      setCustomers([]);
      setEditErr(e?.response?.data?.message ?? e?.message ?? 'Failed to load customers');
    } finally {
      setEditLoading(false);
    }
  }

  function openEditRecipients() {
    if (!list) return;

    // Preselect customers that are already recipients (customer-only picker, like mobile create flow).
    const existingCustomerIds = new Set(
      (list.recipients || [])
        .filter((r) => r?.userType === 'customer')
        .map((r) => String(r.userId)),
    );

    setSelectedCustomers(
      Array.from(existingCustomerIds).map((cid) => ({
        id: cid,
        _id: cid,
        fullName: '',
        customerId: '',
        mobileNumber: '',
      })),
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
    if (!list) return;

    if (selectedCustomers.length < 1) {
      alert('Select at least 1 customer.');
      return;
    }

    const recipients: BroadcastRecipient[] = selectedCustomers.map((c: any) => ({
      userType: 'customer',
      userId: String(c.id ?? c._id),
      displayName: String(c.fullName || c.customerId || 'Customer'),
    }));

    setSavingRecipients(true);
    try {
      const updated = await broadcastApi.setRecipients(String(list._id), recipients);
      setList(updated);
      setEditOpen(false);
      alert('Recipients updated.');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? 'Failed to update recipients');
    } finally {
      setSavingRecipients(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Broadcast detail</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 truncate">
            {list?.name || 'Broadcast'}
          </h1>
          <div className="mt-1 text-sm text-slate-500">
            {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={() => router.push('/employee/broadcasts')} disabled={deleting}>
            Back
          </Button>
          <Button variant="danger" onClick={onDeleteList} disabled={deleting || loading || !list}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-6 text-sm text-slate-600">Loading…</CardContent>
        </Card>
      ) : err ? (
        <Card className="border border-rose-200 bg-rose-50 shadow-sm">
          <CardContent className="py-4 text-sm text-rose-700 space-y-2">
            <div className="font-semibold">Error</div>
            <div>{err}</div>
            <Button variant="secondary" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !list ? (
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-6 text-sm text-slate-600">Broadcast list not found.</CardContent>
        </Card>
      ) : (
        <>
          {/* Rename */}
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="font-semibold text-slate-900">Rename list</div>
              <Input label="Name" value={nameDraft} onChange={(e: any) => setNameDraft(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setNameDraft(String(list.name ?? ''))} disabled={savingName}>
                  Reset
                </Button>
                <Button onClick={onSaveName} disabled={savingName || nameDraft.trim().length < 2}>
                  {savingName ? 'Saving…' : 'Save name'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">Recipients</div>
                  <div className="text-sm text-slate-500">{recipientCount} total</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => copyToClipboard(String(list._id))}>
                    Copy list id
                  </Button>
                  <Button onClick={openEditRecipients}>Edit recipients</Button>
                </div>
              </div>

              {recipientCount === 0 ? (
                <div className="text-sm text-slate-600">No recipients.</div>
              ) : (
                <div className="divide-y rounded border">
                  {recipients.map((r, idx) => {
                    const label = String(r.displayName ?? '').trim() || prettyRecipientLabel(r);
                    return (
                      <div key={`${r.userType}:${r.userId}:${idx}`} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl border bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                            {initials(label)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 truncate">{label}</div>
                            <div className="text-xs text-slate-600">
                              {r.userType} • {String(r.userId)}
                            </div>
                          </div>
                        </div>

                        <Button variant="secondary" size="sm" onClick={() => copyToClipboard(String(r.userId))}>
                          Copy
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Send */}
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="font-semibold text-slate-900">Send broadcast</div>
              <label className="block text-sm font-medium text-gray-700">Message</label>
              <textarea
                className="w-full min-h-[110px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your broadcast message…"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={onSend} disabled={sending || !messageText.trim() || recipientCount < 1}>
                  {sending ? 'Sending…' : 'Send'}
                </Button>
              </div>
              {recipientCount < 1 ? (
                <div className="text-xs text-amber-700">
                  Add at least 1 recipient before sending.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Recipients Panel */}
      {editOpen ? (
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-slate-900">Edit recipients</div>
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)} disabled={savingRecipients}>
                Close
              </Button>
            </div>

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

            <div className="text-sm text-slate-600">
              Selected: <span className="font-semibold text-slate-900">{selectedCustomers.length}</span>
            </div>

            <div className="border rounded divide-y max-h-[360px] overflow-auto">
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
                        'w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between gap-3',
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

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedCustomers([])} disabled={savingRecipients}>
                Clear
              </Button>
              <Button onClick={onSaveRecipients} disabled={savingRecipients || selectedCustomers.length < 1}>
                {savingRecipients ? 'Saving…' : 'Save recipients'}
              </Button>
            </div>

            <div className="text-xs text-slate-500">
              Note: This picker edits **customer** recipients (same as mobile create flow).
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function prettyRecipientLabel(r: { userType?: string; userId?: string; displayName?: string }) {
  const d = String(r.displayName ?? '').trim();
  if (d) return d;

  const t = String(r.userType ?? '').toLowerCase();
  if (t === 'customer') return 'Customer';
  if (t === 'employee') return 'Employee';
  if (t === 'admin') return 'Admin';
  return 'User';
}
