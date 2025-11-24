// src/app/(auth)/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { authApi } from '@/lib/api';
import { setLocalTokens } from '@/lib/tokens';
import type { LoginResponse } from '@/types/auth';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get('redirect'); // optional ?redirect=

  const [email, setEmail] = useState('superadmin@adksystem.com');
  const [password, setPassword] = useState('SuperAdmin@2025');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res: LoginResponse = await authApi.login(email, password);

      // Store tokens in localStorage
      setLocalTokens(res.access_token, res.refresh_token);

      // Also set httpOnly cookies for middleware
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: res.access_token,
          refresh_token: res.refresh_token,
        }),
      });

      // Role-based redirect
      const role = res.user.role;
      if (redirect) {
        // If a redirect is explicitly provided, respect it
        router.push(redirect);
      } else if (role === 'employee') {
        // Employee portal
        router.push('/employee/dashboard');
      } else {
        // Admins (superadmin/admin/platform-admin)
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">ADK System</h1>
            <p className="text-gray-600 mt-2">Admin / Employee Login</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error ? (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            ) : null}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
