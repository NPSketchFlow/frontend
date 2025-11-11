// Whiteboard API Client - Handles all backend communication
import { whiteboardAPI, WhiteboardWebSocket, WebSocketMessage } from './whiteboardService';

export interface Point {
  x: number;
  y: number;
}

export interface Line {
  tool: string;
  color: string;
  eraser?: boolean;
  points?: Point[];
  start?: Point;
  end?: Point;
}

export interface ActiveUser {
  userId: string;
  username: string;
  avatar?: string;
}

export interface WhiteboardSession {
  sessionId: string;
  isConnected: boolean;
  activeUsers: ActiveUser[];
  lines: Line[];
}

// Session Manager
export class WhiteboardSessionManager {
  private sessionId: string = '';
  private userId: string;
  private username: string;
  private avatar: string;
  private ws: WhiteboardWebSocket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(userId: string, username: string) {
    this.userId = userId;
    this.username = username;
    this.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
  }

  // Initialize session and WebSocket connection
  async initialize(sessionName: string = 'Collaborative Whiteboard'): Promise<string> {
    try {
      // Check backend health
      await whiteboardAPI.healthCheck();
      console.log('✅ Backend is healthy');

      // Create session
      const session = await whiteboardAPI.createSession(sessionName, this.userId);
      this.sessionId = session.sessionId;
      console.log('✅ Session created:', this.sessionId);

      // Initialize WebSocket
      this.ws = new WhiteboardWebSocket(
        this.sessionId,
        this.userId,
        this.username,
        this.avatar
      );

      // Setup WebSocket handlers
      this.setupWebSocketHandlers();

      // Connect
      await this.ws.connect();
      console.log('✅ WebSocket connected');

      return this.sessionId;
    } catch (error) {
      console.error('❌ Failed to initialize session:', error);
      throw error;
    }
  }

  // Setup WebSocket message handlers
  private setupWebSocketHandlers() {
    if (!this.ws) return;

    this.ws.on('USER_JOINED', (message: WebSocketMessage) => {
      console.log('User joined:', message.username);
      if (message.userId !== this.userId) {
        const handler = this.messageHandlers.get('USER_JOINED');
        if (handler) {
          handler({
            userId: message.userId,
            username: message.username || 'Anonymous',
            avatar: message.avatar
          });
        }
      }
    });

    this.ws.on('USER_LEFT', (message: WebSocketMessage) => {
      console.log('User left:', message.userId);
      const handler = this.messageHandlers.get('USER_LEFT');
      if (handler) {
        handler({ userId: message.userId });
      }
    });

    this.ws.on('DRAW', (message: WebSocketMessage) => {
      if (message.userId !== this.userId && message.coordinates) {
        const handler = this.messageHandlers.get('DRAW');
        if (handler) {
          handler({
            tool: message.tool || 'pen',
            color: message.color || '#000000',
            coordinates: message.coordinates
          });
        }
      }
    });

    this.ws.on('CLEAR', (message: WebSocketMessage) => {
      if (message.userId !== this.userId) {
        const handler = this.messageHandlers.get('CLEAR');
        if (handler) {
          handler({});
        }
      }
    });
  }

  // Register event handlers
  on(event: string, handler: (data: any) => void) {
    this.messageHandlers.set(event, handler);
  }

  // Load drawing history
  async loadHistory(): Promise<Line[]> {
    try {
      const history = await whiteboardAPI.getAllDrawingActions(this.sessionId);
      console.log(`📜 Loaded ${history.length} drawing actions`);

      const lines: Line[] = [];
      history.forEach(action => {
        if (action.coordinates) {
          lines.push({
            tool: action.tool,
            color: action.color,
            eraser: action.properties?.isEraser,
            points: action.coordinates.points,
            start: action.coordinates.start,
            end: action.coordinates.end
          });
        }
      });

      return lines;
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  // Get active users
  async getActiveUsers(): Promise<ActiveUser[]> {
    try {
      const users = await whiteboardAPI.getActiveUsers(this.sessionId);
      return users;
    } catch (error) {
      console.error('Failed to get active users:', error);
      return [];
    }
  }

  // Send drawing action
  draw(tool: string, color: string, coordinates: any) {
    if (this.ws?.isConnected()) {
      this.ws.draw(tool, color, coordinates);
    }
  }

  // Clear canvas
  async clear() {
    if (this.ws?.isConnected()) {
      this.ws.clear();
    }

    // Also clear on backend
    try {
      await whiteboardAPI.clearCanvas(this.sessionId);
    } catch (error) {
      console.error('Failed to clear canvas on backend:', error);
    }
  }

  // Save snapshot
  async saveSnapshot(canvas: HTMLCanvasElement, snapshotName?: string): Promise<void> {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      });
    });

    const name = snapshotName || `Snapshot ${new Date().toLocaleString()}`;
    
    try {
      const result = await whiteboardAPI.saveSnapshot(
        this.sessionId,
        name,
        this.userId,
        blob
      );
      console.log('✅ Snapshot saved:', result.snapshotId);
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      throw error;
    }
  }

  // Get snapshots
  async getSnapshots() {
    try {
      return await whiteboardAPI.getSnapshots(this.sessionId);
    } catch (error) {
      console.error('Failed to get snapshots:', error);
      return [];
    }
  }

  // Download canvas as PNG
  downloadCanvas(canvas: HTMLCanvasElement, filename: string = 'collab-board.png') {
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
  }

  // Update cursor position
  updateCursor(x: number, y: number) {
    if (this.ws?.isConnected()) {
      this.ws.updateCursor(x, y);
    }
  }

  // Change tool
  changeTool(tool: string, color: string) {
    if (this.ws?.isConnected()) {
      this.ws.changeTool(tool, color);
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.ws?.isConnected() || false;
  }

  // Get session ID
  getSessionId(): string {
    return this.sessionId;
  }

  // Cleanup
  cleanup() {
    if (this.ws) {
      this.ws.leave();
      this.ws.disconnect();
    }
  }
}

// Helper function to generate user ID
export function generateUserId(): string {
  return `user-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to generate username
export function generateUsername(): string {
  return `User ${Math.floor(Math.random() * 1000)}`;
}

// Helper function to parse timestamp from backend
export function parseTimestamp(timestamp?: string | number): Date {
  if (!timestamp) return new Date();
  
  if (typeof timestamp === 'number') {
    // Unix timestamp in milliseconds
    return new Date(timestamp);
  } else {
    // ISO 8601 string (e.g., "2025-11-11T12:48:30.781" or "2025-11-11T12:48:30.781+05:30")
    return new Date(timestamp);
  }
}

// Helper function to format timestamp for display
export function formatTimestamp(timestamp?: string | number): string {
  const date = parseTimestamp(timestamp);
  return date.toLocaleString();
}
