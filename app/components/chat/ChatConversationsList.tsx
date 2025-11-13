'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { dmAPI, type ConversationDTO } from '../../services/directMessageService';
import UserAvatar from '../shared/UserAvatar';
import { tokenManager } from '../../services/authService';

interface ChatConversationsListProps {
  onSelectUser: (username: string) => void;
  selectedUsername: string | null;
  refreshTrigger: number; // New prop to trigger refresh
}

export default function ChatConversationsList({ onSelectUser, selectedUsername, refreshTrigger }: ChatConversationsListProps) {
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = useMemo(() => tokenManager.getUser(), []);

  // Effect to fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      try {
        const convos = await dmAPI.getConversations();
        setConversations(convos);
      } catch (error) {
        console.error("Failed to fetch conversations", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConversations();
  }, [currentUser, refreshTrigger]); // Refresh when trigger changes

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return '...'; }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="shrink-0 px-4 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Direct Messages</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-4 text-center">Loading...</div>}
        {!isLoading && conversations.length === 0 && (
          <div className="p-4 text-center text-gray-500">No conversations.</div>
        )}
        {conversations.map((convo) => (
          <button
            key={convo.otherUser}
            onClick={() => onSelectUser(convo.otherUser)}
            className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${
              selectedUsername === convo.otherUser ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
            }`}
          >
            <UserAvatar name={convo.otherUser} size="md" />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-900 truncate">{convo.otherUser}</h4>
                <span className="text-xs text-gray-500 shrink-0 ml-2">
                  {formatTime(convo.lastMessage.timestamp)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 truncate">{convo.lastMessage.messageContent}</p>
                {/* --- UNREAD BADGE --- */}
                {convo.unreadCount > 0 && (
                  <span className="ml-2 flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {convo.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}