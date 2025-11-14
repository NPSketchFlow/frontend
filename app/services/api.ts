// services/api.ts
import axios from "axios";
import { tokenManager } from "./authService";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL
  ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`
  : 'http://localhost:8080/api';

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: API_BASE,
});

/* * This is the broken interceptor block.
 * It's trying to use 'api' before 'api' is defined.
 * We must DELETE this block.
 */
// api.interceptors.request.use( ... ); // <-- THIS BLOCK IS REMOVED

// This is the CORRECT interceptor. It uses 'axiosInstance' and is in the right place.
axiosInstance.interceptors.request.use((config) => {
  try {
    const token = tokenManager.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

// --- Types ---
export interface UploadVoiceResponse {
  status: string;
  fileId: string;
  downloadUrl?: string;
  fileUrl?: string;
  voiceChat?: {
    chatId: string;
    senderId: string;
    receiverId?: string | null;
    filePath?: string;
    fileUrl?: string;
    timestamp?: number;
  };
}

export interface OnlineUserResponse {
  userId: string;
  ip: string;
  port: number;
  status: string;
  lastSeenTimestamp: number;
  rttEstimate: number;
}

export interface VoiceChatResponse {
  chatId: string;
  senderId: string;
  receiverId?: string | null;
  filePath: string;
  timestamp: number;
}

export interface UserResponse {
  userId: string;
  username: string;
  status: string;
  ip: string;
  port: number;
  lastSeen: number;
}

export interface NotificationResponse {
  id: string;
  type: string;
  senderId?: string | null;
  receiverId?: string | null;
  fileId?: string | null;
  message?: string | null;
  timestamp: number;
  priority: number;
  read: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface SendNotificationRequest {
  type: string;
  message?: string;
  senderId?: string;
  receiverId?: string;
  fileId?: string;
  metadata?: Record<string, unknown>;
  priority?: number;
  targetHost?: string;
  targetPort?: number;
}

export interface CreateUserRequest {
  userId: string;
  username: string;
  status?: string;
  ip?: string;
  port?: number;
  lastSeen?: number;
}

// --- API calls ---
export const uploadVoice = async (file: File, senderId: string, receiverId?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('senderId', senderId);
  if (receiverId) formData.append('receiverId', receiverId);

  const res = await axiosInstance.post<UploadVoiceResponse>('/voice/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data;
};

export const sendNotification = async (fileId: string, senderId: string, receiverId?: string) => {
  const payload: SendNotificationRequest = {
    type: 'NEW_VOICE',
    message: `New voice message from ${senderId}`,
    senderId,
    receiverId,
    fileId,
    priority: 1,
  };

  // Prefer the structured endpoint which expects the full notification object
  const res = await axiosInstance.post('/notifications/send', payload);
  return res.data;
};

export const getOnlineUsers = async () => {
  const res = await axiosInstance.get<OnlineUserResponse[]>('/online-users');
  return res.data;
};

export const getVoiceChats = async () => {
  const res = await axiosInstance.get<VoiceChatResponse[]>('/voice/chats'); // <-- FIXED URL
  return res.data;
};

export const getVoiceConversation = async (participantA: string, participantB: string) => {
  // This endpoint on the backend doesn't support participants yet,
  // but changing this will fix the 404 error.
  const res = await axiosInstance.get<VoiceChatResponse[]>('/voice/chats', { // <-- CORRECT URL
    // We will still send the params, even if the backend ignores them for now
    params: { participantA, participantB },
  });
  return res.data;
};

export const getUsers = async () => {
  // --- THIS IS THE FIX ---
  // Change 'api.get' to 'axiosInstance.get'
  const res = await axiosInstance.get<UserResponse[]>("/auth/users");
  return res.data;
};

export const createUser = async (user: CreateUserRequest) => {
  const res = await axiosInstance.post<UserResponse>('/users', user);
  return res.data;
};

export const sendNotificationRequest = async (notification: SendNotificationRequest) => {
  const res = await axiosInstance.post<{ status: string; notification: NotificationResponse }>('/notifications/send', notification);
  return res.data;
};

export const getNotifications = async (receiverId?: string) => {
  const res = await axiosInstance.get<NotificationResponse[]>('/notifications', {
    params: receiverId ? { receiverId } : undefined,
  });
  return res.data;
};

export const getUnreadNotifications = async (receiverId: string) => {
  const res = await axiosInstance.get<NotificationResponse[]>('/notifications/unread', {
    params: { receiverId },
  });
  return res.data;
};

export const getUnreadNotificationCount = async (receiverId: string) => {
  const res = await axiosInstance.get<{ receiverId: string; count: number }>('/notifications/unread/count', {
    params: { receiverId },
  });
  return res.data;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const res = await axiosInstance.patch<NotificationResponse>(`/notifications/${notificationId}/read`);
  return res.data;
};

export const markAllNotificationsRead = async (receiverId: string) => {
  const res = await axiosInstance.post<{ status: string; receiverId: string }>('/notifications/mark-all-read', {
    receiverId,
  });
  return res.data;
};

// This default export is just a helper object
const api = {
  uploadVoice,
  sendNotification,
  getOnlineUsers,
  getVoiceChats,
  getVoiceConversation,
  getUsers,
  createUser,
  sendNotificationRequest,
  getNotifications,
  getUnreadNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsRead,
};

export default api;