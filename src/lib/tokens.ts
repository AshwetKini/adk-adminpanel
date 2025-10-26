// src/lib/tokens.ts
export function setLocalTokens(access: string, refresh: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearLocalTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function getLocalAccess(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function getLocalRefresh(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}
