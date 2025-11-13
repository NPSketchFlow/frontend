'use client';

import React, { useMemo, useState } from 'react';
import SearchInput from '../shared/SearchInput';
import UserAvatar, { OnlineStatus } from '../shared/UserAvatar';
import GroupIcon from '@mui/icons-material/Group';
import { type UserResponse, type VoiceChatResponse } from '../../services/api';

interface ConversationsListProps {
  users: UserResponse[];
  currentUserId: string;
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
  conversationSummaries: Record<string, VoiceChatResponse | undefined>;
  isLoading?: boolean;
}

interface ConversationItem {
  id: string;
  name: string;
  status: OnlineStatus;
  lastMessage: string;
  lastTimestamp: number;
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

const formatTimestamp = (timestamp: number | undefined): string => {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ConversationsList({
  users,
  currentUserId,
  selectedUserId,
  onSelect,
  conversationSummaries,
  isLoading = false,
}: ConversationsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const conversations = useMemo<ConversationItem[]>(() => {
    return users
      .filter((user) => user.userId !== currentUserId)
      .map((user) => {
        const summary = conversationSummaries[user.userId];
        const lastTimestamp = summary?.timestamp ?? 0;
        let lastMessage = 'No messages yet';

        if (summary) {
          const isOutgoing = summary.senderId === currentUserId;
          lastMessage = isOutgoing ? 'You sent a voice note' : `${user.username || user.userId} sent a voice note`;
        }

        return {
          id: user.userId,
          name: user.username || user.userId,
          status: mapStatus(user.status),
          lastMessage,
          lastTimestamp,
        } satisfies ConversationItem;
      })
      .sort((a, b) => {
        if (a.lastTimestamp === b.lastTimestamp) {
          return a.name.localeCompare(b.name);
        }
        return b.lastTimestamp - a.lastTimestamp;
      });
  }, [users, currentUserId, conversationSummaries]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const nameMatch = conversation.name?.toLowerCase().includes(query);
      const idMatch = conversation.id?.toLowerCase().includes(query);
      // Also try to match against the user's username if available
      const user = users.find((u) => u.userId === conversation.id);
      const username = user?.username ?? '';
      const usernameMatch = username.toLowerCase().includes(query);
      return Boolean(nameMatch || idMatch || usernameMatch);
    });
  }, [conversations, searchQuery, users]);

  const handleSelect = (conversation: ConversationItem) => {
    onSelect(conversation.id);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="shrink-0 px-4 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Conversations</h3>
        <SearchInput
          placeholder="Search teammates..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No conversations yet
          </div>
        ) : (
          <div className="py-2">
            {filteredConversations.map((conversation, idx) => {
              const isSelected = selectedUserId === conversation.id;
              const key = `${conversation.id}:${conversation.lastTimestamp ?? 0}:${idx}`;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleSelect(conversation)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="shrink-0">
                    <UserAvatar
                      name={conversation.name}
                      avatarUrl=""
                      status={conversation.status}
                      size="md"
                    />
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {conversation.name}
                      </h4>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">
                        {formatTimestamp(conversation.lastTimestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-gray-200">
        <button
          onClick={() => onSelect(null)}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          disabled={users.filter((user) => user.userId !== currentUserId).length === 0}
        >
          <GroupIcon fontSize="small" />
          <span className="text-sm font-medium">New Conversation</span>
        </button>
      </div>
    </div>
  );
}
