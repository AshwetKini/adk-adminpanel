// src/app/tenants/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { tenantApi } from '@/lib/api';
import type { Tenant } from '@/types/tenant';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    key: '',
    name: '',
    adminEmail: '',
    adminPassword: '',
    adminFullName: '',
  });

  async function loadTenants() {
    try {
      setLoading(true);
      setError('');
      const data = await tenantApi.all();
      setTenants(
        data.map((t: any) => ({
          id: t._id?.toString?.() ?? t.id,
          key: t.key,
          name: t.name,
          isActive: t.isActive,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e.message ||
          'Failed to load tenants',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.key.trim() ||
      !form.name.trim() ||
      !form.adminEmail.trim() ||
      !form.adminPassword.trim() ||
      !form.adminFullName.trim()
    ) {
      setError('All fields are required');
      return;
    }

    try {
      setCreating(true);
      setError('');
      await tenantApi.provision({
        key: form.key.trim(),
        name: form.name.trim(),
        isActive: true,
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
        adminFullName: form.adminFullName.trim(),
      });
      setForm({
        key: '',
        name: '',
        adminEmail: '',
        adminPassword: '',
        adminFullName: '',
      });
      await loadTenants();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e.message ||
          'Failed to create tenant',
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Tenants</h1>

      <section className="max-w-xl border border-gray-200 rounded p-4 space-y-3">
        <h2 className="font-medium text-lg">Provision Tenant</h2>
        <form onSubmit={onCreate} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Key (URL safe)</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.key}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, key: e.target.value }))
              }
              placeholder="e.g. acme-hr"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Tenant Name</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="ACME HR"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Admin Email</label>
            <input
              type="email"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.adminEmail}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, adminEmail: e.target.value }))
              }
              placeholder="admin@acme-hr.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Admin Password</label>
            <input
              type="password"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.adminPassword}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  adminPassword: e.target.value,
                }))
              }
              placeholder="StrongPassword123!"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Admin Full Name</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.adminFullName}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  adminFullName: e.target.value,
                }))
              }
              placeholder="ACME Admin"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
          >
            {creating ? 'Provisioning…' : 'Provision Tenant'}
          </button>
        </form>
      </section>

      {loading && <p>Loading tenants...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!loading && !error && (
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left">Key</th>
              <th className="border px-3 py-2 text-left">Name</th>
              <th className="border px-3 py-2 text-left">Active</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td className="border px-3 py-2">{t.key}</td>
                <td className="border px-3 py-2">{t.name}</td>
                <td className="border px-3 py-2">
                  {t.isActive ? 'Yes' : 'No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

