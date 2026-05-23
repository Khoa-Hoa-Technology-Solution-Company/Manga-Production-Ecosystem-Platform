import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;

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
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event listeners
  on(event: string, callback: (data: unknown) => void) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  off(event: string, callback?: (data: unknown) => void) {
    if (this.socket) {
      if (callback) this.socket.off(event, callback);
      else this.socket.off(event);
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
    if (this.socket) {
      this.socket.emit('join:room', room);
    }
  }

  leaveRoom(room: string) {
    if (this.socket) {
      this.socket.emit('leave:room', room);
    }
  }

  joinChapterRoom(chapterId: string) {
    this.joinRoom(`chapter:${chapterId}`);
  }

  leaveChapterRoom(chapterId: string) {
    this.leaveRoom(`chapter:${chapterId}`);
  }
}

export const socketService = new SocketService();
