'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import MicIcon from '@mui/icons-material/Mic';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MessageIcon from '@mui/icons-material/Message';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { Notification } from '../../types/voice-chat.types';

interface NotificationPopupProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  onNotificationClick?: (notificationId: string) => void;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'voice':
      return <MicIcon className="text-blue-500" />;
    case 'user':
      return <PersonAddIcon className="text-green-500" />;
    case 'message':
      return <MessageIcon className="text-purple-500" />;
    case 'system':
      return <CheckCircleIcon className="text-gray-500" />;
    default:
      return <MessageIcon className="text-gray-500" />;
  }
};

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationPopup({
  notifications,
  unreadCount,
  isLoading,
  error,
  onClose,
  onMarkAllRead,
  onRefresh,
  onNotificationClick,
}: NotificationPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      ),
    [notifications],
  );

  return (
    <div
      ref={popupRef}
      className="absolute top-16 right-6 w-96 bg-white border border-gray-200 rounded-lg shadow-2xl z-50"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Notifications
        </h3>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onRefresh}
            className="p-1 text-gray-500 hover:text-gray-700"
            aria-label="Refresh notifications"
            title="Refresh notifications"
          >
            <RefreshIcon fontSize="small" className={isLoading ? 'animate-spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-blue-600 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {error && (
          <div className="px-4 py-3 text-sm text-red-600 border-b border-red-100 bg-red-50">
            {error}
          </div>
        )}
        {sortedNotifications.length === 0 && !isLoading ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          sortedNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
              onClick={() => onNotificationClick?.(notification.id)}
            >
              <div className="flex items-start space-x-3">
                <div className="shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full ml-2" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(notification.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button className="w-full text-center text-sm text-blue-600 hover:underline">
          View all notifications
        </button>
        {isLoading && (
          <p className="mt-2 text-center text-xs text-gray-500">Refreshing…</p>
        )}
      </div>
    </div>
  );
}
