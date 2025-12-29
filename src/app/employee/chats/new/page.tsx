'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chatApi, type ChatUserRef } from '@/lib/api';
import { customerApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Mode = 'dm' | 'group';
type Step = 'pick' | 'subject';
type ToastType = 'success' | 'error' | 'info';

function initials(name?: string) {
  const s = String(name ?? '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('');
}

function safeId(c: any) {
  return String(c?.id ?? c?._id ?? '').trim();
}

function safeLabel(c: any) {
  return String(c?.fullName ?? '').trim() || String(c?.customerId ?? '').trim() || 'Customer';
}

function safeSub(c: any) {
  const cid = String(c?.customerId ?? '').trim();
  const mob = String(c?.mobileNumber ?? '').trim();
  const parts = [];
  if (cid) parts.push(`ID: ${cid}`);
  if (mob) parts.push(`Mobile: ${mob}`);
  return parts.length ? parts.join(' • ') : 'Customer';
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`${className} nc-spin`} viewBox="0 0 24 24" aria-hidden="true">
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
    <div className="nc-row nc-rowSkeleton">
      <div className="nc-avatar skeleton-shimmer" />
      <div className="nc-rowMid">
        <div className="h-4 w-44 rounded skeleton-shimmer" />
        <div className="mt-2 h-4 w-64 rounded skeleton-shimmer" />
      </div>
      <div className="h-6 w-6 rounded skeleton-shimmer" />
    </div>
  );
}

