// Whiteboard Backend Service
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

export interface SessionData {
  sessionId: string;
  name: string;
  createdBy: string;
  createdAt: string;
  shareLink?: string;
  activeUsers?: number;
  isActive?: boolean;
}

export interface DrawingAction {
  actionId?: string;
  sessionId?: string;
  userId: string;
  tool: string;
  color: string;
  actionType: string;
  coordinates: {
    points?: { x: number; y: number }[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
  };
  properties?: {
    lineWidth?: number;
    isEraser?: boolean;
  };
  timestamp?: string | number; // ISO 8601 string (e.g., "2025-11-11T12:48:30.781") or Unix timestamp
}

export interface WebSocketMessage {
  type: 'JOIN' | 'DRAW' | 'CLEAR' | 'CURSOR_MOVE' | 'TOOL_CHANGE' | 'LEAVE' | 'USER_JOINED' | 'USER_LEFT';
  userId: string;
  username?: string;
  avatar?: string;
  tool?: string;
  color?: string;
  coordinates?: {
    points?: { x: number; y: number }[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
  };
  position?: { x: number; y: number };
  timestamp?: string | number; // ISO 8601 string or Unix timestamp in milliseconds
}

// Session Management
export const whiteboardAPI = {
  // Create new session
  createSession: async (name: string, userId: string): Promise<SessionData> => {
    const response = await fetch(`${BACKEND_URL}/api/whiteboard/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        createdBy: userId,
        maxUsers: 50,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return await response.json();
  },

  // Get session details
  getSession: async (sessionId: string): Promise<SessionData> => {
    const response = await fetch(`${BACKEND_URL}/api/whiteboard/sessions/${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return await response.json();
  },

  // Get all sessions
  getAllSessions: async (): Promise<SessionData[]> => {
    const response = await fetch(`${BACKEND_URL}/api/whiteboard/sessions`);

    if (!response.ok) {
      throw new Error(`Failed to get sessions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.sessions || [];
  },

  // Get active users
  getActiveUsers: async (sessionId: string) => {
    const response = await fetch(`${BACKEND_URL}/api/whiteboard/sessions/${sessionId}/users`);

    if (!response.ok) {
      throw new Error(`Failed to get active users: ${response.statusText}`);
    }

    const data = await response.json();
    return data.users || [];
  },

  // Delete session
  deleteSession: async (sessionId: string): Promise<void> => {
    const response = await fetch(`${BACKEND_URL}/api/whiteboard/sessions/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.statusText}`);
    }
  },

  // Save drawing action
  saveDrawingAction: async (sessionId: string, action: DrawingAction): Promise<any> => {
    const response = await fetch(`${BACKEND_URL}/api/whiteboard/sessions/${sessionId}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action),
    });

    if (!response.ok) {
      throw new Error(`Failed to save drawing action: ${response.statusText}`);
    }

    return await response.json();
  },

  // Get drawing history
  getDrawingHistory: async (sessionId: string, page = 0, size = 100): Promise<DrawingAction[]> => {
    const response = await fetch(
      `${BACKEND_URL}/api/whiteboard/sessions/${sessionId}/actions?page=${page}&size=${size}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get drawing history: ${response.statusText}`);
    }

    const data = await response.json();
    return data.actions || [];
  },

  // Get all drawing actions
  getAllDrawingActions: async (sessionId: string): Promise<DrawingAction[]> => {
    const response = await fetch(`${BACKEND_URL}/api/whiteboard/sessions/${sessionId}/actions/all`);

    if (!response.ok) {
      throw new Error(`Failed to get all drawing actions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.actions || [];
  },

  // Clear canvas
  clearCanvas: async (sessionId: string): Promise<void> => {
    const response = await fetch(`${BACKEND_URL}/api/whiteboard/sessions/${sessionId}/actions`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to clear canvas: ${response.statusText}`);
    }
  },

  // Save snapshot
  saveSnapshot: async (sessionId: string, name: string, userId: string, imageBlob: Blob): Promise<any> => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('createdBy', userId);
    formData.append('image', imageBlob, 'snapshot.png');

    const response = await fetch(`${BACKEND_URL}/api/whiteboard/sessions/${sessionId}/snapshots`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to save snapshot: ${response.statusText}`);
    }

    return await response.json();
  },

  // Get snapshots
  getSnapshots: async (sessionId: string): Promise<any[]> => {
    const response = await fetch(`${BACKEND_URL}/api/whiteboard/sessions/${sessionId}/snapshots`);

    if (!response.ok) {
      throw new Error(`Failed to get snapshots: ${response.statusText}`);
    }

    const data = await response.json();
    return data.snapshots || [];
  },

  // Health check
  healthCheck: async (): Promise<any> => {
    const response = await fetch(`${BACKEND_URL}/api/whiteboard/monitor/health`);

    if (!response.ok) {
      throw new Error(`Backend health check failed: ${response.statusText}`);
    }

    return await response.json();
  },
};

// WebSocket Manager Class
export class WhiteboardWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private userId: string;
  private username: string;
  private avatar: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();

  constructor(sessionId: string, userId: string, username: string, avatar: string) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.username = username;
    this.avatar = avatar;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${WS_URL}/api/whiteboard/sessions/${this.sessionId}/ws`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.reconnectAttempts = 0;

          // Send JOIN message
          this.sendMessage({
            type: 'JOIN',
            userId: this.userId,
            username: this.username,
            avatar: this.avatar,
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    } else {
      console.log('Unhandled message type:', message.type, message);
    }
  }

  on(messageType: string, handler: (message: WebSocketMessage) => void) {
    this.messageHandlers.set(messageType, handler);
  }

  sendMessage(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not open. Cannot send message:', message);
    }
  }

  draw(tool: string, color: string, coordinates: any) {
    this.sendMessage({
      type: 'DRAW',
      userId: this.userId,
      tool,
      color,
      coordinates,
    });
  }

  clear() {
    this.sendMessage({
      type: 'CLEAR',
      userId: this.userId,
    });
  }

  updateCursor(x: number, y: number) {
    this.sendMessage({
      type: 'CURSOR_MOVE',
      userId: this.userId,
      position: { x, y },
    });
  }

  changeTool(tool: string, color: string) {
    this.sendMessage({
      type: 'TOOL_CHANGE',
      userId: this.userId,
      tool,
      color,
    });
  }

  leave() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.sendMessage({
      type: 'LEAVE',
      userId: this.userId,
    });
    if (this.ws) {
      this.ws.close();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = 2000 * this.reconnectAttempts;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
