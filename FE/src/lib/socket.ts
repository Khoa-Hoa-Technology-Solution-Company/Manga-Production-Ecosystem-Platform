import { io, Socket } from 'socket.io-client';

const rawBaseUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const SOCKET_URL = rawBaseUrl.replace(/\/api\/?$/, '');

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<(data: unknown) => void>>();
  private rooms = new Set<string>();

  connect() {
    if (this.socket) return;
    
    const token = localStorage.getItem('mangaflow-token');
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'],
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
      for (const room of this.rooms) {
        this.socket?.emit('join:room', room);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    for (const [event, callbacks] of this.listeners) {
      for (const callback of callbacks) {
        this.socket.on(event, callback);
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.rooms.clear();
  }

  // Event listeners
  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const callbacks = this.listeners.get(event)!;
    if (callbacks.has(callback)) return;
    callbacks.add(callback);
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: unknown) => void) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      if (this.listeners.get(event)?.size === 0) this.listeners.delete(event);
      this.socket?.off(event, callback);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  emit(event: string, data: unknown) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  getSocket() {
    return this.socket;
  }

  // Room management
  joinRoom(room: string) {
    this.rooms.add(room);
    this.socket?.emit('join:room', room);
  }

  leaveRoom(room: string) {
    this.rooms.delete(room);
    this.socket?.emit('leave:room', room);
  }

  joinChapterRoom(chapterId: string) {
    this.joinRoom(`chapter:${chapterId}`);
  }

  leaveChapterRoom(chapterId: string) {
    this.leaveRoom(`chapter:${chapterId}`);
  }
}

export const socketService = new SocketService();
