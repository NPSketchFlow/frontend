'use client';

import React from 'react';

export type OnlineStatus = 'online' | 'away' | 'offline';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  status?: OnlineStatus;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const statusSizes = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
};

export default function UserAvatar({
  name,
  avatarUrl,
  status = 'offline',
  size = 'md',
  showStatus = true,
  className = '',
}: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {showStatus && (
        <span
          title={status}
          role="status"
          aria-label={`User is ${status}`}
          className={`absolute bottom-0 right-0 ${statusSizes[size]} ${statusColors[status]} rounded-full border-2 border-white ring ring-white`}
        />
      )}
    </div>
  );
}
