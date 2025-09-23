const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

function initSocket(httpServer, { allowedOrigins }) {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const header = socket.handshake.headers['authorization'] || '';
      const authToken = socket.handshake.auth?.token || header.replace(/^Bearer\s+/i, '');
      if (!authToken) return next(new Error('unauthorized'));
      const payload = jwt.verify(authToken, process.env.JWT_SECRET || 'secret');
      socket.user = { id: payload.user_id, role: payload.role, token: authToken };
      return next();
    } catch (e) {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // Join personal room for per-user events (e.g., unread invalidation)
    if (socket.user?.id) socket.join(`user:${socket.user.id}`);

    socket.on('issue:join', ({ issueToken }) => {
      if (!issueToken) return;
      socket.join(`issue:${issueToken}`);
    });

    socket.on('issue:leave', ({ issueToken }) => {
      if (!issueToken) return;
      socket.leave(`issue:${issueToken}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };
