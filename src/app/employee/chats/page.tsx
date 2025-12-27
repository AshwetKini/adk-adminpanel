'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { chatApi, type ChatGroup, type ChatMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';

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

function extractUserId(payload: any): string {
  // Mirrors backend extractUserId priority (sub/userId/id/_id/employeeId/customerId). [file:87]
  const id = payload?.sub ?? payload?.userId ?? payload?.id ?? payload?._id ?? payload?.employeeId ?? payload?.customerId;
  return id ? String(id) : '';
}

function extractUserType(payload: any): 'employee' | 'admin' | 'customer' {
  // Mirrors backend extractUserType() role parsing. [file:87]
  const raw = String(payload?.role ?? payload?.userType ?? payload?.type ?? '').toLowerCase();
  if (raw.includes('customer')) return 'customer';
  if (raw.includes('admin') || raw.includes('tenant') || raw.includes('superadmin')) return 'admin';
  return 'employee';
}

function safePreview(msg?: ChatMessage | null) {
  if (!msg) return 'Tap to open chat';
  if (msg.deletedAt) return 'This message was deleted';
  const t = String(msg.text ?? '').trim();
  return t ? t : 'Tap to open chat';
}

function formatTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const isSameDay = d.toDateString() === now.toDateString();
  return isSameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

export default function EmployeeChatsPage() {
  const token = typeof window === 'undefined' ? null : localStorage.getItem('access_token');
  const me = useMemo(() => {
    const p = parseJwt(token);
    return { userId: extractUserId(p), userType: extractUserType(p) };
  }, [token]);

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [lastByGroupId, setLastByGroupId] = useState<Record<string, ChatMessage | null>>({});
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  function getGroupTitle(g: ChatGroup) {
    const explicit = String(g?.name ?? '').trim();
    if (explicit) return explicit;

    const members = Array.isArray(g?.members) ? g.members : [];
    if (members.length === 2) {
      const other = members.find((m) => String(m.userId) !== me.userId || String(m.userType) !== me.userType);
      const otherName = String(other?.displayName ?? '').trim();
      if (otherName) return otherName;
      if (other?.userType && other?.userId) return `${other.userType}:${other.userId}`;
    }
    return members.length > 0 ? `Group (${members.length})` : 'Chat';
  }

  async function load() {
    setLoading(true);
    try {
      const list = await chatApi.myGroups();
      setGroups(list);

      // Preview: fetch last message without marking read (same as mobile). [file:130]
      const slice = list.slice(0, 30);
      const results = await Promise.all(
        slice.map(async (g) => {
          try {
            const arr = await chatApi.listMessages(String(g._id), { limit: 1, markRead: false });
            return [String(g._id), arr[0] ?? null] as const;
          } catch {
            return [String(g._id), null] as const;
          }
        }),
      );

      setLastByGroupId((prev) => {
        const next = { ...prev };
        for (const [gid, msg] of results) next[gid] = msg;
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return groups;
    return groups.filter((g) => {
      const title = getGroupTitle(g).toLowerCase();
      const last = lastByGroupId[String(g._id)];
      const prev = safePreview(last).toLowerCase();
      return title.includes(t) || prev.includes(t);
    });
  }, [groups, q, lastByGroupId]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Chats</h1>
        <div className="flex gap-2">
          <Link href="/employee/chats/new">
            <Button size="sm">+ New chat</Button>
          </Link>
          <Link href="/employee/broadcasts">
            <Button size="sm" variant="secondary">Broadcast</Button>
          </Link>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Search chats…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button variant="secondary" onClick={() => setQ('')}>Clear</Button>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-gray-600">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 text-sm text-gray-600">No chats found.</div>
      ) : (
        <div className="mt-4 divide-y border rounded">
          {filtered.map((g) => {
            const gid = String(g._id);
            const title = getGroupTitle(g);
            const last = lastByGroupId[gid];
            const unread = g.unreadCount ?? 0;
            const time = formatTime(last?.createdAt || g.updatedAt);

            return (
              <Link key={gid} href={`/employee/chats/${gid}?title=${encodeURIComponent(title)}`} className="block">
                <div className="p-3 hover:bg-gray-50 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{title}</div>
                    <div className="text-sm text-gray-600 truncate">{safePreview(last)}</div>
                  </div>

                  <div className="flex flex-col items-end w-24 shrink-0">
                    <div className="text-xs text-gray-500">{time}</div>
                    {unread > 0 ? (
                      <div className="mt-1 text-xs bg-green-600 text-white rounded-full px-2 py-0.5">
                        {unread > 99 ? '99+' : String(unread)}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
