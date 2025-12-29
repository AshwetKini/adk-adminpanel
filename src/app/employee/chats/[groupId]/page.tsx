'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

import { getChatSocket } from '@/lib/chatSocket';
import { chatApi, type ChatMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';

type ChatUserType = 'employee' | 'admin' | 'customer';
type LocalStatus = 'sending' | 'sent' | 'delivered';

type UiRow =
  | { kind: 'sep'; id: string; label: string }
  | { kind: 'msg'; id: string; msg: ChatMessage; localStatus?: LocalStatus };

type MenuState =
  | null
  | {
      x: number;
      y: number;
      msg: ChatMessage;
      mine: boolean;
      isLocal: boolean;
    };

type ConfirmActionState =
  | null
  | {
      kind: 'delete_me' | 'delete_everyone';
      msg: ChatMessage;
    };

type NoticeState =
  | null
  | {
      title: string;
      message: string;
    };

type ToastState =
  | null
  | {
      message: string;
    };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
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

function msgId(m: any) {
  return String(m?._id ?? m?.id ?? '');
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

function initials(name: string) {
  const s = String(name ?? '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean).slice(0, 2);
  const a = parts[0]?.[0] ?? '?';
  const b = parts.length > 1 ? parts[1]?.[0] ?? '' : '';
  return (a + b).toUpperCase();
}

function previewText(msg: ChatMessage) {
  const t = String((msg as any)?.text ?? '').trim();
  if (!t) return 'This message';
  return t.length > 90 ? `${t.slice(0, 90)}…` : t;
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

  const socket = useMemo(() => {
    try {
      return getChatSocket();
    } catch {
      return null as any;
    }
  }, []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const atBottomRef = useRef(true);
  const typingTimerRef = useRef<any>(null);
  const lastTypingEmitRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');

  const [statusByClientId, setStatusByClientId] = useState<Record<string, LocalStatus>>({});
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);

  // Right-click menu
  const [menu, setMenu] = useState<MenuState>(null);

  // Confirm modal (delete me / delete everyone)
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Error/info modal
  const [notice, setNotice] = useState<NoticeState>(null);

  // Toast (Copied)
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<any>(null);

  function showToast(message: string) {
    setToast({ message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1300);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Close menu on outside click / escape / scroll / resize
  useEffect(() => {
    if (!menu) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    const onAny = () => setMenu(null);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onAny);
    window.addEventListener('scroll', onAny, true);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onAny);
      window.removeEventListener('scroll', onAny, true);
    };
  }, [menu]);

  // Close modals on Escape
  useEffect(() => {
    if (!confirmAction && !notice) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (notice) setNotice(null);
      else if (confirmAction && !isDeleting) setConfirmAction(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmAction, notice, isDeleting]);

  function isMine(m: ChatMessage) {
    const sid = String((m as any)?.sender?.userId ?? '');
    const st = String((m as any)?.sender?.userType ?? '');
    return sid === me.userId && st === me.userType;
  }

  function scrollToBottom(animated = true) {
    if (!endRef.current) return;
    endRef.current.scrollIntoView({ behavior: animated ? 'smooth' : 'auto', block: 'end' });
    atBottomRef.current = true;
    setShowJump(false);
  }

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 180;
    atBottomRef.current = atBottom;
    setShowJump(!atBottom && messages.length > 0);
  }

  // Prevent duplicates + replace optimistic by clientMessageId
  function upsertMessage(incoming: ChatMessage) {
    const incomingId = msgId(incoming);
    if (!incomingId) return;

    setMessages((prev) => {
      if (prev.some((m) => msgId(m) === incomingId)) return prev;

      const incomingClientId = String((incoming as any)?.clientMessageId ?? '');
      if (incomingClientId) {
        const idx = prev.findIndex((m) => String((m as any)?.clientMessageId ?? '') === incomingClientId);
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
    if (!groupId) return;
    setLoading(true);
    try {
      const newestFirst = await chatApi.listMessages(groupId, { limit: 80, markRead: true });
      setMessages([...newestFirst].reverse()); // oldest -> newest
      atBottomRef.current = true;
      setShowJump(false);
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom(false)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!groupId) return;
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Socket listeners + join
  useEffect(() => {
    if (!groupId || !socket) return;

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

      const clientId = String((incoming as any)?.clientMessageId ?? '');
      if (clientId && isMine(incoming)) {
        setStatusByClientId((m) => ({ ...m, [clientId]: 'delivered' }));
      }
    };

    const onTyping = (payload: { groupId: string; user?: any; isTyping?: boolean }) => {
      if (payload?.groupId !== groupId) return;

      const u = payload?.user;
      const isTypingNow = !!payload?.isTyping;

      // ignore self
      if (u?.userId && String(u.userId) === me.userId && String(u.userType) === me.userType) return;

      if (!isTypingNow) {
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
      setMessages((prev) => prev.map((m) => (msgId(m) === mid ? msg : m)));
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

  // Auto-scroll only if user is already near bottom
  useEffect(() => {
    if (!atBottomRef.current) return;
    requestAnimationFrame(() => scrollToBottom(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, typingLabel]);

  function emitTyping(isTyping: boolean) {
    if (!socket || !groupId) return;

    const now = Date.now();
    if (isTyping && now - lastTypingEmitRef.current < 650) return;

    lastTypingEmitRef.current = now;
    socket.emit('group:typing', { groupId, isTyping });
  }

  function newClientMessageId() {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  function handleComposerChange(v: string) {
    setText(v);
    if (v.trim()) emitTyping(true);
    else emitTyping(false);
  }

  function onSend() {
    const t = text.trim();
    if (!t || !groupId || !socket) return;

    const clientMessageId = newClientMessageId();

    const optimistic: any = {
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

    requestAnimationFrame(() => scrollToBottom(true));

    socket.emit('group:sendMessage', { groupId, text: t, clientMessageId }, (ack: any) => {
      setStatusByClientId((m) => ({ ...m, [clientMessageId]: 'sent' }));
      if (ack?.message) upsertMessage(ack.message as ChatMessage);
    });
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

  function deleteForMe(messageId: string) {
    setMessages((prev) => prev.filter((m) => msgId(m) !== String(messageId)));
  }

  function onMessageMenu(e: React.MouseEvent, msg: ChatMessage) {
    e.preventDefault();

    const mine = isMine(msg);
    const isLocal = msgId(msg).startsWith('local-');

    setMenu({
      x: e.clientX,
      y: e.clientY,
      msg,
      mine,
      isLocal,
    });
  }

  function openConfirmDeleteMe(msg: ChatMessage) {
    setConfirmAction({ kind: 'delete_me', msg });
  }

  function openConfirmDeleteEveryone(msg: ChatMessage) {
    const id = msgId(msg);
    if (!id || id.startsWith('local-')) return;
    setConfirmAction({ kind: 'delete_everyone', msg });
  }

  function performConfirmedAction() {
    if (!confirmAction) return;

    if (confirmAction.kind === 'delete_me') {
      deleteForMe(msgId(confirmAction.msg));
      setConfirmAction(null);
      return;
    }

    // delete_everyone
    if (!socket) return;

    const id = msgId(confirmAction.msg);
    if (!id || id.startsWith('local-')) {
      setConfirmAction(null);
      return;
    }

    setIsDeleting(true);

    socket.emit('group:deleteMessage', { groupId, messageId: id }, (ack: any) => {
      setIsDeleting(false);

      if (!ack?.ok) {
        setConfirmAction(null);
        setNotice({
          title: 'Could not delete message',
          message: String(ack?.error || 'Failed to delete message'),
        });
        return;
      }

      // optimistic UI update; server broadcast will also update
      setMessages((prev) =>
        prev.map((m: any) => (msgId(m) === id ? { ...m, text: '', deletedAt: new Date().toISOString() } : m)),
      );

      setConfirmAction(null);
    });
  }

  const rows: UiRow[] = useMemo(() => {
    const out: UiRow[] = [];
    let lastDay = '';

    for (const m of messages) {
      const day = toDayKey((m as any).createdAt);
      if (day && day !== lastDay) {
        out.push({ kind: 'sep', id: `sep-${day}`, label: dayLabel((m as any).createdAt) });
        lastDay = day;
      }

      const clientId = String((m as any)?.clientMessageId ?? '');
      const localStatus = clientId ? statusByClientId[clientId] : undefined;

      out.push({ kind: 'msg', id: `${msgId(m)}-${clientId || ''}`, msg: m, localStatus });
    }

    if (typingLabel) out.push({ kind: 'sep', id: 'typing', label: typingLabel });
    return out;
  }, [messages, statusByClientId, typingLabel]);

  const confirmTitle = confirmAction?.kind === 'delete_everyone' ? 'Delete message for everyone?' : 'Delete message?';
  const confirmSubtitle =
    confirmAction?.kind === 'delete_everyone'
      ? 'This will delete the message for everyone in this chat.'
      : 'This will remove the message only from your view.';

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#f0f2f5]">
      <div className="mx-auto w-full max-w-6xl px-2 py-3">
        <div
          className={cx(
            'h-[calc(100dvh-160px)]',
            'min-h-[460px]',
            'w-full overflow-hidden rounded-xl border bg-white shadow-sm',
            'flex flex-col',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#f0f2f5] border-b">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.back()}
                className="h-9 w-9 rounded-full hover:bg-black/5 transition-colors flex items-center justify-center text-lg"
                aria-label="Back"
                title="Back"
              >
                ‹
              </button>

              <div className="h-10 w-10 rounded-full bg-[#dfe5e7] flex items-center justify-center text-sm font-semibold text-[#111b21] shrink-0">
                {initials(title)}
              </div>

              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-[#111b21] truncate">{title}</div>
                <div className="text-[12px] text-[#667781] truncate">{typingLabel ? typingLabel : 'Online'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={loadHistory}>
                Refresh
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="relative flex-1 min-h-0 bg-[#efeae2]">
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, #111b21 1px, transparent 0)",
                backgroundSize: '18px 18px',
              }}
            />

            <div
              ref={scrollRef}
              onScroll={onScroll}
              className={cx('relative h-full min-h-0 overflow-y-auto', 'px-3 py-3 md:px-6 md:py-4', 'pb-6')}
              style={{ scrollPaddingBottom: 120 }}
            >
              {loading ? (
                <div className="text-sm text-[#667781]">Loading messages…</div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-[#667781]">No messages yet.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {rows.map((r) => {
                    if (r.kind === 'sep') {
                      return (
                        <div key={r.id} className="flex justify-center py-2">
                          <div className="text-[12px] text-[#54656f] bg-white/70 border border-black/5 rounded-full px-3 py-1 backdrop-blur">
                            {r.label}
                          </div>
                        </div>
                      );
                    }

                    const m: any = r.msg;
                    const mine = isMine(r.msg);
                    const who = String(m?.sender?.displayName ?? '').trim() || prettyUserType(m?.sender?.userType);
                    const isDeleted = !!m?.deletedAt || String(m?.text ?? '') === '';

                    const tick = (() => {
                      if (!mine) return '';
                      const clientId = String(m?.clientMessageId ?? '');
                      if (!clientId) return '';
                      const st = r.localStatus;
                      if (st === 'sending') return '⏳';
                      if (st === 'sent') return '✓';
                      if (st === 'delivered') return '✓✓';
                      return '';
                    })();

                    return (
                      <div key={r.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                        <div
                          onContextMenu={(e) => onMessageMenu(e, r.msg)}
                          className={cx(
                            'max-w-[82%] rounded-2xl px-3 py-2',
                            'shadow-[0_1px_0_rgba(0,0,0,0.06)]',
                            mine ? 'bg-[#d9fdd3] text-[#111b21]' : 'bg-white text-[#111b21]',
                          )}
                          title="Right-click for actions"
                        >
                          {!mine ? (
                            <div className="text-[12px] font-semibold text-[#54656f] mb-0.5">{who}</div>
                          ) : null}

                          <div
                            className={cx(
                              'text-[14px] leading-snug whitespace-pre-wrap break-words',
                              isDeleted ? 'italic text-[#667781]' : '',
                            )}
                          >
                            {isDeleted ? 'This message was deleted' : String(m?.text ?? '')}
                          </div>

                          <div className="mt-1 flex items-end justify-end gap-2 text-[11px] text-[#667781]">
                            <span>{timeLabel(m?.createdAt)}</span>
                            {mine ? <span>{tick}</span> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={endRef} />
                </div>
              )}
            </div>

            {showJump ? (
              <button
                type="button"
                onClick={() => scrollToBottom(true)}
                className="absolute right-4 bottom-24 md:bottom-28 h-10 px-3 rounded-full bg-white border shadow-sm text-sm text-[#111b21] hover:bg-gray-50"
              >
                Jump to bottom
              </button>
            ) : null}
          </div>

          {/* Composer */}
          <div className="bg-[#f0f2f5] border-t px-3 py-3">
            <div className="flex items-end gap-2">
              <button
                type="button"
                className="h-10 w-10 rounded-full hover:bg-black/5 transition-colors flex items-center justify-center"
                title="Emoji (todo)"
                aria-label="Emoji"
              >
                🙂
              </button>

              <div className="flex-1">
                <textarea
                  value={text}
                  onChange={(e) => handleComposerChange(e.target.value)}
                  placeholder="Type a message…"
                  rows={1}
                  className="w-full resize-none rounded-2xl border bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 max-h-32"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                />
                <div className="mt-1 text-[11px] text-[#667781]">Enter to send · Shift+Enter for new line</div>
              </div>

              <button
                type="button"
                onClick={onSend}
                disabled={!text.trim()}
                className={cx(
                  'h-10 w-10 rounded-full flex items-center justify-center text-white transition-colors',
                  text.trim() ? 'bg-[#00a884] hover:bg-[#029c7b]' : 'bg-[#9fd8cd] cursor-not-allowed',
                )}
                aria-label="Send"
                title="Send"
              >
                ➤
              </button>
            </div>
          </div>
        </div>

        {/* Context menu */}
        {menu ? (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              onMouseDown={() => setMenu(null)}
              aria-label="Close menu"
            />

            <div
              className="fixed w-56 rounded-xl border bg-white shadow-lg overflow-hidden"
              style={{
                left: Math.min(menu.x, window.innerWidth - 240),
                top: Math.min(menu.y, window.innerHeight - 180),
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 text-[11px] font-semibold text-[#667781] bg-[#f0f2f5]">
                Message actions
              </div>

              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={async () => {
                  await copyToClipboard(String((menu.msg as any)?.text ?? ''));
                  setMenu(null);
                  showToast('Copied');
                }}
              >
                Copy
              </button>

              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => {
                  const msg = menu.msg;
                  setMenu(null);
                  openConfirmDeleteMe(msg);
                }}
              >
                Delete for me
              </button>

              {menu.mine && !menu.isLocal ? (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    const msg = menu.msg;
                    setMenu(null);
                    openConfirmDeleteEveryone(msg);
                  }}
                >
                  Delete for everyone
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Confirm action modal */}
        {confirmAction ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/30"
              onMouseDown={() => {
                if (!isDeleting) setConfirmAction(null);
              }}
              aria-label="Close confirmation"
            />

            <div
              className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl border overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="px-4 py-3 bg-[#f0f2f5] border-b">
                <div className="text-sm font-semibold text-[#111b21]">{confirmTitle}</div>
                <div className="text-xs text-[#667781] mt-0.5">{confirmSubtitle}</div>
              </div>

              <div className="px-4 py-3">
                <div className="text-xs text-[#667781] mb-1">Message</div>
                <div className="text-sm text-[#111b21] bg-[#f7f8fa] border rounded-xl px-3 py-2 break-words">
                  {previewText(confirmAction.msg)}
                </div>
              </div>

              <div className="px-4 py-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  className={cx(
                    'h-9 px-3 rounded-lg text-sm border',
                    isDeleting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50',
                  )}
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  className={cx(
                    'h-9 px-3 rounded-lg text-sm text-white',
                    confirmAction.kind === 'delete_everyone' ? 'bg-red-600' : 'bg-[#00a884]',
                    isDeleting
                      ? 'opacity-60 cursor-not-allowed'
                      : confirmAction.kind === 'delete_everyone'
                        ? 'hover:bg-red-700'
                        : 'hover:bg-[#029c7b]',
                  )}
                  onClick={performConfirmedAction}
                >
                  {isDeleting ? 'Deleting…' : confirmAction.kind === 'delete_everyone' ? 'Delete' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Error/info modal (replaces window.alert) */}
        {notice ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/30"
              onMouseDown={() => setNotice(null)}
              aria-label="Close message"
            />

            <div
              className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl border overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="px-4 py-3 bg-[#f0f2f5] border-b">
                <div className="text-sm font-semibold text-[#111b21]">{notice.title}</div>
              </div>

              <div className="px-4 py-3 text-sm text-[#111b21] break-words">{notice.message}</div>

              <div className="px-4 py-3 border-t flex justify-end">
                <button
                  type="button"
                  className="h-9 px-3 rounded-lg text-sm border hover:bg-gray-50"
                  onClick={() => setNotice(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Toast */}
        {toast ? (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[80] pointer-events-none">
            <div className="px-3 py-2 rounded-full bg-[#111b21] text-white text-sm shadow-lg">
              {toast.message}
            </div>
          </div>
        ) : null}

        <div className="mt-2 text-xs text-[#667781]">Tip: Right-click a message for actions.</div>
      </div>
    </div>
  );
}
