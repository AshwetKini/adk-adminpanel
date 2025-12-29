'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getChatSocket } from '@/lib/chatSocket';
import { chatApi, type ChatMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';

type ChatUserType = 'employee' | 'admin' | 'customer';

type UiRow =
  | { kind: 'sep'; id: string; label: string }
  | { kind: 'msg'; id: string; msg: ChatMessage; localStatus?: 'sending' | 'sent' | 'delivered' };

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

function extractUserType(payload: any): ChatUserType {
  const raw = String(payload?.role ?? payload?.userType ?? payload?.type ?? '').toLowerCase();
  if (raw.includes('customer')) return 'customer';
  if (raw.includes('admin') || raw.includes('tenant') || raw.includes('superadmin') || raw.includes('platform'))
    return 'admin';
  return 'employee';
}

function extractDisplayName(payload: any): string {
  return String(payload?.fullName ?? payload?.name ?? payload?.email ?? 'Me');
}

function toDayKey(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayLabel(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = startOfDay(new Date()).getTime();
  const that = startOfDay(d).getTime();
  const diffDays = Math.round((today - that) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeLabel(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function prettyUserType(t?: string) {
  const s = String(t ?? '').toLowerCase();
  if (s === 'customer') return 'Customer';
  if (s === 'employee') return 'Employee';
  if (s === 'admin') return 'Admin';
  return 'User';
}

export default function EmployeeChatRoomPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const search = useSearchParams();

  const groupId = String(params.groupId || '');
  const title = search.get('title') || 'Chat';

  const token = typeof window === 'undefined' ? null : localStorage.getItem('access_token');
  const me = useMemo(() => {
    const payload = parseJwt(token);
    return {
      userId: extractUserId(payload),
      userType: extractUserType(payload),
      displayName: extractDisplayName(payload),
    };
  }, [token]);

  const socket = useMemo(() => getChatSocket(), []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const typingTimerRef = useRef<any>(null);
  const lastTypingEmitRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');

  // ticks
  const [statusByClientId, setStatusByClientId] = useState<Record<string, 'sending' | 'sent' | 'delivered'>>({});

  // typing label
  const [typingLabel, setTypingLabel] = useState<string | null>(null);

  // jump-to-bottom button
  const [showJump, setShowJump] = useState(false);

  function isMine(m: ChatMessage) {
    const sid = String(m?.sender?.userId ?? '');
    const st = String(m?.sender?.userType ?? '');
    return sid === me.userId && st === me.userType;
  }

  function scrollToBottom(animated = true) {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollHeight;
    el.scrollTo({ top, behavior: animated ? 'smooth' : 'auto' });
    atBottomRef.current = true;
    setShowJump(false);
  }

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    const atBottom = distanceFromBottom < 140;
    atBottomRef.current = atBottom;
    setShowJump(!atBottom && messages.length > 0);
  }

  /**
   * Prevent duplicates:
   * - if incoming has same DB _id -> ignore
   * - if incoming has clientMessageId and local optimistic exists -> replace it
   * - else append
   */
  function upsertMessage(incoming: ChatMessage) {
    if (!incoming?._id) return;

    setMessages((prev) => {
      if (prev.some((m) => String(m?._id) === String(incoming._id))) return prev;

      const incomingClientId = incoming?.clientMessageId ? String(incoming.clientMessageId) : '';
      if (incomingClientId) {
        const idx = prev.findIndex((m) => String(m?.clientMessageId || '') === incomingClientId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = incoming;
          return next;
        }
      }

      return [...prev, incoming];
    });
  }

  async function loadHistory() {
    setLoading(true);
    try {
      const newestFirst = await chatApi.listMessages(groupId, { limit: 80, markRead: true });
      setMessages([...newestFirst].reverse()); // oldest -> newest
      atBottomRef.current = true;
      setShowJump(false);
      setTimeout(() => scrollToBottom(false), 60);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!groupId) return;
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

// socket listeners + join
useEffect(() => {
  if (!groupId) return;

  const join = () => {
    socket.emit('group:join', { groupId }, (ack: any) => {
      if (!ack?.ok) router.back();
    });
  };

  if (socket.connected) join();
  else socket.once('connect', join);

  const onNewMessage = (payload: { groupId: string; message: ChatMessage }) => {
    if (payload?.groupId !== groupId) return;
    const incoming = payload.message;
    upsertMessage(incoming);
    if (incoming?.clientMessageId && isMine(incoming)) {
      setStatusByClientId((m) => ({ ...m, [String(incoming.clientMessageId)]: 'delivered' }));
    }
  };

  const onTyping = (payload: { groupId: string; user?: any; isTyping?: boolean }) => {
    if (payload?.groupId !== groupId) return;
    const u = payload?.user;
    const isTyping = !!payload?.isTyping;

    if (u?.userId && String(u.userId) === me.userId && String(u.userType) === me.userType) return;

    if (!isTyping) {
      setTypingLabel(null);
      return;
    }

    const name = String(u?.displayName ?? '').trim() || prettyUserType(u?.userType);
    setTypingLabel(`${name} is typing…`);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTypingLabel(null), 1800);
  };

  const onMessageDeleted = (payload: { groupId: string; messageId: string; message: ChatMessage }) => {
    if (payload?.groupId !== groupId) return;
    const mid = String(payload.messageId || '');
    const msg = payload.message;
    setMessages((prev) => prev.map((m) => (String(m._id) === mid ? msg : m)));
  };

  socket.on('group:newMessage', onNewMessage);
  socket.on('group:typing', onTyping);
  socket.on('group:messageDeleted', onMessageDeleted);

  return () => {
    socket.off('group:newMessage', onNewMessage);
    socket.off('group:typing', onTyping);
    socket.off('group:messageDeleted', onMessageDeleted);
    socket.off('connect', join);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };
}, [socket, groupId, me.userId, me.userType, router]);


  // auto-scroll only if user is already near bottom
  useEffect(() => {
    if (!atBottomRef.current) return;
    const t = setTimeout(() => scrollToBottom(true), 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, typingLabel]);

  function emitTyping(isTyping: boolean) {
    const now = Date.now();
    if (isTyping && now - lastTypingEmitRef.current < 650) return;
    lastTypingEmitRef.current = now;
    socket.emit('group:typing', { groupId, isTyping });
  }

  function handleTextChange(v: string) {
    setText(v);
    if (v.trim()) emitTyping(true);
    else emitTyping(false);
  }

  function newClientMessageId() {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  function onSend() {
    const t = text.trim();
    if (!t || !groupId) return;

    const clientMessageId = newClientMessageId();

    const optimistic: ChatMessage = {
      _id: `local-${clientMessageId}`,
      groupId,
      text: t,
      createdAt: new Date().toISOString(),
      clientMessageId,
      sender: {
        userType: me.userType,
        userId: me.userId,
        displayName: me.displayName,
      },
    };

    setMessages((prev) => [...prev, optimistic]);
    setStatusByClientId((m) => ({ ...m, [clientMessageId]: 'sending' }));
    setText('');
    emitTyping(false);

    setTimeout(() => scrollToBottom(true), 30);

    socket.emit('group:sendMessage', { groupId, text: t, clientMessageId }, (ack: any) => {
      if (!ack?.ok) {
        setStatusByClientId((m) => ({ ...m, [clientMessageId]: 'sent' }));
        return;
      }

      // mark "sent" on ack; delivered on broadcast echo
      setStatusByClientId((m) => ({ ...m, [clientMessageId]: 'sent' }));

      if (ack?.message) {
        upsertMessage(ack.message as ChatMessage);
      }
    });
  }

  async function copyToClipboard(value: string) {
    const v = String(value ?? '');
    try {
      await navigator.clipboard.writeText(v);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = v;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function deleteForMe(messageId: string) {
    setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
  }

  function deleteForEveryone(msg: ChatMessage) {
    if (!msg?._id || String(msg._id).startsWith('local-')) return;

    const ok = window.confirm('Delete for everyone?');
    if (!ok) return;

    socket.emit('group:deleteMessage', { groupId, messageId: msg._id }, (ack: any) => {
      if (!ack?.ok) {
        window.alert(ack?.error || 'Failed to delete message');
        return;
      }

      // optimistic local UI update; server broadcast will also update
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(msg._id)
            ? { ...m, text: '', deletedAt: new Date().toISOString() }
            : m,
        ),
      );
    });
  }

  function onMessageMenu(e: React.MouseEvent, msg: ChatMessage) {
    e.preventDefault();

    const mine = isMine(msg);
    const isLocal = String(msg._id || '').startsWith('local-');

    const action = window.prompt(
      [
        'Type action:',
        '1 = Copy',
        '2 = Delete for me',
        mine && !isLocal ? '3 = Delete for everyone' : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );

    if (action === '1') copyToClipboard(String(msg.text ?? ''));
    else if (action === '2') deleteForMe(String(msg._id));
    else if (action === '3' && mine && !isLocal) deleteForEveryone(msg);
  }

  const rows: UiRow[] = useMemo(() => {
    const out: UiRow[] = [];
    let lastDay = '';

    for (const m of messages) {
      const day = toDayKey(m.createdAt);
      if (day && day !== lastDay) {
        out.push({ kind: 'sep', id: `sep-${day}`, label: dayLabel(m.createdAt) });
        lastDay = day;
      }

      const localStatus = m.clientMessageId ? statusByClientId[String(m.clientMessageId)] : undefined;
      out.push({ kind: 'msg', id: String(m._id), msg: m, localStatus });
    }

    if (typingLabel) out.push({ kind: 'sep', id: 'typing', label: typingLabel });

    return out;
  }, [messages, statusByClientId, typingLabel]);

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{title}</div>
          <div className="text-xs text-gray-600">{typingLabel ? typingLabel : 'Online'}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="secondary" size="sm" onClick={() => loadHistory()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="border rounded bg-white h-[65vh] overflow-auto p-3"
      >
        {loading ? (
          <div className="text-sm text-gray-600">Loading messages…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-600">No messages yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              if (r.kind === 'sep') {
                return (
                  <div key={r.id} className="flex justify-center py-2">
                    <div className="text-xs text-gray-600 bg-gray-100 border rounded-full px-3 py-1">
                      {r.label}
                    </div>
                  </div>
                );
              }

              const m = r.msg;
              const mine = isMine(m);
              const who = String(m.sender?.displayName ?? '').trim() || prettyUserType(m.sender?.userType);
              const isDeleted = !!m.deletedAt || String(m.text ?? '') === '';

              const tick = (() => {
                if (!mine) return '';
                if (!m.clientMessageId) return '';
                const st = r.localStatus;
                if (st === 'sending') return ' ⏳';
                if (st === 'sent') return ' ✓';
                if (st === 'delivered') return ' ✓✓';
                return '';
              })();

              return (
                <div key={r.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    onContextMenu={(e) => onMessageMenu(e, m)}
                    className={[
                      'max-w-[82%] border rounded-2xl px-3 py-2',
                      mine ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-slate-100 text-slate-900 border-slate-200',
                    ].join(' ')}
                    title="Right-click for actions"
                  >
                    {!mine ? <div className="text-xs font-semibold opacity-80 mb-1">{who}</div> : null}

                    <div className={`text-sm ${isDeleted ? 'italic opacity-80' : ''}`}>
                      {isDeleted ? 'This message was deleted' : String(m.text ?? '')}
                    </div>

                    <div className="mt-1 text-[11px] opacity-80 flex justify-end gap-2">
                      <span>{timeLabel(m.createdAt)}</span>
                      {mine ? <span>{tick}</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Jump to bottom */}
      {showJump ? (
        <div className="flex justify-center">
          <Button variant="secondary" size="sm" onClick={() => scrollToBottom(true)}>
            Jump to bottom
          </Button>
        </div>
      ) : null}

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 border rounded px-3 py-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSend();
          }}
        />
        <Button onClick={onSend} disabled={!text.trim()}>
          Send
        </Button>
      </div>

      <div className="text-xs text-gray-500">
        Tip: Right-click a message for Copy / Delete for me / Delete for everyone (if yours).
      </div>
    </div>
  );
}
