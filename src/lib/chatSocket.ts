// src/lib/chatSocket.ts
import { io, type Socket } from 'socket.io-client';
import { getLocalAccess } from './tokens';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const tenantKey = process.env.NEXT_PUBLIC_TENANT_KEY;

let socketRef: Socket | null = null;
let lastToken: string | null = null;

function socketBaseUrl() {
  if (!apiUrl) throw new Error('NEXT_PUBLIC_API_URL is missing');
  // If apiUrl is ".../api", socket should connect to server root ".../chat"
  return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
}

export function getChatSocket(): Socket {
  if (!tenantKey) throw new Error('NEXT_PUBLIC_TENANT_KEY is missing');

  const token = getLocalAccess();
  if (!token) throw new Error('access_token missing');

  const base = socketBaseUrl();

  // Create once
  if (!socketRef) {
    socketRef = io(`${base}/chat`, {
      transports: ['websocket'],
      autoConnect: false,
      auth: { token, tenantKey },
    });

    socketRef.on('connect_error', (e: any) => {
      console.log('[chat] connect_error', e?.message || e);
    });
  }

  // Refresh auth if token changed (after login/refresh)
  if (lastToken !== token) {
    lastToken = token;
    socketRef.auth = { token, tenantKey };

    // Force reconnect so new auth is used immediately
    if (socketRef.connected) socketRef.disconnect();
  }

  if (!socketRef.connected) socketRef.connect();

  return socketRef;
}

/**
 * Call this after axios refresh updates localStorage tokens.
 * It forces the socket to re-auth using the latest access token.
 */
export function syncChatSocketAuth() {
  if (!socketRef) return;
  if (!tenantKey) return;

  const token = getLocalAccess();
  if (!token) return;

  lastToken = token;
  socketRef.auth = { token, tenantKey };

  if (socketRef.connected) socketRef.disconnect();
  socketRef.connect();
}

export function disconnectChatSocket() {
  if (!socketRef) return;
  socketRef.disconnect();
  socketRef = null;
  lastToken = null;
}
