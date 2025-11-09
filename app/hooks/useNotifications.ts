/**
 * React Hook for Notifications
 * 
 * Manages real-time notifications from UDP service
 * 
 * TODO: Integrate with actual UDP service
 * TODO: Add notification persistence (local storage)
 */

import { useState, useEffect, useCallback } from 'react';
import type { Notification } from '../types/voice-chat.types';
// import udpService from '../services/udpService'; // TODO: Uncomment when backend is ready

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Add new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      isRead: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // TODO: Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon.png',
      });
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return prev.filter((n) => n.id !== notificationId);
    });
  }, []);

  // TODO: Listen to UDP service events
  useEffect(() => {
    const handleVoiceMessage = (data: unknown) => {
      addNotification({
        type: 'voice',
        title: 'New Voice Message',
        message: 'You received a new voice message',
      });
    };

    const handleUserStatusChange = (data: unknown) => {
      // TODO: Parse user data and create notification
      console.log('[Notifications] User status changed:', data);
    };

    const handleSystemMessage = (data: unknown) => {
      addNotification({
        type: 'system',
        title: 'System Notification',
        message: String(data),
      });
    };

    // TODO: Uncomment when UDP service is integrated
    // udpService.on('voiceMessage', handleVoiceMessage);
    // udpService.on('statusUpdate', handleUserStatusChange);
    // udpService.on('systemMessage', handleSystemMessage);

    return () => {
      // TODO: Cleanup listeners
      // udpService.off('voiceMessage', handleVoiceMessage);
      // udpService.off('statusUpdate', handleUserStatusChange);
      // udpService.off('systemMessage', handleSystemMessage);
    };
  }, [addNotification]);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('[Notifications] Permission:', permission);
      });
    }
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  };
}

export default useNotifications;
