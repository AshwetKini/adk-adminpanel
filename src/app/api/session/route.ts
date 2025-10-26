// src/app/api/session/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = await req.json();
  const res = NextResponse.json({ ok: true });

  // Access token cookie (~15m)
  res.cookies.set('access_token', access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 15,
  });

  // Refresh token cookie (~7d)
  res.cookies.set('refresh_token', refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('access_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
