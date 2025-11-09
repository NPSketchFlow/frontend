'use client';

import React, { useState } from 'react';
import SearchInput from '../shared/SearchInput';
import UserAvatar from '../shared/UserAvatar';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';

interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group';
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline?: boolean;
}

// TODO: Replace with actual conversations from UDP service
const DUMMY_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Team Standup',
    type: 'group',
    lastMessage: 'Alice: Great work everyone!',
    lastMessageTime: new Date(Date.now() - 600000),
    unreadCount: 3,
  },
  {
    id: 'conv-2',
    name: 'Alice Johnson',
    type: 'direct',
    avatarUrl: '',
    lastMessage: 'Hey, did you see my message?',
    lastMessageTime: new Date(Date.now() - 1800000),
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: 'conv-3',
    name: 'Project Discussion',
    type: 'group',
    lastMessage: 'Bob: I will handle that task',
    lastMessageTime: new Date(Date.now() - 3600000),
    unreadCount: 0,
  },
  {
    id: 'conv-4',
    name: 'Bob Smith',
    type: 'direct',
    avatarUrl: '',
    lastMessage: 'Thanks for the update!',
    lastMessageTime: new Date(Date.now() - 7200000),
    unreadCount: 0,
    isOnline: true,
  },
];

const formatTime = (date?: Date): string => {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function ConversationsList() {
  const [conversations] = useState<Conversation[]>(DUMMY_CONVERSATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    conversations[0]?.id || null
  );

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Conversations
        </h3>
        <SearchInput
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">
              No conversations found
            </p>
          </div>
        ) : (
          <div className="py-2">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${
                  selectedConversation === conversation.id
                    ? 'bg-blue-50 border-l-4 border-blue-600'
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                {/* Avatar or Group Icon */}
                <div className="shrink-0">
                  {conversation.type === 'group' ? (
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <GroupIcon className="text-purple-600" />
                    </div>
                  ) : (
                    <UserAvatar
                      name={conversation.name}
                      avatarUrl={conversation.avatarUrl}
                      status={conversation.isOnline ? 'online' : 'offline'}
                      size="md"
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {conversation.name}
                    </h4>
                    {conversation.lastMessageTime && (
                      <span className="text-xs text-gray-500 shrink-0 ml-2">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage || 'No messages yet'}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="shrink-0 ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer - New Conversation Button */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-200">
        <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <PersonIcon fontSize="small" />
          <span className="text-sm font-medium">New Conversation</span>
        </button>
      </div>
    </div>
  );
}
