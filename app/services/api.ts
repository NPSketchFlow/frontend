// services/api.ts
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export interface UploadVoiceResponse {
  status: string;
  fileId: string;
  downloadUrl: string;
  voiceChat: {
    chatId: string;
    senderId: string;
    receiverId?: string | null;
    filePath: string;
    timestamp: number;
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

export const uploadVoice = async (file: File, senderId: string, receiverId?: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("senderId", senderId);
  if (receiverId) {
    formData.append("receiverId", receiverId);
  }

  const res = await api.post<UploadVoiceResponse>("/voice/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const sendNotification = async (fileId: string, senderId: string) => {
  const payload = {
    type: "NEW_VOICE",
    payload: { fileId, senderId },
    priority: 1,
  };
  const res = await api.post("/notifications/send", payload);
  return res.data;
};

export const getOnlineUsers = async () => {
  const res = await api.get<OnlineUserResponse[]>("/online-users");
  return res.data;
};

export const getVoiceChats = async () => {
  const res = await api.get<VoiceChatResponse[]>("/voice-chats");
  return res.data;
};

export const getVoiceConversation = async (participantA: string, participantB: string) => {
  const res = await api.get<VoiceChatResponse[]>('/voice-chats/conversation', {
    params: { participantA, participantB },
  });
  return res.data;
};

export const getUsers = async () => {
  const res = await api.get<UserResponse[]>("/users");
  return res.data;
};

export const createUser = async (user: CreateUserRequest) => {
  const res = await api.post<UserResponse>('/users', user);
  return res.data;
};

export const sendNotificationRequest = async (notification: SendNotificationRequest) => {
  const res = await api.post<{ status: string; notification: NotificationResponse }>('/notifications/send', notification);
  return res.data;
};

export const getNotifications = async (receiverId?: string) => {
  const res = await api.get<NotificationResponse[]>('/notifications', {
    params: receiverId ? { receiverId } : undefined,
  });
  return res.data;
};

export const getUnreadNotifications = async (receiverId: string) => {
  const res = await api.get<NotificationResponse[]>('/notifications/unread', {
    params: { receiverId },
  });
  return res.data;
};

export const getUnreadNotificationCount = async (receiverId: string) => {
  const res = await api.get<{ receiverId: string; count: number }>('/notifications/unread/count', {
    params: { receiverId },
  });
  return res.data;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const res = await api.patch<NotificationResponse>(`/notifications/${notificationId}/read`);
  return res.data;
};

export const markAllNotificationsRead = async (receiverId: string) => {
  const res = await api.post<{ status: string; receiverId: string }>('/notifications/mark-all-read', {
    receiverId,
  });
  return res.data;
};

export default {
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
