import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:3000';
const SOCKET_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

const STORAGE_TOKEN_KEY = 'mangaflow-token';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  async connect() {
    if (this.socket) return;

    const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Mobile Socket connected');
      // Re-register any pending listeners
      for (const [event, callbacks] of this.listeners.entries()) {
        for (const cb of callbacks) {
          this.socket?.on(event, cb);
        }
      }
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Mobile Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Mobile Socket connection error:', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
