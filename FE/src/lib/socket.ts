import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const AUTH_TOKEN_KEY = 'mangaflow-token'

class SocketService {
  private socket: Socket | null = null

  connect() {
    if (this.socket) return

    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) return

    this.socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  on(event: string, callback: (data: unknown) => void) {
    this.socket?.on(event, callback)
  }

  off(event: string, callback?: (data: unknown) => void) {
    if (!this.socket) return
    if (callback) this.socket.off(event, callback)
    else this.socket.off(event)
  }

  joinChapterRoom(chapterId: string) {
    this.socket?.emit('join:room', `chapter:${chapterId}`)
  }

  leaveChapterRoom(chapterId: string) {
    this.socket?.emit('leave:room', `chapter:${chapterId}`)
  }
}

export const socketService = new SocketService()
