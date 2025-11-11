'use client';

import React, { useMemo, useState } from 'react';
import UserAvatar, { OnlineStatus } from '../shared/UserAvatar';
import SearchInput from '../shared/SearchInput';
import { type UserResponse } from '../../services/api';

interface OnlineUsersListProps {
  users: UserResponse[];
  currentUserId: string;
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
  isLoading?: boolean;
}

interface DisplayUser {
  id: string;
  name: string;
  status: OnlineStatus;
  lastSeen?: number;
  isSelf: boolean;
}

const mapStatus = (status?: string): OnlineStatus => {
  switch ((status ?? '').toUpperCase()) {
    case 'ONLINE':
      return 'online';
    case 'AWAY':
      return 'away';
    default:
      return 'offline';
  }
};

const formatLastSeen = (timestamp?: number): string => {
  if (!timestamp) {
    return 'unknown';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
};

const sectionLabel = (status: OnlineStatus): string => {
  switch (status) {
    case 'online':
      return 'Online';
    case 'away':
      return 'Away';
    default:
      return 'Offline';
  }
};

export default function OnlineUsersList({
  users,
  currentUserId,
  selectedUserId,
  onSelect,
  isLoading = false,
}: OnlineUsersListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const displayUsers = useMemo<DisplayUser[]>(() => {
    return users.map((user) => ({
      id: user.userId,
      name: user.username || user.userId,
      status: mapStatus(user.status),
      lastSeen: user.lastSeen,
      isSelf: user.userId === currentUserId,
    }));
  }, [users, currentUserId]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return displayUsers;
    }
    return displayUsers.filter((user) =>
      user.name.toLowerCase().includes(query) || user.id.toLowerCase().includes(query),
    );
  }, [displayUsers, searchQuery]);

  const groupedUsers = useMemo(() => {
    const groups: Record<OnlineStatus, DisplayUser[]> = {
      online: [],
      away: [],
      offline: [],
    };

    filteredUsers.forEach((user) => {
      groups[user.status].push(user);
    });

    (Object.keys(groups) as OnlineStatus[]).forEach((status) => {
      groups[status].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [filteredUsers]);

  const handleSelect = (user: DisplayUser) => {
    if (user.isSelf) {
      onSelect(null);
      return;
    }
    onSelect(user.id);
  };

  const renderSection = (status: OnlineStatus, items: DisplayUser[]) => {
    if (items.length === 0) return null;

    return (
      <div className="px-4 py-3" key={status}>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {sectionLabel(status)}
          <span className="ml-1 text-gray-400">- {items.length}</span>
        </h4>
        <div className="space-y-1">
          {items.map((user) => {
            const isSelected = selectedUserId === user.id;
            const disabled = user.isSelf;
            return (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                disabled={disabled}
                className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                  isSelected ? 'bg-blue-50 border border-blue-500' : 'hover:bg-gray-100'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <UserAvatar
                  name={user.name}
                  avatarUrl=""
                  status={user.status}
                  size="sm"
                />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                    {user.isSelf && <span className="ml-2 text-xs text-gray-500">(You)</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user.status === 'online' ? 'Active now' : `Last seen ${formatLastSeen(user.lastSeen)}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      <div className="shrink-0 px-4 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Online Users</h3>
        <SearchInput
          placeholder="Search users..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading users...</div>
        ) : (
          <>
            {renderSection('online', groupedUsers.online)}
            {renderSection('away', groupedUsers.away)}
            {renderSection('offline', groupedUsers.offline)}
          </>
        )}

        {!isLoading && filteredUsers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No users found
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Directory</span>
          <span>{users.length} total</span>
        </div>
      </div>
    </div>
  );
}