export default function NewChatPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('dm');
  const [step, setStep] = useState<Step>('pick');

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const toastTimerRef = useRef<any>(null);

  const debounceRef = useRef<any>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  function showToast(message: string, type: ToastType = 'info') {
    setToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((x) => safeId(x))), [selected]);
  const title = mode === 'dm' ? 'New chat' : step === 'pick' ? 'New group' : 'Group subject';

  const subtitle =
    mode === 'dm'
      ? `${items.length} contacts`
      : step === 'pick'
        ? `${selected.length} selected`
        : `${selected.length} participants`;

  async function loadCustomers(search: string) {
    setLoading(true);
    try {
      const res = await customerApi.all({ search: search.trim() || undefined, page: 1, limit: 50 });
      setItems(Array.isArray((res as any)?.data) ? (res as any).data : []);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to load customers';
      setItems([]);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCustomers(query), 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    // reset on mode change (same behavior)
    setStep('pick');
    setQuery('');
    setSelected([]);
    setGroupName('');
  }, [mode]);

  // Shortcuts: "/" focus search, "Esc" clear
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as any)?.tagName?.toLowerCase?.();
      const isTyping = tag === 'input' || tag === 'textarea' || (e.target as any)?.isContentEditable;

      if (e.key === '/' && !isTyping && !(mode === 'group' && step === 'subject')) {
        e.preventDefault();
        searchRef.current?.focus();
      }

      if (e.key === 'Escape') {
        if (query.trim()) setQuery('');
        if (document.activeElement === searchRef.current) searchRef.current?.blur();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [query, mode, step]);

  function togglePick(c: any) {
    const id = safeId(c);
    if (!id) return;

    if (mode === 'dm') {
      setSelected([c]);
      return;
    }

    setSelected((prev) => {
      const exists = prev.some((x: any) => safeId(x) === id);
      if (exists) return prev.filter((x: any) => safeId(x) !== id);
      return [...prev, c];
    });
  }

  function removePicked(id: string) {
    setSelected((prev) => prev.filter((x: any) => safeId(x) !== id));
  }

  async function createDM() {
    const customer = selected[0];
    if (!customer) return;

    setCreating(true);
    try {
      const members: ChatUserRef[] = [
        {
          userType: 'customer',
          userId: String(customer.id ?? customer._id),
          displayName: String(customer.fullName || customer.customerId || 'Customer'),
        },
      ];

      const g = await chatApi.createGroup({
        name: `Support - ${customer.customerId || customer.fullName || 'Customer'}`,
        members,
      });

      router.replace(`/employee/chats/${String((g as any)._id)}?title=${encodeURIComponent((g as any).name || 'Chat')}`);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? e?.message ?? 'Failed to create chat', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function createGroup() {
    setCreating(true);
    try {
      const members: ChatUserRef[] = selected.map((c: any) => ({
        userType: 'customer',
        userId: String(c.id ?? c._id),
        displayName: String(c.fullName || c.customerId || 'Customer'),
      }));

      const g = await chatApi.createGroup({ name: groupName.trim(), members });
      router.replace(`/employee/chats/${String((g as any)._id)}?title=${encodeURIComponent((g as any).name || 'Group')}`);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? e?.message ?? 'Failed to create group', 'error');
    } finally {
      setCreating(false);
    }
  }

  const canDM = mode === 'dm' && selected.length === 1 && !creating;
  const canNext = mode === 'group' && step === 'pick' && selected.length >= 2 && !creating;
  const canCreateGroup =
    mode === 'group' && step === 'subject' && selected.length >= 2 && groupName.trim().length >= 3 && !creating;

  const dmSelected = mode === 'dm' ? selected[0] : null;

  return (
    <div className="nc-page">
      {/* Toast */}
      {toast ? (
        <div className={['nc-toast', `nc-toast-${toast.type}`].join(' ')} role="status" aria-live="polite">
          <div className="nc-toastDot" />
          <div className="nc-toastMsg">{toast.message}</div>
          <button className="nc-toastX" onClick={() => setToast(null)} aria-label="Close toast">
            ×
          </button>
        </div>
      ) : null}

      <div className="nc-shell nc-enter">
        {/* Top bar */}
        <div className="nc-topbar">
          <div className="min-w-0">
            <div className="nc-kicker">Employee / Chats</div>
            <div className="nc-titleRow">
              <h1 className="nc-title">{title}</h1>
              <span className="nc-pill">{subtitle}</span>
              {!(mode === 'group' && step === 'subject') ? <span className="nc-pill">Shortcut: /</span> : null}
            </div>
          </div>

          <div className="nc-actions">
            <div className="nc-seg">
              <button
                type="button"
                className={['nc-segBtn', mode === 'dm' ? 'active' : ''].join(' ')}
                onClick={() => setMode('dm')}
                disabled={creating}
              >
                Message
              </button>
              <button
                type="button"
                className={['nc-segBtn', mode === 'group' ? 'active' : ''].join(' ')}
                onClick={() => setMode('group')}
                disabled={creating}
              >
                Group
              </button>
            </div>

            <Button variant="secondary" onClick={() => router.push('/employee/chats')} disabled={creating}>
              Back
            </Button>
          </div>
        </div>

        <div className="nc-body">
          {/* Left: picker */}
          <div className="nc-left">
            {mode === 'group' && step === 'subject' ? (
              <div className="nc-card">
                <div className="nc-cardHeader">
                  <div className="nc-cardTitle">Group subject</div>
                  <div className="nc-cardSub">Name your group and confirm participants.</div>
                </div>

                <div className="nc-cardContent">
                  <Input label="Group subject" value={groupName} onChange={(e: any) => setGroupName(e.target.value)} />

                  <div className="nc-miniLabel">Participants</div>

                  <div className="nc-participants">
                    {selected.map((c: any) => {
                      const id = safeId(c);
                      const label = safeLabel(c);
                      return (
                        <div key={id} className="nc-participantRow">
                          <div className="nc-avatar">{initials(label)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="nc-rowTitle truncate">{label}</div>
                            <div className="nc-rowSub truncate">{safeSub(c)}</div>
                          </div>
                          <button
                            type="button"
                            className="nc-iconBtn"
                            onClick={() => removePicked(id)}
                            disabled={creating}
                            title="Remove"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="nc-bottom">
                    <Button variant="secondary" onClick={() => setStep('pick')} disabled={creating}>
                      Back
                    </Button>
                    <Button onClick={createGroup} disabled={!canCreateGroup}>
                      {creating ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner />
                          Creating…
                        </span>
                      ) : (
                        'Create'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="nc-card">
                <div className="nc-cardHeader">
                  <div className="nc-cardTitle">{mode === 'dm' ? 'Select a customer' : 'Add participants'}</div>
                  <div className="nc-cardSub">
                    {mode === 'dm' ? 'Pick one customer to start a chat.' : 'Pick at least 2 customers for a group.'}
                  </div>
                </div>

                {/* Selected chips (group only) */}
                {mode === 'group' && selected.length > 0 ? (
                  <div className="nc-chipBar">
                    <div className="nc-chipRow">
                      {selected.map((c: any) => {
                        const id = safeId(c);
                        const label = safeLabel(c);
                        return (
                          <button
                            key={id}
                            type="button"
                            className="nc-chip"
                            onClick={() => removePicked(id)}
                            title="Remove"
                          >
                            <span className="nc-chipAvatar">{initials(label)}</span>
                            <span className="nc-chipText">{label}</span>
                            <span className="nc-chipX">×</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="nc-search">
                  <div className="nc-searchBox">
                    <span className="nc-searchIcon">⌕</span>
                    <input
                      ref={searchRef}
                      className="nc-searchInput"
                      placeholder="Search customers by name, ID, mobile…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                      type="button"
                      className="nc-clear"
                      onClick={() => setQuery('')}
                      disabled={!query.trim()}
                      aria-label="Clear search"
                      title="Clear"
                    >
                      ×
                    </button>
                  </div>

                  <div className="nc-searchMeta">
                    <span>{loading ? 'Searching…' : `${items.length} result${items.length === 1 ? '' : 's'}`}</span>
                    <span className="nc-dot">•</span>
                    <span>{mode === 'dm' ? 'Click to select' : 'Click to toggle'}</span>
                  </div>
                </div>

                <div className="nc-list">
                  {loading ? (
                    <div className="divide-y">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <SkeletonRow key={i} />
                      ))}
                    </div>
                  ) : items.length === 0 ? (
                    <div className="nc-empty">
                      <div className="nc-emptyTitle">No customers found</div>
                      <div className="nc-emptySub">Try searching by mobile number or customer ID.</div>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {items.map((c: any, idx: number) => {
                        const id = safeId(c) || `row-${idx}`;
                        const active = selectedIds.has(id);
                        const label = safeLabel(c);

                        return (
                          <button
                            key={id}
                            onClick={() => togglePick(c)}
                            className={['nc-row', active ? 'active' : ''].join(' ')}
                            aria-pressed={active}
                          >
                            <div className={['nc-avatar', active ? 'active' : ''].join(' ')}>
                              {initials(label)}
                            </div>

                            <div className="nc-rowMid">
                              <div className="nc-rowTitle truncate">{String(c?.fullName ?? '').trim() || '—'}</div>
                              <div className="nc-rowSub truncate">{safeSub(c)}</div>
                            </div>

                            <div className="nc-rowRight">
                              {mode === 'group' ? (
                                <span className={['nc-check', active ? 'on' : ''].join(' ')}>{active ? '✓' : ''}</span>
                              ) : (
                                <span className={['nc-radio', active ? 'on' : ''].join(' ')} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="nc-bottom">
                  <Button variant="secondary" onClick={() => router.push('/employee/chats')} disabled={creating}>
                    Cancel
                  </Button>

                  {mode === 'dm' ? (
                    <Button onClick={createDM} disabled={!canDM}>
                      {creating ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner />
                          Please wait…
                        </span>
                      ) : (
                        'Chat'
                      )}
                    </Button>
                  ) : (
                    <Button onClick={() => setStep('subject')} disabled={!canNext}>
                      Next
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: preview panel (desktop only, but harmless) */}
          <div className="nc-right">
            <div className="nc-preview">
              <div className="nc-previewIcon">+</div>
              <div className="nc-previewTitle">
                {mode === 'dm' ? 'Start a 1-to-1 chat' : step === 'pick' ? 'Build your group' : 'Finalize your group'}
              </div>
              <div className="nc-previewSub">
                {mode === 'dm'
                  ? 'Select one customer on the left and click Chat.'
                  : step === 'pick'
                    ? 'Select at least two customers, then click Next.'
                    : 'Enter a group subject and click Create.'}
              </div>

              {mode === 'dm' ? (
                <div className="nc-previewCard">
                  <div className="nc-miniLabel">Selected</div>
                  {dmSelected ? (
                    <div className="nc-participantRow">
                      <div className="nc-avatar">{initials(safeLabel(dmSelected))}</div>
                      <div className="min-w-0 flex-1">
                        <div className="nc-rowTitle truncate">{safeLabel(dmSelected)}</div>
                        <div className="nc-rowSub truncate">{safeSub(dmSelected)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="nc-muted">No customer selected yet.</div>
                  )}
                </div>
              ) : (
                <div className="nc-previewCard">
                  <div className="nc-miniLabel">Participants</div>
                  <div className="nc-muted">
                    {selected.length < 1 ? 'No one selected.' : `${selected.length} selected.`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx global>{`
          /* ===== page frame ===== */
          .nc-page {
            padding: 16px;
            background: radial-gradient(circle at 12% 10%, rgba(59, 130, 246, 0.12), transparent 35%),
              radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.10), transparent 35%),
              #f8fafc;
            min-height: calc(100vh - 0px);
          }

          .nc-shell {
            max-width: 1100px;
            margin: 0 auto;
            border: 1px solid rgba(226, 232, 240, 1);
            border-radius: 16px;
            background: white;
            box-shadow: 0 18px 55px rgba(2, 6, 23, 0.08);
            overflow: hidden;
          }

          @media (prefers-reduced-motion: no-preference) {
            .nc-enter {
              animation: ncIn 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
            }
            @keyframes ncIn {
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
            .nc-spin {
              animation: spin 0.9s linear infinite;
            }
            @keyframes spin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
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
            @keyframes shimmer {
              from {
                background-position: 200% 0;
              }
              to {
                background-position: -200% 0;
              }
            }
          }

          .nc-topbar {
            padding: 14px 14px 12px;
            border-bottom: 1px solid rgba(226, 232, 240, 1);
            background: linear-gradient(180deg, rgba(248, 250, 252, 1), rgba(255, 255, 255, 1));
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }

          .nc-kicker {
            color: rgba(100, 116, 139, 1);
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .nc-titleRow {
            margin-top: 6px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
          }

          .nc-title {
            font-size: 20px;
            font-weight: 900;
            color: rgba(15, 23, 42, 1);
            letter-spacing: -0.02em;
            margin: 0;
          }

          .nc-pill {
            display: inline-flex;
            align-items: center;
            height: 26px;
            padding: 0 10px;
            border-radius: 999px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: rgba(248, 250, 252, 1);
            color: rgba(51, 65, 85, 1);
            font-size: 12px;
            font-weight: 800;
          }

          .nc-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .nc-seg {
            display: inline-flex;
            border: 1px solid rgba(226, 232, 240, 1);
            border-radius: 999px;
            background: rgba(248, 250, 252, 1);
            padding: 4px;
          }

          .nc-segBtn {
            height: 30px;
            padding: 0 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
            color: rgba(51, 65, 85, 1);
            transition: background 140ms ease, color 140ms ease, transform 140ms ease;
          }

          .nc-segBtn:hover {
            background: rgba(241, 245, 249, 1);
          }

          .nc-segBtn.active {
            background: rgba(59, 130, 246, 1);
            color: white;
          }

          .nc-body {
            display: grid;
            grid-template-columns: 1fr 380px;
            min-height: 620px;
          }

          @media (max-width: 980px) {
            .nc-body {
              grid-template-columns: 1fr;
            }
            .nc-right {
              display: none;
            }
          }

          .nc-left {
            padding: 14px;
          }

          .nc-right {
            border-left: 1px solid rgba(226, 232, 240, 1);
            background: radial-gradient(circle at 40% 15%, rgba(59, 130, 246, 0.10), transparent 55%),
              rgba(248, 250, 252, 1);
            padding: 14px;
          }

          .nc-card {
            border: 1px solid rgba(226, 232, 240, 1);
            border-radius: 16px;
            background: white;
            overflow: hidden;
            box-shadow: 0 10px 26px rgba(2, 6, 23, 0.06);
            display: flex;
            flex-direction: column;
            min-height: 592px;
          }

          .nc-cardHeader {
            padding: 14px 14px 10px;
            border-bottom: 1px solid rgba(241, 245, 249, 1);
            background: rgba(248, 250, 252, 1);
          }

          .nc-cardTitle {
            color: rgba(15, 23, 42, 1);
            font-weight: 900;
          }

          .nc-cardSub {
            margin-top: 4px;
            color: rgba(100, 116, 139, 1);
            font-size: 12px;
            font-weight: 700;
          }

          .nc-cardContent {
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            flex: 1;
            min-height: 0;
          }

          .nc-chipBar {
            padding: 10px 14px;
            border-bottom: 1px solid rgba(241, 245, 249, 1);
            background: rgba(255, 255, 255, 1);
          }

          .nc-chipRow {
            display: flex;
            gap: 8px;
            overflow: auto;
            padding-bottom: 2px;
          }

          .nc-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            max-width: 280px;
            border-radius: 999px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: rgba(248, 250, 252, 1);
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 800;
            color: rgba(30, 41, 59, 1);
            transition: background 140ms ease, border-color 140ms ease;
            white-space: nowrap;
          }

          .nc-chip:hover {
            border-color: rgba(59, 130, 246, 0.35);
            background: rgba(241, 245, 249, 1);
          }

          .nc-chipAvatar {
            width: 22px;
            height: 22px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(59, 130, 246, 0.25);
            background: rgba(59, 130, 246, 0.10);
            color: rgba(30, 41, 59, 1);
            font-weight: 900;
            font-size: 11px;
            flex: 0 0 auto;
          }

          .nc-chipText {
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .nc-chipX {
            font-size: 16px;
            font-weight: 900;
            color: rgba(100, 116, 139, 1);
            margin-top: -1px;
          }

          .nc-search {
            padding: 12px 14px 10px;
            border-bottom: 1px solid rgba(241, 245, 249, 1);
            background: rgba(255, 255, 255, 1);
          }

          .nc-searchBox {
            height: 40px;
            border-radius: 12px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: rgba(248, 250, 252, 1);
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 10px;
            transition: box-shadow 140ms ease, border-color 140ms ease;
          }

          .nc-searchBox:focus-within {
            border-color: rgba(148, 163, 184, 1);
            box-shadow: 0 0 0 4px rgba(226, 232, 240, 1);
          }

          .nc-searchIcon {
            color: rgba(100, 116, 139, 1);
            font-weight: 900;
          }

          .nc-searchInput {
            flex: 1;
            height: 36px;
            outline: none;
            background: transparent;
            color: rgba(15, 23, 42, 1);
            font-weight: 800;
            font-size: 13px;
            min-width: 0;
          }

          .nc-clear {
            width: 28px;
            height: 28px;
            border-radius: 10px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: rgba(255, 255, 255, 1);
            color: rgba(100, 116, 139, 1);
            font-size: 18px;
            font-weight: 900;
            transition: background 140ms ease, color 140ms ease;
          }

          .nc-clear:disabled {
            opacity: 0.5;
          }

          .nc-clear:not(:disabled):hover {
            background: rgba(241, 245, 249, 1);
            color: rgba(15, 23, 42, 1);
          }

          .nc-searchMeta {
            margin-top: 8px;
            font-size: 11px;
            font-weight: 700;
            color: rgba(100, 116, 139, 1);
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .nc-dot {
            opacity: 0.6;
          }

          .nc-list {
            flex: 1;
            min-height: 0;
            overflow: auto;
          }

          .nc-row {
            width: 100%;
            text-align: left;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            background: white;
            transition: background 120ms ease, transform 120ms ease;
          }

          .nc-row:hover {
            background: rgba(248, 250, 252, 1);
          }

          .nc-row.active {
            background: rgba(59, 130, 246, 0.08);
          }

          .nc-rowSkeleton {
            pointer-events: none;
          }

          .nc-avatar {
            width: 44px;
            height: 44px;
            border-radius: 999px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: rgba(248, 250, 252, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            color: rgba(51, 65, 85, 1);
            flex: 0 0 auto;
          }

          .nc-avatar.active {
            border-color: rgba(59, 130, 246, 0.35);
            background: rgba(59, 130, 246, 0.12);
            color: rgba(15, 23, 42, 1);
          }

          .nc-rowMid {
            flex: 1;
            min-width: 0;
          }

          .nc-rowTitle {
            font-weight: 900;
            color: rgba(15, 23, 42, 1);
          }

          .nc-rowSub {
            margin-top: 3px;
            font-size: 12px;
            font-weight: 700;
            color: rgba(100, 116, 139, 1);
          }

          .nc-rowRight {
            width: 40px;
            display: flex;
            justify-content: flex-end;
            flex: 0 0 auto;
          }

          .nc-check {
            width: 22px;
            height: 22px;
            border-radius: 999px;
            border: 2px solid rgba(203, 213, 225, 1);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 900;
            background: transparent;
          }

          .nc-check.on {
            border-color: rgba(16, 185, 129, 1);
            background: rgba(16, 185, 129, 1);
          }

          .nc-radio {
            width: 18px;
            height: 18px;
            border-radius: 999px;
            border: 2px solid rgba(203, 213, 225, 1);
            position: relative;
          }

          .nc-radio.on {
            border-color: rgba(59, 130, 246, 1);
          }

          .nc-radio.on:after {
            content: '';
            position: absolute;
            inset: 4px;
            border-radius: 999px;
            background: rgba(59, 130, 246, 1);
          }

          .nc-miniLabel {
            margin-top: 2px;
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: rgba(100, 116, 139, 1);
          }

          .nc-participants {
            border-radius: 14px;
            border: 1px solid rgba(226, 232, 240, 1);
            overflow: hidden;
            background: rgba(248, 250, 252, 1);
          }

          .nc-participantRow {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            border-top: 1px solid rgba(226, 232, 240, 1);
            background: white;
          }

          .nc-participantRow:first-child {
            border-top: none;
          }

          .nc-iconBtn {
            width: 34px;
            height: 34px;
            border-radius: 12px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: rgba(248, 250, 252, 1);
            color: rgba(100, 116, 139, 1);
            font-size: 18px;
            font-weight: 900;
            transition: background 140ms ease, color 140ms ease;
          }

          .nc-iconBtn:hover {
            background: rgba(241, 245, 249, 1);
            color: rgba(15, 23, 42, 1);
          }

          .nc-bottom {
            padding: 12px 14px;
            border-top: 1px solid rgba(241, 245, 249, 1);
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            background: rgba(248, 250, 252, 1);
          }

          .nc-empty {
            padding: 28px 16px;
            text-align: center;
          }

          .nc-emptyTitle {
            color: rgba(15, 23, 42, 1);
            font-weight: 900;
          }

          .nc-emptySub {
            margin-top: 6px;
            color: rgba(100, 116, 139, 1);
            font-size: 12px;
            font-weight: 700;
          }

          .nc-preview {
            height: 100%;
            border-radius: 16px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: white;
            box-shadow: 0 10px 26px rgba(2, 6, 23, 0.06);
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .nc-previewIcon {
            width: 56px;
            height: 56px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(59, 130, 246, 0.12);
            border: 1px solid rgba(59, 130, 246, 0.25);
            font-weight: 900;
            color: rgba(15, 23, 42, 1);
            font-size: 26px;
          }

          .nc-previewTitle {
            font-weight: 900;
            color: rgba(15, 23, 42, 1);
            margin-top: 2px;
          }

          .nc-previewSub {
            font-size: 12px;
            font-weight: 700;
            color: rgba(100, 116, 139, 1);
          }

          .nc-previewCard {
            margin-top: 10px;
            border-radius: 14px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: rgba(248, 250, 252, 1);
            padding: 12px;
          }

          .nc-muted {
            font-size: 12px;
            font-weight: 700;
            color: rgba(100, 116, 139, 1);
            margin-top: 8px;
          }

          /* Toast */
          .nc-toast {
            position: fixed;
            right: 16px;
            bottom: 16px;
            z-index: 80;
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 260px;
            max-width: min(520px, calc(100vw - 32px));
            padding: 10px 12px;
            border-radius: 12px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: white;
            box-shadow: 0 18px 40px rgba(2, 6, 23, 0.16);
          }
          .nc-toastMsg {
            font-size: 13px;
            color: rgba(15, 23, 42, 1);
            line-height: 1.25;
            flex: 1;
            font-weight: 700;
          }
          .nc-toastX {
            width: 26px;
            height: 26px;
            border-radius: 8px;
            border: 1px solid rgba(226, 232, 240, 1);
            background: rgba(248, 250, 252, 1);
            color: rgba(100, 116, 139, 1);
          }
          .nc-toastDot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: rgba(148, 163, 184, 1);
          }
          .nc-toast-success .nc-toastDot {
            background: rgba(16, 185, 129, 1);
          }
          .nc-toast-error .nc-toastDot {
            background: rgba(239, 68, 68, 1);
          }
          .nc-toast-info .nc-toastDot {
            background: rgba(59, 130, 246, 1);
          }
        `}</style>
      </div>
    </div>
  );
}
