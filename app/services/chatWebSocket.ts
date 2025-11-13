import { tokenManager } from './authService';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

// This must match the backend DTO
export interface WebSocketMessage {
  type: 'DM' | 'AUTH'; // <--- ADD 'AUTH'
  receiverUsername?: string; // <--- Make optional
  messageContent?: string; // <--- Make optional
  token?: string; // <--- ADD THIS
}

// This must match the DirectMessage.java model
export interface DirectMessage {
  id: string;
  senderUsername: string;
  receiverUsername: string;
  messageContent: string;
  timestamp: string;
  conversationId: string;
}

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, ((message: any) => void)[]> = new Map();

  connect(): Promise<void> {
  const token = tokenManager.getToken();
  // ... (reject if no token)

  return new Promise((resolve, reject) => {
    this.ws = new WebSocket(`${WS_URL}/api/chat/ws`);

    this.ws.onopen = () => {
      console.log('Chat WebSocket connected. Authenticating...');
      // This sends the AUTH message the backend is now waiting for
      this.ws?.send(JSON.stringify({
        type: 'AUTH',
        token: tokenManager.getToken()
      }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // This listener is waiting for the "AUTH_SUCCESS"
      if (data.type === 'AUTH_SUCCESS') {
        console.log('Chat WebSocket authenticated.');
        resolve();
        return;
      }

      // Handle incoming DMs
      this.emit('message', data);
    };
    // ... (rest of the method)
  });
}

  sendDM(receiverUsername: string, messageContent: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected.');
      return;
    }

    const message: WebSocketMessage = {
      type: 'DM',
      receiverUsername,
      messageContent,
    };
    this.ws.send(JSON.stringify(message));
  }

  on(eventName: string, callback: (data: any) => void) {
    if (!this.messageHandlers.has(eventName)) {
      this.messageHandlers.set(eventName, []);
    }
    this.messageHandlers.get(eventName)?.push(callback);
  }

  off(eventName: string, callback: (data: any) => void) {
    const handlers = this.messageHandlers.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(eventName: string, data: any) {
    this.messageHandlers.get(eventName)?.forEach(handler => handler(data));
  }

  disconnect() {
    this.ws?.close();
  }
}