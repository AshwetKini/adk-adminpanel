// src/app/tenants/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { tenantApi } from '@/lib/api';
import type { Tenant } from '@/types/tenant';
import { Button } from '@/components/ui/Button';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
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
          _id: t._id?.toString?.() ?? t.id,
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
      setSuccessMessage('');
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
      setSuccessMessage(`Tenant "${form.name}" provisioned successfully!`);
      await loadTenants();
      setTimeout(() => setSuccessMessage(''), 5000);
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

  async function toggleTenantActive(t: Tenant) {
    const action = t.isActive ? 'disable' : 'enable';
    if (
      !window.confirm(
        `Are you sure you want to ${action} tenant "${t.name}" (${t.key})?`,
      )
    ) {
      return;
    }

    setUpdatingId(t._id);
    setError('');
    try {
      const updated = await tenantApi.update(t._id, {
        isActive: !t.isActive,
      });

      setTenants((prev) =>
        prev.map((x) =>
          x._id === updated._id
            ? {
                ...updated,
                id: updated._id?.toString?.() ?? updated.id,
                _id: updated._id?.toString?.() ?? updated.id,
              }
            : x,
        ),
      );
      setSuccessMessage(
        `Tenant "${t.name}" ${action}d successfully!`,
      );
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || `Failed to ${action} tenant`,
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Tenant Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage and provision tenants for your application
          </p>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm">
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm">
            <span className="font-medium">{error}</span>
          </div>
        )}

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl font-bold">+</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Provision New Tenant
              </h2>
              <p className="text-sm text-gray-600">
                Create a new tenant with admin credentials
              </p>
            </div>
          </div>

          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tenant Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.key}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, key: e.target.value }))
                  }
                  placeholder="e.g. acme-hr"
                  disabled={creating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL-safe identifier for the tenant
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tenant Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="ACME HR"
                  disabled={creating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Display name for the tenant
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Admin Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.adminEmail}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      adminEmail: e.target.value,
                    }))
                  }
                  placeholder="admin@acme-hr.com"
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Admin Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.adminFullName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      adminFullName: e.target.value,
                    }))
                  }
                  placeholder="ACME Administrator"
                  disabled={creating}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Admin Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.adminPassword}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      adminPassword: e.target.value,
                    }))
                  }
                  placeholder="StrongPassword123!"
                  disabled={creating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be strong and secure
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {creating ? 'Provisioning...' : 'Provision Tenant'}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Active Tenants
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {loading
                    ? 'Loading...'
                    : `${tenants.length} tenant${tenants.length !== 1 ? 's' : ''} total`}
                </p>
              </div>
              <button
                onClick={loadTenants}
                disabled={loading}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">Loading tenants...</p>
              </div>
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 font-medium">No tenants found</p>
              <p className="text-gray-500 text-sm mt-1">
                Create your first tenant using the form above
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {t.key}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {t.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            t.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              t.isActive ? 'bg-green-600' : 'bg-gray-600'
                            }`}
                          />
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant={t.isActive ? 'danger' : 'primary'}
                          size="sm"
                          disabled={updatingId === t._id}
                          onClick={() => toggleTenantActive(t)}
                        >
                          {updatingId === t._id
                            ? 'Updating...'
                            : t.isActive
                            ? 'Disable'
                            : 'Enable'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
