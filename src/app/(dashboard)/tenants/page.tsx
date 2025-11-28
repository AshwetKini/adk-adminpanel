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
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
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
          id: t.id ?? t._id?.toString?.(),
          _id: t._id?.toString?.() ?? t.id,
          key: t.key,
          name: t.name,
          isActive: t.isActive,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          adminEmail: t.adminEmail ?? null,
          adminFullName: t.adminFullName ?? null,
        })),
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to load tenants');
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
      const createdName = form.name;
      setForm({
        key: '',
        name: '',
        adminEmail: '',
        adminPassword: '',
        adminFullName: '',
      });
      setShowForm(false);
      setSuccessMessage(`Tenant "${createdName}" provisioned successfully!`);
      await loadTenants();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  }

  async function toggleTenantActive(t: Tenant & { _id?: string }) {
    const action = t.isActive ? 'disable' : 'enable';
    if (
      !window.confirm(
        `Are you sure you want to ${action} tenant "${t.name}" (${t.key})?`,
      )
    ) {
      return;
    }

    const id = t._id ?? t.id;
    setUpdatingId(id);
    setError('');
    try {
      const updated = await tenantApi.update(id, {
        isActive: !t.isActive,
      });

      setTenants((prev) =>
        prev.map((x: any) =>
          x._id === updated._id ||
          x.id === updated.id ||
          x.id === updated._id?.toString?.()
            ? {
                ...x,
                ...updated,
                id: updated.id ?? updated._id?.toString?.(),
                _id: updated._id?.toString?.() ?? updated.id,
              }
            : x,
        ),
      );
      setSuccessMessage(`Tenant "${t.name}" ${action}d successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${action} tenant`);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRenameKey(t: Tenant & { _id?: string }) {
    const id = t._id ?? t.id;

    const input = window.prompt(
      `Enter new tenant key for "${t.name}" (current: ${t.key}):`,
      t.key,
    );

    if (!input) return;

    const newKey = input.trim();
    if (!newKey || newKey === t.key) return;

    if (!/^[a-z0-9-]+$/.test(newKey)) {
      alert('Tenant key must contain only lowercase letters, numbers and hyphens.');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to change key from "${t.key}" to "${newKey}"?`,
      )
    ) {
      return;
    }

    setError('');
    setSuccessMessage('');
    try {
      const updated = await tenantApi.renameKey(id, newKey);

      setTenants((prev: any[]) =>
        prev.map((x: any) =>
          x._id === updated.id || x.id === updated.id
            ? { ...x, key: updated.key }
            : x,
        ),
      );

      setSuccessMessage(`Tenant key for "${t.name}" updated to "${newKey}".`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update tenant key');
    }
  }

  async function handleResetAdminPassword(t: Tenant & { _id?: string }) {
    const id = t._id ?? t.id;

    const newPassword = window.prompt(
      `Enter new admin password for tenant "${t.name}" (${t.key}):`,
    );

    if (!newPassword || !newPassword.trim()) {
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to reset the admin password for "${t.name}"?`,
      )
    ) {
      return;
    }

    setError('');
    setSuccessMessage('');
    try {
      await tenantApi.resetAdminPassword(id, newPassword.trim());
      setSuccessMessage(
        `Admin password for tenant "${t.name}" has been reset successfully.`,
      );
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Failed to reset tenant admin password',
      );
    }
  }

  async function handleDelete(id: string, tenantName: string) {
    setDeleting(id);
    try {
      await tenantApi.remove(id);
      setTenants((prev) => prev.filter((t: any) => t._id !== id && t.id !== id));
      setShowDeleteConfirm(null);
      setSuccessMessage(`Tenant "${tenantName}" deleted successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete tenant');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen bg-blue-100">
    <div className="w-full px-2 py-6 sm:px-6 lg:px-1 xl:px-7">

        <div className="mb-1">
          <h1 className="text-3xl font-semibold text-gray-900">Tenants</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and provision tenants
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 flex-shrink-0 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="ml-3 text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 flex-shrink-0 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Tenant
            </button>
          )}

          {showForm && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Provision New Tenant
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Create a new tenant with admin credentials
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setForm({
                        key: '',
                        name: '',
                        adminEmail: '',
                        adminPassword: '',
                        adminFullName: '',
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={onCreate} className="px-6 py-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="tenant-key"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Tenant Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="tenant-key"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.key}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, key: e.target.value }))
                      }
                      placeholder="e.g. acme-hr"
                      disabled={creating}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      URL-safe identifier for the tenant
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="tenant-name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Tenant Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="tenant-name"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="ACME HR"
                      disabled={creating}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Display name for the tenant
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Admin Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="admin-email"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label
                      htmlFor="admin-name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Admin Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="admin-name"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="admin-password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Admin Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="admin-password"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <p className="mt-1 text-xs text-gray-500">
                      Must be strong and secure
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setForm({
                        key: '',
                        name: '',
                        adminEmail: '',
                        adminPassword: '',
                        adminFullName: '',
                      });
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    {creating ? 'Provisioning...' : 'Provision Tenant'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    All Tenants
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {loading
                      ? 'Loading...'
                      : `${tenants.length} tenant${
                          tenants.length !== 1 ? 's' : ''
                        } total`}
                  </p>
                </div>
                <button
                  onClick={loadTenants}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  <svg
                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
                  <p className="text-sm text-gray-600">Loading tenants...</p>
                </div>
              </div>
            ) : tenants.length === 0 ? (
              <div className="py-16 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No tenants
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create your first tenant to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Key
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Admin Email
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Admin Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {tenants.map((t: any) => (
                      <tr key={t.id} className="transition-colors hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-900">
                            {t.key}
                          </code>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {t.name}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {t.adminEmail || '-'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {t.adminFullName || '-'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              t.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <svg
                              className={`mr-1.5 h-1.5 w-1.5 ${
                                t.isActive
                                  ? 'text-green-500'
                                  : 'text-gray-500'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 8 8"
                            >
                              <circle cx={4} cy={4} r={3} />
                            </svg>
                            {t.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant={t.isActive ? 'danger' : 'primary'}
                              size="sm"
                              disabled={updatingId === (t._id ?? t.id)}
                              onClick={() => toggleTenantActive(t)}
                            >
                              {updatingId === (t._id ?? t.id)
                                ? 'Updating...'
                                : t.isActive
                                ? 'Disable'
                                : 'Enable'}
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRenameKey(t)}
                            >
                              Change Key
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleResetAdminPassword(t)}
                            >
                              Reset
                            </Button>

                            {showDeleteConfirm === (t._id ?? t.id) ? (
                              <>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={deleting === (t._id ?? t.id)}
                                  onClick={() =>
                                    handleDelete(t._id ?? t.id, t.name)
                                  }
                                >
                                  {deleting === (t._id ?? t.id)
                                    ? 'Deleting...'
                                    : 'Confirm'}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    setShowDeleteConfirm(null)
                                  }
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  setShowDeleteConfirm(t._id ?? t.id)
                                }
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
