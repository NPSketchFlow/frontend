// Type definitions for Voice Chat features

export type OnlineStatus = 'online' | 'away' | 'offline';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  status: OnlineStatus;
  latency?: number; // in ms
  lastSeen?: Date;
}

export interface VoiceMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId: string;
  audioUrl: string;
  audioBlob?: Blob;
  duration: number; // in seconds
  timestamp: Date;
  isOwn: boolean;
  isLoading?: boolean;
  downloadProgress?: number; // 0-100
  uploadProgress?: number; // 0-100
  mimeType?: string;
}

export interface Notification {
  id: string;
  type: 'voice' | 'user' | 'message' | 'system' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group';
  avatarUrl?: string;
  participants: string[]; // User IDs
  lastMessage?: VoiceMessage;
  lastMessageTime?: Date;
  unreadCount: number;
}

// UDP Packet Types
export interface UDPPacket {
  type: 'voice' | 'status' | 'ack' | 'ping' | 'notification';
  sequenceNumber: number;
  timestamp: number;
  payload: unknown;
  checksum?: string;
}

export interface VoicePacket extends UDPPacket {
  type: 'voice';
  payload: {
    messageId: string;
    chunkIndex: number;
    totalChunks: number;
    audioData: Uint8Array;
    senderId: string;
    receiverId: string;
  };
}

export interface StatusPacket extends UDPPacket {
  type: 'status';
  payload: {
    userId: string;
    status: OnlineStatus;
    latency?: number;
  };
}

export interface AckPacket extends UDPPacket {
  type: 'ack';
  payload: {
    acknowledgedSequence: number;
    messageId?: string;
  };
}

export interface PingPacket extends UDPPacket {
  type: 'ping';
  payload: {
    userId: string;
    timestamp: number;
  };
}

// Service Response Types
export interface UploadVoiceMessageResponse {
  success: boolean;
  messageId: string;
  chunksTotal: number;
  chunksSent: number;
  retransmissions?: number;
  error?: string;
}

export interface DownloadVoiceMessageResponse {
  success: boolean;
  audioBlob: Blob;
  chunksReceived: number;
  chunksTotal: number;
  packetLoss?: number;
  error?: string;
}

// Configuration Types
export interface UDPConfig {
  serverHost: string;
  serverPort: number;
  chunkSize: number; // bytes
  maxRetransmissions: number;
  timeout: number; // ms
  pingInterval: number; // ms
}

// Error Types
export class UDPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'UDPError';
  }
}
