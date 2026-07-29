import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyToken } from '../utils/jwt';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Chapter } from '../models/Chapter';
import { Series } from '../models/Series';
import { Task } from '../models/Task';
import { canAccessChapterDocument } from '../middleware/chapterAccess';

let io: Server;
const roomMembers = new Map<string, Map<string, { userId: string; role: string }>>();
type RoomPermissions = { read: boolean; edit: boolean };

function getRoomMembers(room: string) {
  if (!roomMembers.has(room)) roomMembers.set(room, new Map());
  return roomMembers.get(room)!;
}

async function resolveRoomPermissions(socket: Socket, room: string): Promise<RoomPermissions> {
  const user = (socket as any).user;
  if (!user || typeof room !== 'string') return { read: false, edit: false };
  const chapterMatch = /^chapter:([a-f\d]{24})$/i.exec(room);
  if (chapterMatch) {
    const chapter = await Chapter.findById(chapterMatch[1]).select('seriesId mangakaId collaborators status');
    const series = chapter ? await Series.findById(chapter.seriesId).select('status editorId editorStatus mangakaId') : null;
    if (!chapter || !series) return { read: false, edit: false };
    const documentPermissions = {
      read: canAccessChapterDocument(chapter, series, user, 'read'),
      edit: canAccessChapterDocument(chapter, series, user, 'edit'),
    };
    if (documentPermissions.read && documentPermissions.edit) return documentPermissions;
    const assignedAssistant = user.role === 'assistant'
      && Boolean(await Task.exists({ chapterId: chapter._id, assignedTo: user._id }));
    return {
      read: documentPermissions.read || assignedAssistant,
      edit: documentPermissions.edit || assignedAssistant,
    };
  }
  const seriesMatch = /^series:([a-f\d]{24})$/i.exec(room);
  if (seriesMatch) {
    const series = await Series.findById(seriesMatch[1]).select('status mangakaId editorId editorStatus');
    if (!series) return { read: false, edit: false };
    const id = String(user._id);
    const privileged = String(series.mangakaId) === id
      || (user.role === 'editor' && String(series.editorId) === id && series.editorStatus === 'accepted')
      || user.role === 'editorial_board';
    const permitted = privileged || ['Active', 'Completed'].includes(String(series.status));
    return { read: permitted, edit: permitted };
  }
  return { read: false, edit: false };
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
      if (!mongoose.Types.ObjectId.isValid(String(payload.userId))) return next(new Error('Invalid token'));
      const user = await User.findById(payload.userId).select('_id role isActive');
      if (!user || user.isActive === false) return next(new Error('User is inactive'));
      (socket as any).user = { _id: String(user._id), role: user.role };
      (socket as any).userId = String(user._id);
      (socket as any).userRole = user.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const roomPermissions = new Map<string, RoomPermissions>();
    const userRoom = `user:${userId}`;
    const wasOnline = io.sockets.adapter.rooms.has(userRoom) && io.sockets.adapter.rooms.get(userRoom)!.size > 0;

    console.log(`🔌 Socket connected: ${userId}`);

    // Join user-specific room for targeted notifications
    socket.join(userRoom);

    // If this was the first connection, broadcast online status
    if (!wasOnline) {
      socket.broadcast.emit('user:status', { userId, status: 'online' });
    }

    // Join role-based room
    const role = (socket as any).userRole;
    socket.join(`role:${role}`);

    socket.on('join:room', async (room: string) => {
      const permissions = await resolveRoomPermissions(socket, room);
      if (!permissions.read) {
        socket.emit('room:error', { room, error: 'You do not have access to this room.' });
        return;
      }
      socket.join(room);
      roomPermissions.set(room, permissions);
      console.log(`🔌 Socket ${userId} joined room: ${room}`);
      getRoomMembers(room).set(socket.id, { userId, role });
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
      roomPermissions.delete(room);
      console.log(`🔌 Socket ${userId} left room: ${room}`);
      getRoomMembers(room).delete(socket.id);
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
      if (!room || !socket.rooms.has(room) || !roomPermissions.get(room)?.read) return;
      socket.to(room).emit('cursor:move', {
        userId,
        role,
        ...payload,
      });
    });

    socket.on('document:update', ({ room, payload }: { room: string; payload: any }) => {
      if (!room || !socket.rooms.has(room) || !roomPermissions.get(room)?.edit) return;
      socket.to(room).emit('document:update', {
        userId,
        role,
        ...payload,
      });
    });

    socket.on('object:sync', ({ room, payload }: { room: string; payload: any }) => {
      if (!room || !socket.rooms.has(room) || !roomPermissions.get(room)?.edit) return;
      socket.to(room).emit('object:sync', {
        userId,
        role,
        ...payload,
      });
    });

    socket.on('object:focus', ({ room, objectId, action }: { room: string; objectId: string; action: 'focus' | 'blur' }) => {
      if (!objectId || !room || !socket.rooms.has(room) || !roomPermissions.get(room)?.edit) return;
      socket.to(room).emit('object:focus', {
        userId,
        role,
        objectId,
        action,
      });
    });

    socket.on('object:lock', ({ room, objectId, action }: { room: string; objectId: string; action: 'lock' | 'unlock' }) => {
      if (!objectId || !room || !socket.rooms.has(room) || !roomPermissions.get(room)?.edit) return;
      socket.to(room).emit('object:lock', {
        userId,
        role,
        objectId,
        action,
      });
    });

    socket.on('disconnect', () => {
      roomPermissions.clear();
      for (const [room, members] of roomMembers.entries()) {
        if (members.has(socket.id)) {
          members.delete(socket.id);
          io.to(room).emit('presence:list', {
            room,
            members: Array.from(members.values()),
          });
        }
      }
      
      // If no sockets left in the user-specific room, they are offline
      const activeRoom = io.sockets.adapter.rooms.get(userRoom);
      if (!activeRoom || activeRoom.size === 0) {
        socket.broadcast.emit('user:status', { userId, status: 'offline' });
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

export function isUserOnline(userId: string): boolean {
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(`user:${userId}`);
  return !!(room && room.size > 0);
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
