import { io, Socket } from 'socket.io-client'

class WebSocketService {
  private socket: Socket | null = null

  connect(): Socket {
    if (!this.socket) {
      const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      this.socket = io(wsUrl, {
        transports: ['websocket'],
      })

      this.socket.on('connect', () => {
        console.log('WebSocket connected')
      })

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected')
      })
    }

    return this.socket
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  subscribe(symbols: string[]): void {
    if (this.socket) {
      this.socket.emit('subscribe', symbols)
    }
  }

  unsubscribe(symbols: string[]): void {
    if (this.socket) {
      this.socket.emit('unsubscribe', symbols)
    }
  }
}

export default new WebSocketService()
