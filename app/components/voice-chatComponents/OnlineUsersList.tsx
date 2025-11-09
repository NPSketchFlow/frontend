'use client';

import React, { useState, useEffect } from 'react';
import UserAvatar, { OnlineStatus } from '../shared/UserAvatar';
import SearchInput from '../shared/SearchInput';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';

export interface OnlineUser {
  id: string;
  name: string;
  avatarUrl?: string;
  status: OnlineStatus;
  latency: number; // in ms
  lastSeen?: Date;
}

// TODO: Replace with actual data from UDP service
const DUMMY_USERS: OnlineUser[] = [
  {
    id: 'user-1',
    name: 'Alice Johnson',
    avatarUrl: '',
    status: 'online',
    latency: 15,
  },
  {
    id: 'user-2',
    name: 'Bob Smith',
    avatarUrl: '',
    status: 'online',
    latency: 42,
  },
  {
    id: 'user-3',
    name: 'Charlie Brown',
    avatarUrl: '',
    status: 'away',
    latency: 78,
    lastSeen: new Date(Date.now() - 300000),
  },
  {
    id: 'user-4',
    name: 'Diana Prince',
    avatarUrl: '',
    status: 'online',
    latency: 120,
  },
  {
    id: 'user-5',
    name: 'Eve Taylor',
    avatarUrl: '',
    status: 'offline',
    latency: 0,
    lastSeen: new Date(Date.now() - 7200000),
  },
  {
    id: 'user-6',
    name: 'Frank Miller',
    avatarUrl: '',
    status: 'online',
    latency: 25,
  },
];

const getLatencyColor = (latency: number): string => {
  if (latency === 0) return 'text-gray-400';
  if (latency < 50) return 'text-green-500';
  if (latency < 100) return 'text-yellow-500';
  return 'text-red-500';
};

const getLatencyLabel = (latency: number): string => {
  if (latency === 0) return 'Offline';
  if (latency < 50) return 'Excellent';
  if (latency < 100) return 'Good';
  if (latency < 150) return 'Fair';
  return 'Poor';
};

const formatLastSeen = (date?: Date): string => {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

export default function OnlineUsersList() {
  const [users, setUsers] = useState<OnlineUser[]>(DUMMY_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // TODO: Set up UDP connection for real-time user status updates
  useEffect(() => {
    console.log('[UDP] Setting up user status listener...');

    // Simulate latency updates
    const interval = setInterval(() => {
      setUsers((prevUsers) =>
        prevUsers.map((user) => ({
          ...user,
          latency:
            user.status === 'online'
              ? Math.max(10, user.latency + Math.random() * 20 - 10)
              : 0,
        }))
      );
    }, 3000);

    // TODO: Replace with actual UDP event listeners
    // udpService.on('userStatusChange', (userId, status) => {
    //   setUsers(prev => prev.map(u => u.id === userId ? {...u, status} : u));
    // });
    //
    // udpService.on('latencyUpdate', (userId, latency) => {
    //   setUsers(prev => prev.map(u => u.id === userId ? {...u, latency} : u));
    // });

    return () => {
      clearInterval(interval);
      console.log('[UDP] Cleaning up user status listener...');
      // TODO: Cleanup UDP listeners
    };
  }, []);

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineUsers = filteredUsers.filter((u) => u.status === 'online');
  const awayUsers = filteredUsers.filter((u) => u.status === 'away');
  const offlineUsers = filteredUsers.filter((u) => u.status === 'offline');

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Online Users
        </h3>
        <SearchInput
          placeholder="Search users..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {/* Online Users */}
        {onlineUsers.length > 0 && (
          <div className="px-4 py-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Online — {onlineUsers.length}
            </h4>
            <div className="space-y-1">
              {onlineUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user.id)}
                  className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                    selectedUser === user.id
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatarUrl}
                    status={user.status}
                    size="sm"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <div className="flex items-center space-x-1">
                      <SignalCellularAltIcon
                        className={getLatencyColor(user.latency)}
                        sx={{ fontSize: 12 }}
                      />
                      <span
                        className={`text-xs ${getLatencyColor(user.latency)}`}
                      >
                        {Math.round(user.latency)}ms
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">
                        {getLatencyLabel(user.latency)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Away Users */}
        {awayUsers.length > 0 && (
          <div className="px-4 py-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Away — {awayUsers.length}
            </h4>
            <div className="space-y-1">
              {awayUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user.id)}
                  className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                    selectedUser === user.id
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatarUrl}
                    status={user.status}
                    size="sm"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatLastSeen(user.lastSeen)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Offline Users */}
        {offlineUsers.length > 0 && (
          <div className="px-4 py-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Offline — {offlineUsers.length}
            </h4>
            <div className="space-y-1 opacity-60">
              {offlineUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user.id)}
                  className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                    selectedUser === user.id
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatarUrl}
                    status={user.status}
                    size="sm"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatLastSeen(user.lastSeen)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredUsers.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">
              No users found
            </p>
          </div>
        )}
      </div>

      {/* Footer - Connection Status */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            UDP Connection
          </span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-600 font-medium">
              Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
