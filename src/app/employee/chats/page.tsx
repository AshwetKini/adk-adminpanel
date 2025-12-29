'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { chatApi, type ChatGroup, type ChatMessage } from '@/lib/api';
import { getChatSocket } from '@/lib/chatSocket';

import { Button } from '@/components/ui/Button';

type InboxNewMessagePayload = { groupId: string; message: ChatMessage };
type InboxMessageDeletedPayload = { groupId: string; messageId: string; message: ChatMessage };

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
  const id =
    payload?.sub ??
    payload?.userId ??
    payload?.id ??
    payload?._id ??
    payload?.employeeId ??
    payload?.customerId;
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
  if ((msg as any).deletedAt) return 'This message was deleted';
  const t = String((msg as any).text ?? '').trim();
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

  // Realtime inbox updates (for chat list page)
  useEffect(() => {
    if (!me?.userId || !me?.userType) return;

    let socket: any;
    try {
      socket = getChatSocket();
    } catch {
      // If token/env missing, keep HTTP-only behavior
      return;
    }

    const onInboxNewMessage = (payload: InboxNewMessagePayload | any) => {
      const gid = String(payload?.groupId ?? payload?.message?.groupId ?? '');
      const msg = payload?.message as ChatMessage | undefined;
      if (!gid || !msg) return;

      // 1) Update preview cache (last message)
      setLastByGroupId((prev) => ({ ...prev, [gid]: msg }));

      // 2) Move the group to top (WhatsApp-like) and bump updatedAt so time updates immediately
      setGroups((prev) => {
        const idx = prev.findIndex((g) => String((g as any)?._id ?? (g as any)?.id) === gid);
        if (idx < 0) return prev;

        const next = [...prev];
        const [found] = next.splice(idx, 1);

        const bumped = {
          ...(found as any),
          updatedAt: (msg as any)?.createdAt ?? (found as any)?.updatedAt,
        } as ChatGroup;

        next.unshift(bumped);
        return next;
      });
    };

    const onInboxMessageDeleted = (payload: InboxMessageDeletedPayload | any) => {
      const gid = String(payload?.groupId ?? '');
      const deletedId = String(payload?.messageId ?? '');
      const updatedMsg = payload?.message as ChatMessage | undefined;

      if (!gid || !deletedId || !updatedMsg) return;

      // Only update the preview if the deleted message is currently shown as "last" in the list
      setLastByGroupId((prev) => {
        const current = prev[gid];
        const currentId = String((current as any)?._id ?? (current as any)?.id ?? '');
        if (!currentId || currentId !== deletedId) return prev;
        return { ...prev, [gid]: updatedMsg };
      });

      // Optional: bump updatedAt so the right-side time can update if your server changes it
      setGroups((prev) => {
        const idx = prev.findIndex((g) => String((g as any)?._id ?? (g as any)?.id) === gid);
        if (idx < 0) return prev;

        const next = [...prev];
        const g = next[idx] as any;
        next[idx] = { ...g, updatedAt: (updatedMsg as any)?.updatedAt ?? g?.updatedAt };
        return next;
      });
    };

    socket.on('inbox:newMessage', onInboxNewMessage);
    socket.on('inbox:messageDeleted', onInboxMessageDeleted);

    return () => {
      socket.off('inbox:newMessage', onInboxNewMessage);
      socket.off('inbox:messageDeleted', onInboxMessageDeleted);
    };
  }, [me?.userId, me?.userType]);

  function getGroupTitle(g: ChatGroup) {
    const explicit = String((g as any)?.name ?? '').trim();
    if (explicit) return explicit;

    const members = Array.isArray((g as any)?.members) ? (g as any).members : [];
    if (members.length === 2) {
      const other = members.find(
        (m: any) => String(m.userId) !== me.userId || String(m.userType) !== me.userType,
      );
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
            const arr = await chatApi.listMessages(String((g as any)._id), { limit: 1, markRead: false });
            return [String((g as any)._id), arr[0] ?? null] as const;
          } catch {
            return [String((g as any)._id), null] as const;
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
      const last = lastByGroupId[String((g as any)._id)];
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
            <Button size="sm" variant="secondary">
              Broadcast
            </Button>
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
        <Button variant="secondary" onClick={() => setQ('')}>
          Clear
        </Button>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-gray-600">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 text-sm text-gray-600">No chats found.</div>
      ) : (
        <div className="mt-4 divide-y border rounded">
          {filtered.map((g) => {
            const gid = String((g as any)._id);
            const title = getGroupTitle(g);
            const last = lastByGroupId[gid];
            const unread = (g as any).unreadCount ?? 0;
            const time = formatTime((last as any)?.createdAt || (g as any).updatedAt);

            return (
              <Link
                key={gid}
                href={`/employee/chats/${gid}?title=${encodeURIComponent(title)}`}
                className="block"
              >
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
