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

function initials(name: string) {
  const s = String(name ?? '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean).slice(0, 2);
  const a = parts[0]?.[0] ?? '?';
  const b = parts.length > 1 ? parts[1]?.[0] ?? '' : '';
  return (a + b).toUpperCase();
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

  // NEW: unread filter toggle
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

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

        // 3) NEW: increment unreadCount for this group (only if message is not from me)
        const senderUserId = String((msg as any)?.sender?.userId ?? (msg as any)?.fromUserId ?? '');
        const senderUserType = String((msg as any)?.sender?.userType ?? (msg as any)?.fromUserType ?? '');
        const isFromMe = senderUserId === String(me.userId) && senderUserType === String(me.userType);

        if (!isFromMe) {
          (next[0] as any).unreadCount = Number((next[0] as any).unreadCount ?? 0) + 1;
        }

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

      // Keep ordering stable; just bump updatedAt if present
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

      // Preview: fetch last message without marking read
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

  const unreadChatsCount = useMemo(() => {
    return groups.filter((g) => Number((g as any).unreadCount ?? 0) > 0).length;
  }, [groups]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();

    let list = groups;

    // NEW: unread-only filter
    if (showUnreadOnly) {
      list = list.filter((g) => Number((g as any).unreadCount ?? 0) > 0);
    }

    // existing: search filter
    if (!t) return list;

    return list.filter((g) => {
      const title = getGroupTitle(g).toLowerCase();
      const last = lastByGroupId[String((g as any)._id)];
      const prev = safePreview(last).toLowerCase();
      return title.includes(t) || prev.includes(t);
    });
  }, [groups, q, lastByGroupId, showUnreadOnly]);

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#f0f2f5]">
      <div className="mx-auto w-full max-w-6xl px-2 py-3">
        <div className="h-[calc(100vh-160px)] min-h-[560px] w-full overflow-hidden rounded-xl border bg-white shadow-sm flex">
          {/* Left: chat list (WhatsApp-like) */}
          <div className="w-full lg:w-[420px] border-r flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-b">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-[#dfe5e7] flex items-center justify-center text-sm font-semibold text-[#111b21]">
                  {initials(me?.userType ? `${me.userType}` : 'Me')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-[15px] font-semibold text-[#111b21] truncate">Chats</div>

                    {/* NEW: unread pill (WhatsApp-ish) */}
                    {unreadChatsCount > 0 ? (
                      <button
                        type="button"
                        className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#00a884] text-white"
                        onClick={() => setShowUnreadOnly((v) => !v)}
                        title="Toggle unread filter"
                      >
                        Unread {unreadChatsCount}
                      </button>
                    ) : null}
                  </div>

                  <div className="text-[12px] text-[#667781] truncate">
                    {loading ? 'Loading…' : `${filtered.length} conversations`}
                    {showUnreadOnly ? ' (unread only)' : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href="/employee/chats/new">
                  <Button size="sm">+ New</Button>
                </Link>
                <Link href="/employee/broadcasts">
                  <Button size="sm" variant="secondary">
                    Broadcast
                  </Button>
                </Link>
              </div>
            </div>

            {/* Search + filter row */}
            <div className="px-3 py-3 bg-white border-b space-y-2">
              <div className="flex items-center gap-2 rounded-full bg-[#f0f2f5] px-3 py-2">
                <span className="text-[#667781] text-sm">🔎</span>
                <input
                  className="w-full bg-transparent outline-none text-sm text-[#111b21] placeholder:text-[#667781]"
                  placeholder="Search or start new chat"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q.trim() ? (
                  <button
                    type="button"
                    className="text-[#667781] text-lg leading-none px-1"
                    onClick={() => setQ('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              {/* NEW: simple All / Unread toggle (doesn't change UI layout) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnreadOnly(false)}
                  className={[
                    'text-[12px] font-semibold px-3 py-1 rounded-full border',
                    !showUnreadOnly ? 'bg-[#111b21] text-white border-[#111b21]' : 'bg-white text-[#111b21]',
                  ].join(' ')}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnreadOnly(true)}
                  className={[
                    'text-[12px] font-semibold px-3 py-1 rounded-full border',
                    showUnreadOnly ? 'bg-[#00a884] text-white border-[#00a884]' : 'bg-white text-[#111b21]',
                  ].join(' ')}
                  disabled={unreadChatsCount === 0}
                  title={unreadChatsCount === 0 ? 'No unread chats' : 'Show unread chats only'}
                >
                  Unread
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto bg-white">
              {loading ? (
                <div className="px-4 py-6 text-sm text-[#667781]">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-[#667781]">No chats found.</div>
              ) : (
                <div>
                  {filtered.map((g) => {
                    const gid = String((g as any)._id);
                    const title = getGroupTitle(g);
                    const last = lastByGroupId[gid];
                    const unread = Number((g as any).unreadCount ?? 0);
                    const time = formatTime((last as any)?.createdAt || (g as any).updatedAt);

                    return (
                      <Link
                        key={gid}
                        href={`/employee/chats/${gid}?title=${encodeURIComponent(title)}`}
                        className="block"
                      >
                        <div className="px-3">
                          <div
                            className={[
                              'flex items-center gap-3 px-2 py-3 rounded-lg',
                              'hover:bg-[#f5f6f6] transition-colors',
                              unread > 0 ? 'bg-[#f3fffb]' : '',
                            ].join(' ')}
                          >
                            {/* Avatar */}
                            <div className="h-12 w-12 rounded-full bg-[#dfe5e7] flex items-center justify-center text-[13px] font-semibold text-[#111b21] shrink-0">
                              {initials(title)}
                            </div>

                            {/* Middle */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div
                                  className={[
                                    'text-[15px] truncate',
                                    unread > 0 ? 'font-semibold text-[#111b21]' : 'font-medium text-[#111b21]',
                                  ].join(' ')}
                                >
                                  {title}
                                </div>
                                <div
                                  className={[
                                    'text-[11px] shrink-0',
                                    unread > 0 ? 'text-[#00a884] font-semibold' : 'text-[#667781]',
                                  ].join(' ')}
                                >
                                  {time}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 mt-0.5">
                                <div
                                  className={[
                                    'text-[13px] truncate',
                                    unread > 0 ? 'text-[#3b4a54]' : 'text-[#667781]',
                                  ].join(' ')}
                                >
                                  {safePreview(last)}
                                </div>

                                {unread > 0 ? (
                                  <div className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-[#00a884] text-white text-[11px] font-semibold flex items-center justify-center">
                                    {unread > 99 ? '99+' : String(unread)}
                                  </div>
                                ) : (
                                  <div className="w-5" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-b ml-[72px]" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: placeholder panel */}
          <div className="hidden lg:flex flex-1 bg-[#efeae2] relative">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, #111b21 1px, transparent 0)",
                backgroundSize: '18px 18px',
              }}
            />
            <div className="relative m-auto max-w-md text-center px-8">
              <div className="text-xl font-semibold text-[#111b21]">ADK Chats</div>
              <div className="mt-2 text-sm text-[#667781]">
                Select a chat to start messaging
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
