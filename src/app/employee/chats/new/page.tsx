'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chatApi, type ChatUserRef } from '@/lib/api';
import { customerApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Mode = 'dm' | 'group';
type Step = 'pick' | 'subject';

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
  const debounceRef = useRef<any>(null);

  const selectedIds = useMemo(() => new Set(selected.map((x) => String(x.id))), [selected]);

  async function loadCustomers(search: string) {
    setLoading(true);
    try {
      const res = await customerApi.all({ search: search.trim() || undefined, page: 1, limit: 50 });
      setItems(Array.isArray(res?.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers('');
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCustomers(query), 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    // reset on mode change (same as mobile). [file:127]
    setStep('pick');
    setQuery('');
    setSelected([]);
    setGroupName('');
  }, [mode]);

  function togglePick(c: any) {
    const id = String(c?.id ?? c?._id ?? '');
    if (!id) return;

    if (mode === 'dm') {
      setSelected([c]);
      return;
    }

    setSelected((prev) => {
      const exists = prev.some((x: any) => String(x.id ?? x._id) === id);
      if (exists) return prev.filter((x: any) => String(x.id ?? x._id) !== id);
      return [...prev, c];
    });
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

      // Backend makes 1-to-1 chats idempotent when there are exactly 2 members. [file:76]
      const g = await chatApi.createGroup({
        name: `Support - ${customer.customerId || customer.fullName || 'Customer'}`,
        members,
      });

      router.replace(`/employee/chats/${String(g._id)}?title=${encodeURIComponent(g.name || 'Chat')}`);
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
      router.replace(`/employee/chats/${String(g._id)}?title=${encodeURIComponent(g.name || 'Group')}`);
    } finally {
      setCreating(false);
    }
  }

  const canDM = mode === 'dm' && selected.length === 1 && !creating;
  const canNext = mode === 'group' && step === 'pick' && selected.length >= 2 && !creating;
  const canCreateGroup = mode === 'group' && step === 'subject' && selected.length >= 2 && groupName.trim().length >= 3 && !creating;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">{mode === 'dm' ? 'Select contact' : 'New group'}</div>
          <div className="text-sm text-gray-600">
            {mode === 'dm' ? `${items.length} contacts` : step === 'pick' ? `${selected.length} selected` : `${selected.length} participants`}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant={mode === 'dm' ? 'primary' : 'secondary'} onClick={() => setMode('dm')}>Message</Button>
          <Button variant={mode === 'group' ? 'primary' : 'secondary'} onClick={() => setMode('group')}>Group</Button>
        </div>
      </div>

      {mode === 'group' && step === 'subject' ? (
        <div className="mt-4 space-y-3">
          <Input label="Group subject" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          <div className="text-sm text-gray-700 font-medium">Participants</div>
          <div className="border rounded p-3 space-y-1">
            {selected.map((c) => (
              <div key={String(c.id ?? c._id)} className="text-sm">
                {c.fullName || c.customerId || 'Customer'}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('pick')}>Back</Button>
            <Button onClick={createGroup} disabled={!canCreateGroup}>
              {creating ? 'Please wait…' : 'Create'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Search customers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button variant="secondary" onClick={() => setQuery('')}>Clear</Button>
          </div>

          {mode === 'group' && selected.length > 0 ? (
            <div className="mt-3 text-sm text-gray-700">Selected: {selected.length}</div>
          ) : null}

          <div className="mt-4 border rounded divide-y">
            {loading ? (
              <div className="p-3 text-sm text-gray-600">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-3 text-sm text-gray-600">No customers found.</div>
            ) : (
              items.map((c) => {
                const id = String(c.id ?? c._id);
                const active = selectedIds.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => togglePick(c)}
                    className={`w-full text-left p-3 hover:bg-gray-50 flex items-center justify-between ${active ? 'bg-blue-50' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.fullName || '—'}</div>
                      <div className="text-sm text-gray-600 truncate">
                        ID: {c.customerId || '—'} • Mobile: {c.mobileNumber || '—'}
                      </div>
                    </div>
                    <div className="w-10 text-right font-bold text-green-600">{mode === 'group' && active ? '✓' : ''}</div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            {mode === 'dm' ? (
              <Button onClick={createDM} disabled={!canDM}>
                {creating ? 'Please wait…' : 'Chat'}
              </Button>
            ) : step === 'pick' ? (
              <Button onClick={() => setStep('subject')} disabled={!canNext}>
                Next
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
