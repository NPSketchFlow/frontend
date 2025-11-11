'use client';

import React, { useState } from 'react';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import UserAvatar from '../shared/UserAvatar';
import NotificationPopup from './NotificationPopup';
import useNotifications from '../../hooks/useNotifications';

export default function TopNavBar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const currentUser = {
    id: process.env.NEXT_PUBLIC_USER_ID ?? 'demo-user',
    name: 'John Anderson',
    avatarUrl: '',
    status: 'online' as const,
  };

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAllAsRead,
    markAsRead,
  } = useNotifications(currentUser.id);

  const toggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      void refresh();
    }
  };

  return (
    <>
      <nav className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Page Title */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Voice Messages
            </h2>
            <p className="text-xs text-gray-500">
              Communicate with your team in real-time
            </p>
          </div>

          {/* Right side: Notifications & Profile */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative">
              <IconButton
                onClick={toggleNotifications}
                className="text-gray-600 hover:bg-gray-100"
              >
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </div>

            {/* User Profile */}
            <button className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
              <UserAvatar
                name={currentUser.name}
                avatarUrl={currentUser.avatarUrl}
                status={currentUser.status}
                size="sm"
              />
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-700">
                  {currentUser.name}
                </p>
                <p className="text-xs text-green-600 capitalize">
                  {currentUser.status}
                </p>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Notification Popup */}
      {showNotifications && (
        <NotificationPopup
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          error={error}
          onClose={() => setShowNotifications(false)}
          onMarkAllRead={() => void markAllAsRead()}
          onRefresh={() => void refresh()}
          onNotificationClick={(notificationId) => void markAsRead(notificationId)}
        />
      )}
    </>
  );
}
