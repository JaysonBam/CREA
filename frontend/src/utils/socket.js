import { io } from 'socket.io-client';

let socket;
let initialized = false;

function resolveAuthToken() {
  // Prefer JWT (used by API), fall back to legacy 'token' if present.
  let t = sessionStorage.getItem('JWT');
  if (!t) t = sessionStorage.getItem('token');
  return t;
}

export function getSocket() {
  if (socket) return socket;
  const base = import.meta.env.VITE_API_URL?.replace(/\/?$/, '') || window.location.origin;
  const token = resolveAuthToken();
  socket = io(base, {
    transports: ['websocket'],
    autoConnect: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    auth: token ? { token } : {},
  });

  if (!initialized) {
    initialized = true;
    socket.on('connect', () => {
      if (import.meta.env.DEV) console.info('[socket] connected', socket.id);
    });
    socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) console.warn('[socket] disconnected', reason);
    });
    socket.on('connect_error', (err) => {
      if (import.meta.env.DEV) console.error('[socket] connect_error', err.message);
      // If auth token might have changed (e.g., user logged in after initial load), try refreshing headers
      const fresh = resolveAuthToken();
      if (fresh && fresh !== token) {
        socket.auth = { token: fresh };
        socket.io.opts.extraHeaders = { Authorization: `Bearer ${fresh}` };
        socket.connect();
      }
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected && s.disconnected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
