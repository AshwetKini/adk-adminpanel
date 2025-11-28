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
  const redirect = sp.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res: LoginResponse = await authApi.login(email, password);

      setLocalTokens(res.access_token, res.refresh_token);

      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: res.access_token,
          refresh_token: res.refresh_token,
        }),
      });

      const role = res.user.role;

      if (redirect) {
        router.push(redirect);
      } else if (role === 'employee') {
        router.push('/employee/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">

      {/* Glow Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-[260px] h-[260px] bg-blue-500/40 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[260px] h-[260px] bg-purple-500/40 blur-[120px] rounded-full animate-pulse delay-200"></div>

      {/* Stylish Login Card */}
      <Card className="
        w-full max-w-md 
        bg-white/10 backdrop-blur-xl 
        border border-white/20 
        shadow-xl shadow-black/40 
        rounded-2xl p-2 
        animate-fadeIn
      ">

        <CardHeader className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            ADK System
          </h1>
          <p className="text-sm text-slate-300">Admin / Employee Login</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">

            {/* Error box (unchanged functionality) */}
            {error ? (
              <div className="bg-red-500/20 p-3 rounded-md text-red-200 text-sm border border-red-500/30">
                {error}
              </div>
            ) : null}

            {/* Email */}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/95 text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-600"
            />

            {/* Password */}
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/95 text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-600"
            />

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold shadow-md hover:shadow-blue-500/30 transition-all"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <p className="text-center text-xs text-slate-300 mt-2">
              © {new Date().getFullYear()} ADK System
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
