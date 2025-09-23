import { io } from 'socket.io-client';

let socket;

export function getSocket() {
  if (socket) return socket;
  const url = import.meta.env.VITE_API_URL?.replace(/\/?$/,'') || window.location.origin;
  const token = sessionStorage.getItem('JWT');
  socket = io(url, {
    transports: ['websocket'],
    autoConnect: false,
    withCredentials: true,
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    auth: token ? { token } : {},
  });
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
