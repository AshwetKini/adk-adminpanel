// src/lib/chatSocket.ts
import { io, type Socket } from 'socket.io-client';
import { getLocalAccess } from './tokens';

const apiUrl = process.env.NEXT_PUBLIC_API_URL; // usually http://host:3000/api (used by axios)
const tenantKey = process.env.NEXT_PUBLIC_TENANT_KEY;

let socketRef: Socket | null = null;
let lastToken: string | null = null;

function socketBaseUrl() {
  if (!apiUrl) throw new Error('NEXT_PUBLIC_API_URL is missing');

  // Important: socket namespace is served at server root: http://host:3000/chat
  // but axios baseURL is typically http://host:3000/api. [file:166][file:120]
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

      // Your backend gateway supports auth.token + auth.tenantKey for web clients. [file:77]
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

export function disconnectChatSocket() {
  if (!socketRef) return;
  socketRef.disconnect();
  socketRef = null;
  lastToken = null;
}
