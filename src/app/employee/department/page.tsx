// src/app/(employee)/department/page.tsx

'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { authApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import type { User } from '@/types/auth';

export default function MyDepartmentPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await authApi.profile();
        setUser(data);
      } catch {
        // ignore for now
      }
    })();
  }, []);

  const departments =
    (user as any)?.departments && (user as any)?.departments.length > 0
      ? (user as any).departments.join(', ')
      : user?.department || '-';

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">My Department</h2>
      <Card>
        <CardContent>
          <p className="text-sm text-gray-700">
            Your department access:{' '}
            <span className="font-medium">{departments}</span>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Later you can show department-specific resources, announcements, or
            colleagues here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
