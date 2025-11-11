'use client';

import React, { useEffect, useRef } from 'react';
import MicIcon from '@mui/icons-material/Mic';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MessageIcon from '@mui/icons-material/Message';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export interface Notification {
  id: string;
  type: 'voice' | 'user' | 'message' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface NotificationPopupProps {
  onClose: () => void;
  onClearUnread: () => void;
}

// TODO: Replace with actual notifications from useNotifications hook
const DUMMY_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'voice',
    title: 'New Voice Message',
    message: 'Alice sent you a voice message',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    isRead: false,
  },
  {
    id: '2',
    type: 'user',
    title: 'User Online',
    message: 'Bob is now online',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    isRead: false,
  },
  {
    id: '3',
    type: 'message',
    title: 'New Message',
    message: 'Charlie: Hey, check out this feature!',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    isRead: false,
  },
  {
    id: '4',
    type: 'system',
    title: 'Connection Stable',
    message: 'UDP connection established successfully',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    isRead: true,
  },
];

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
  onClose,
  onClearUnread,
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

  const unreadCount = DUMMY_NOTIFICATIONS.filter((n) => !n.isRead).length;

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
        {unreadCount > 0 && (
          <button
            onClick={onClearUnread}
            className="text-xs text-blue-600 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {DUMMY_NOTIFICATIONS.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          DUMMY_NOTIFICATIONS.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
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
      </div>
    </div>
  );
}
