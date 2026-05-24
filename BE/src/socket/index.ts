import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyToken } from '../utils/jwt';

let io: Server;
const roomMembers = new Map<string, Map<string, { userId: string; role: string }>>();

function getRoomMembers(room: string) {
  if (!roomMembers.has(room)) roomMembers.set(room, new Map());
  return roomMembers.get(room)!;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const payload = verifyToken(token as string);
      (socket as any).userId = payload.userId;
      (socket as any).userRole = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`🔌 Socket connected: ${userId}`);

    // Join user-specific room for targeted notifications
    socket.join(`user:${userId}`);

    // Join role-based room
    const role = (socket as any).userRole;
    socket.join(`role:${role}`);

    socket.on('join:room', (room: string) => {
      socket.join(room);
      console.log(`🔌 Socket ${userId} joined room: ${room}`);
      getRoomMembers(room).set(userId, { userId, role });
      socket.to(room).emit('presence:joined', {
        userId,
        role,
      });
      io.to(room).emit('presence:list', {
        room,
        members: Array.from(getRoomMembers(room).values()),
      });
    });

    socket.on('leave:room', (room: string) => {
      socket.leave(room);
      console.log(`🔌 Socket ${userId} left room: ${room}`);
      getRoomMembers(room).delete(userId);
      socket.to(room).emit('presence:left', {
        userId,
        role,
      });
      io.to(room).emit('presence:list', {
        room,
        members: Array.from(getRoomMembers(room).values()),
      });
    });

    socket.on('cursor:move', ({ room, payload }: { room: string; payload: any }) => {
      if (!room) return;
      socket.to(room).emit('cursor:move', {
        userId,
        role,
        ...payload,
      });
    });

    socket.on('document:update', ({ room, payload }: { room: string; payload: any }) => {
      if (!room) return;
      socket.to(room).emit('document:update', {
        userId,
        role,
        ...payload,
      });
    });

    socket.on('object:sync', ({ room, payload }: { room: string; payload: any }) => {
      if (!room) return;
      socket.to(room).emit('object:sync', {
        userId,
        role,
        ...payload,
      });
    });

    socket.on('object:focus', ({ room, objectId, action }: { room: string; objectId: string; action: 'focus' | 'blur' }) => {
      if (!room || !objectId) return;
      socket.to(room).emit('object:focus', {
        userId,
        role,
        objectId,
        action,
      });
    });

    socket.on('object:lock', ({ room, objectId, action }: { room: string; objectId: string; action: 'lock' | 'unlock' }) => {
      if (!room || !objectId) return;
      socket.to(room).emit('object:lock', {
        userId,
        role,
        objectId,
        action,
      });
    });

    socket.on('disconnect', () => {
      for (const [room, members] of roomMembers.entries()) {
        if (members.has(userId)) {
          members.delete(userId);
          io.to(room).emit('presence:list', {
            room,
            members: Array.from(members.values()),
          });
        }
      }
      console.log(`🔌 Socket disconnected: ${userId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

/**
 * Emit event to a specific user
 */
export function emitToUser(userId: string, event: string, data: any): void {
  getIO().to(`user:${userId}`).emit(event, data);
}

/**
 * Emit event to all users with a specific role
 */
export function emitToRole(role: string, event: string, data: any): void {
  getIO().to(`role:${role}`).emit(event, data);
}

/**
 * Emit event to a specific room
 */
export function emitToRoom(room: string, event: string, data: any): void {
  getIO().to(room).emit(event, data);
}
