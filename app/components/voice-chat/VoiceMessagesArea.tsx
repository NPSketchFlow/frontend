'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VoiceMessage, {
  VoiceMessageData,
} from '../voice-chatComponents/VoiceMessage';
import {
  getVoiceConversation,
  type UserResponse,
  type VoiceChatResponse,
} from '../../services/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080/api').replace(/\/$/, '');

interface VoiceMessagesAreaProps {
  currentUserId: string;
  selectedUserId: string | null;
  users: UserResponse[];
  isLoadingUsers: boolean;
  onConversationRefresh?: () => void;
}

export default function VoiceMessagesArea({
  currentUserId,
  selectedUserId,
  users,
  isLoadingUsers,
  onConversationRefresh,
}: VoiceMessagesAreaProps) {
  const [messages, setMessages] = useState<VoiceMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const userMap = useMemo(() => {
    const map = new Map<string, UserResponse>();
    users.forEach((user) => map.set(user.userId, user));
    return map;
  }, [users]);

  const selectedUser = useMemo(
    () => (selectedUserId ? userMap.get(selectedUserId) ?? null : null),
    [selectedUserId, userMap],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = useCallback(async () => {
    if (!selectedUserId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const chats = await getVoiceConversation(currentUserId, selectedUserId);
      const mapped: VoiceMessageData[] = chats
        .map((chat) => mapVoiceChatToMessage(chat, userMap, currentUserId))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setMessages(mapped);
      onConversationRefresh?.();
    } catch (error) {
      console.error('[Backend] Failed to load conversation', error);
      setLoadError('Unable to load this conversation. Please confirm the backend is reachable.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, selectedUserId, userMap, onConversationRefresh]);

  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      return;
    }

    loadConversation();
    const interval = window.setInterval(loadConversation, 10000);
    return () => window.clearInterval(interval);
  }, [selectedUserId, loadConversation]);

  useEffect(() => {
    const handleVoiceUploaded = (event: Event): void => {
      const detail = (event as CustomEvent<VoiceChatResponse>).detail;
      if (!detail || !selectedUserId) {
        return;
      }

      const participants = [detail.senderId, detail.receiverId].filter(Boolean) as string[];
      if (!participants.includes(currentUserId) || !participants.includes(selectedUserId)) {
        return;
      }

      setMessages((previous) => {
        const next = [...previous, mapVoiceChatToMessage(detail, userMap, currentUserId)];
        next.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        return next;
      });
      onConversationRefresh?.();
    };

    window.addEventListener('voice-uploaded', handleVoiceUploaded);
    return () => window.removeEventListener('voice-uploaded', handleVoiceUploaded);
  }, [currentUserId, selectedUserId, userMap, onConversationRefresh]);

  const handleRefreshClick = () => {
    void loadConversation();
  };

  const conversationTitle = selectedUser
    ? `Conversation with ${selectedUser.username}`
    : 'Voice Messages';

  const emptyStateDescription = !selectedUserId
    ? 'Choose a teammate to start listening to shared voice notes.'
    : 'No voice messages yet. Start this conversation by recording below.';

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">{conversationTitle}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {selectedUserId ? `${messages.length} message${messages.length !== 1 ? 's' : ''}` : 'Select a recipient to begin'}
        </p>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-2"
      >
        {messages.length > 0 && selectedUserId && (
          <div className="flex justify-center mb-4">
            <button
              onClick={handleRefreshClick}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Refreshing...</span>
                </span>
              ) : (
                'Refresh messages'
              )}
            </button>
          </div>
        )}

        {selectedUserId && messages.length > 0 ? (
          messages.map((message) => (
            <VoiceMessage key={message.id} message={message} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🎙️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedUserId ? 'No voice messages yet' : 'Select a conversation'}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm">
              {isLoadingUsers ? 'Loading users...' : emptyStateDescription}
            </p>
          </div>
        )}

        {loadError && (
          <div className="mt-4 px-4 py-2 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
            {loadError}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function mapVoiceChatToMessage(
  chat: VoiceChatResponse,
  userMap: Map<string, UserResponse>,
  currentUserId: string,
): VoiceMessageData {
  const fileName = chat.filePath.split(/[\/\\]/).pop() ?? chat.chatId;
  const author = userMap.get(chat.senderId);
  const duration = Math.max(5, Math.min(60, Math.round((Date.now() - chat.timestamp) / 1000)));

  return {
    id: chat.chatId,
    senderId: chat.senderId,
    senderName: author?.username ?? chat.senderId,
    senderAvatar: '',
    audioUrl: `${API_BASE}/voice/download/${fileName}`,
    duration,
    timestamp: new Date(chat.timestamp),
    isOwn: chat.senderId === currentUserId,
  };
}
