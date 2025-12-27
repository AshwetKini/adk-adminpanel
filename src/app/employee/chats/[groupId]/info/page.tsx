'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { customerApi } from '@/lib/api';
import { chatApi, type ChatGroup, type ChatUserRef } from '@/lib/api';

type ChatUserType = 'employee' | 'admin' | 'customer';

function initials(name?: string) {
  const s = String(name ?? '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('');
}

function parseJwt(token: string | null): any | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function extractUserType(payload: any): ChatUserType {
  const raw = String(payload?.role ?? payload?.userType ?? payload?.type ?? '').toLowerCase();
  if (raw.includes('customer')) return 'customer';
  if (raw.includes('admin') || raw.includes('tenant') || raw.includes('superadmin') || raw.includes('platform'))
    return 'admin';
  return 'employee';
}

function prettyUserType(t?: string) {
  const s = String(t ?? '').toLowerCase();
  if (s === 'customer') return 'Customer';
  if (s === 'employee') return 'Employee';
  if (s === 'admin') return 'Admin';
  return 'User';
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

export default function ChatInfoPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const search = useSearchParams();

  const groupId = String(params.groupId || '');
  const titleFromRoute = String(search.get('title') ?? '').trim();

  const token = typeof window === 'undefined' ? null : localStorage.getItem('access_token');
  const isStaff = useMemo(() => {
    const payload = parseJwt(token);
    return extractUserType(payload) !== 'customer';
  }, [token]);

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Add-members picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const debounceRef = useRef<any>(null);

  const headerName = useMemo(() => {
    if (titleFromRoute) return titleFromRoute;
    const fromGroup = String(group?.name ?? '').trim();
    return fromGroup || 'Chat info';
  }, [titleFromRoute, group?.name]);

  const members = useMemo(() => (Array.isArray(group?.members) ? group!.members! : []), [group]);

  const existingMemberKeys = useMemo(() => {
    const s = new Set<string>();
    for (const m of members) s.add(`${m.userType}:${m.userId}`);
    return s;
  }, [members]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // Same as mobile: list + find, since no GET /chat/groups/:id.
      const g = await chatApi.getGroupById(groupId);
      setGroup(g);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Failed to load chat info');
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers(searchText: string) {
    const res = await customerApi.all({ page: 1, limit: 50, search: searchText.trim() || undefined });
    setCustomers(Array.isArray(res?.data) ? res.data : []);
  }

  useEffect(() => {
    if (!groupId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    if (!pickerOpen) return;
    loadCustomers('');
    setSelected([]);
    setQ('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCustomers(q), 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, pickerOpen]);

  function togglePick(c: any) {
    const id = String(c?.id ?? c?._id ?? '');
    if (!id) return;

    setSelected((prev) => {
      const exists = prev.some((x: any) => String(x?.id ?? x?._id) === id);
      if (exists) return prev.filter((x: any) => String(x?.id ?? x?._id) !== id);
      return [...prev, c];
    });
  }

  async function onAddMembers() {
    if (!isStaff) return;

    const newMembers: ChatUserRef[] = selected
      .map((c: any) => ({
        userType: 'customer',
        userId: String(c.id ?? c._id),
        displayName: String(c.fullName || c.customerId || 'Customer'),
      }))
      .filter((m) => !existingMemberKeys.has(`${m.userType}:${m.userId}`));

    if (newMembers.length === 0) {
      alert('No new members selected.');
      return;
    }

    setAdding(true);
    try {
      await chatApi.addMembers(groupId, newMembers);
      setPickerOpen(false);
      await load();
      alert('Members added.');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? 'Failed to add members');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xl font-semibold truncate">Info</div>
          <div className="text-sm text-gray-600 truncate">{headerName}</div>
        </div>

        <div className="flex gap-2">
          <Link href={`/employee/chats/${encodeURIComponent(groupId)}?title=${encodeURIComponent(headerName)}`}>
            <Button variant="secondary" size="sm">Back to chat</Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : err ? (
        <div className="border rounded p-3 bg-rose-50 text-rose-700 text-sm">
          <div className="font-semibold">Error</div>
          <div className="mt-1">{err}</div>
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={() => load()}>Retry</Button>
          </div>
        </div>
      ) : !group ? (
        <div className="text-sm text-gray-600">Chat not found.</div>
      ) : (
        <>
          {/* hero */}
          <div className="border rounded p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border bg-slate-100 flex items-center justify-center font-bold">
                {initials(headerName)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{headerName}</div>
                <div className="text-sm text-gray-600">{members.length} participants</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  copyToClipboard(groupId);
                  alert('Group ID copied');
                }}
              >
                Copy groupId
              </Button>

              {isStaff ? (
                <Button variant="primary" size="sm" onClick={() => setPickerOpen(true)}>
                  + Add members
                </Button>
              ) : null}
            </div>
          </div>

          {/* participants */}
          <div className="border rounded p-4 bg-white">
            <div className="font-semibold">Participants</div>

            {members.length === 0 ? (
              <div className="mt-2 text-sm text-gray-600">No members returned by server for this chat.</div>
            ) : (
              <div className="mt-3 divide-y">
                {members.map((m, idx) => {
                  const label =
                    String(m.displayName ?? '').trim() || prettyUserType(m.userType); // don’t leak userId as fallback
                  const canOpenCustomer = isStaff && m.userType === 'customer';

                  return (
                    <div key={`${m.userType}:${m.userId}:${idx}`} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border bg-slate-100 flex items-center justify-center font-bold text-sm">
                          {initials(label)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{label}</div>
                          <div className="text-xs text-gray-600">{String(m.userType)}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {isStaff ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              copyToClipboard(String(m.userId));
                              alert('User ID copied');
                            }}
                          >
                            Copy
                          </Button>
                        ) : null}

                        {canOpenCustomer ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/employee/customers/${encodeURIComponent(String(m.userId))}`)}
                          >
                            Open
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* add members modal (simple inline panel) */}
      {pickerOpen ? (
        <div className="border rounded p-4 bg-white space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Add members</div>
            <Button variant="secondary" size="sm" onClick={() => setPickerOpen(false)}>
              Close
            </Button>
          </div>

          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Search customers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="text-sm text-gray-600">Selected: {selected.length}</div>

          <div className="border rounded divide-y max-h-[320px] overflow-auto">
            {customers.length === 0 ? (
              <div className="p-3 text-sm text-gray-600">No customers found.</div>
            ) : (
              customers.map((c) => {
                const id = String(c.id ?? c._id);
                const already = existingMemberKeys.has(`customer:${id}`);
                const active = selected.some((x: any) => String(x?.id ?? x?._id) === id);

                return (
                  <button
                    key={id}
                    disabled={already}
                    onClick={() => togglePick(c)}
                    className={[
                      'w-full text-left p-3 hover:bg-gray-50 flex items-center justify-between gap-3',
                      active ? 'bg-blue-50' : '',
                      already ? 'opacity-60 cursor-not-allowed' : '',
                    ].join(' ')}
                    title={already ? 'Already in group' : 'Click to select'}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {c.fullName || c.customerId || 'Customer'} {already ? '(already)' : ''}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        ID: {c.customerId || '—'} • Mobile: {c.mobileNumber || '—'}
                      </div>
                    </div>
                    <div className="w-10 text-right font-bold text-green-600">{active ? '✓' : ''}</div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelected([])} disabled={adding}>
              Clear
            </Button>
            <Button onClick={onAddMembers} disabled={adding || selected.length === 0}>
              {adding ? 'Adding…' : 'Add to group'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
