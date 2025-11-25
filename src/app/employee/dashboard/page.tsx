// src/app/(employee)/dashboard/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { authApi } from '@/lib/api';
import type { User } from '@/types/auth';

export default function EmployeeDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await authApi.profile();
        setUser(data);
      } catch {
        // ignore, middleware/login will handle redirect if needed
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div>Loading your dashboard...</div>;
  }

  if (!user) {
    return <div>Unable to load profile.</div>;
  }

  const departments =
    (user as any).departments && (user as any).departments.length > 0
      ? (user as any).departments.join(', ')
      : user.department || '-';

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Welcome, {user.fullName}</h2>

      <Card>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-600">Email:</span>{' '}
            <span className="text-sm">{user.email}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Role:</span>{' '}
            <span className="text-sm capitalize">{user.role}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">
              Departments:
            </span>{' '}
            <span className="text-sm">{departments}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
