/**
 * React Hook for Notifications
 * 
 * Manages real-time notifications from UDP service
 * 
 * TODO: Integrate with actual UDP service
 * TODO: Add notification persistence (local storage)
 */

import { useState, useEffect, useCallback } from 'react';
import type { Notification as NotificationViewModel } from '../types/voice-chat.types';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationAsRead,
  type NotificationResponse,
} from '../services/api';

interface UseNotificationsResult {
  notifications: NotificationViewModel[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  addLocalNotification: (notification: Omit<NotificationViewModel, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const CURRENT_USER_ID = process.env.NEXT_PUBLIC_USER_ID ?? '';

const typeMap: Record<string, NotificationViewModel['type']> = {
  NEW_VOICE: 'voice',
  TEXT_MESSAGE: 'message',
  USER_STATUS: 'user',
};

const titleMap: Record<string, string> = {
  NEW_VOICE: 'New Voice Message',
  TEXT_MESSAGE: 'New Direct Message',
  USER_STATUS: 'Presence Update',
};

const toViewModel = (apiNotification: NotificationResponse): NotificationViewModel => {
  const baseType = typeMap[apiNotification.type] ?? 'system';
  const title = titleMap[apiNotification.type] ?? 'System Notification';
  const message = apiNotification.message ?? title;
  const timestampValue = typeof apiNotification.timestamp === 'string'
    ? Date.parse(apiNotification.timestamp)
    : apiNotification.timestamp;
  const safeTimestamp =
    typeof timestampValue === 'number' && !Number.isNaN(timestampValue)
      ? timestampValue
      : Date.now();

  return {
    id: apiNotification.id,
    type: baseType,
    title,
    message,
  timestamp: new Date(safeTimestamp),
    isRead: apiNotification.read,
    metadata: apiNotification.metadata ?? undefined,
  };
};

export function useNotifications(currentUserId: string = CURRENT_USER_ID): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationViewModel[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!currentUserId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [notificationsResponse, unreadSummary] = await Promise.all([
        getNotifications(currentUserId),
        getUnreadNotificationCount(currentUserId),
      ]);

      setNotifications(notificationsResponse.map(toViewModel));
      setUnreadCount(unreadSummary.count);
    } catch (err) {
      console.error('[Notifications] Failed to fetch notifications', err);
      setError('Unable to load notifications. Please verify the backend is reachable.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    loadNotifications();

    const interval = window.setInterval(loadNotifications, 15000);
    return () => window.clearInterval(interval);
  }, [currentUserId, loadNotifications]);

  useEffect(() => {
    const handleVoiceUploaded = () => {
      void loadNotifications();
    };

    window.addEventListener('voice-uploaded', handleVoiceUploaded);
    return () => window.removeEventListener('voice-uploaded', handleVoiceUploaded);
  }, [loadNotifications]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        /* ignore */
      });
    }
  }, []);

  const addLocalNotification = useCallback(
    (notification: Omit<NotificationViewModel, 'id' | 'timestamp' | 'isRead'>) => {
      const newNotification: NotificationViewModel = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        isRead: false,
      };
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    },
    [],
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      let wasUnread = false;
      setNotifications((prev) =>
        prev.map((notification) => {
          if (notification.id === notificationId) {
            if (!notification.isRead) {
              wasUnread = true;
            }
            return { ...notification, isRead: true };
          }
          return notification;
        }),
      );
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[Notifications] Failed to mark notification as read', err);
      setError('Unable to update notification status.');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) {
      return;
    }
    try {
      await markAllNotificationsRead(currentUserId);
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[Notifications] Failed to mark all notifications as read', err);
      setError('Unable to mark all notifications as read.');
    }
  }, [currentUserId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh: loadNotifications,
    addLocalNotification,
    markAsRead,
    markAllAsRead,
  };
}

export default useNotifications;
