import { io, type Socket } from 'socket.io-client';
import { getLocalAccess } from './tokens';

const apiBase = process.env.NEXT_PUBLIC_API_URL;
const tenantKey = process.env.NEXT_PUBLIC_TENANT_KEY;

let socketRef: Socket | null = null;

export function getChatSocket(): Socket {
  if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is missing');
  if (!tenantKey) throw new Error('NEXT_PUBLIC_TENANT_KEY is missing');

  const token = getLocalAccess();
  if (!token) throw new Error('access_token missing');

  if (!socketRef) {
    socketRef = io(`${apiBase}/chat`, {
      transports: ['websocket'],
      auth: { token, tenantKey },
    });
  }

  return socketRef;
}
