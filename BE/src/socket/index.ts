import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyToken } from '../utils/jwt';

let io: Server;

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
    });

    socket.on('leave:room', (room: string) => {
      socket.leave(room);
      console.log(`🔌 Socket ${userId} left room: ${room}`);
    });

    socket.on('disconnect', () => {
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
