'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SideBar from '../components/layout/SideBar';
import TopNavBar from '../components/layout/TopNavBar';
import ConversationsList from '../components/voice-chat/ConversationsList';
import VoiceMessagesArea from '../components/voice-chat/VoiceMessagesArea';
import VoiceRecorder from '../components/voice-chat/VoiceRecorder';
import OnlineUsersList from '../components/voice-chatComponents/OnlineUsersList';
import {
  createUser,
  getUsers,
  getVoiceChats,
  type UserResponse,
  type VoiceChatResponse,
} from '../services/api';
import { tokenManager } from '../services/authService';

// Use runtime authenticated user (falls back to env for dev)

export default function VoiceChatPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [conversationSummaries, setConversationSummaries] = useState<Record<string, VoiceChatResponse>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => tokenManager.getUser());

  const CURRENT_USER_ID = currentUser?.id ?? process.env.NEXT_PUBLIC_USER_ID ?? 'user-1';
  const CURRENT_USER_NAME = currentUser?.fullName ?? process.env.NEXT_PUBLIC_USER_NAME ?? CURRENT_USER_ID;

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      let fetched = await getUsers();

      if (CURRENT_USER_ID && !fetched.some((user) => user.userId === CURRENT_USER_ID)) {
        try {
          const created = await createUser({
            userId: CURRENT_USER_ID,
            username: CURRENT_USER_NAME,
            status: 'ONLINE',
            ip: '127.0.0.1',
            port: 0,
            lastSeen: Date.now(),
          });
          fetched = [...fetched, created];
        } catch (creationError) {
          console.warn('[Backend] Unable to auto-create current user', creationError);
        }
      }

      fetched.sort((a, b) => a.username.localeCompare(b.username));
      setUsers(fetched);

      setSelectedUserId((previous) => {
        if (previous && fetched.some((user) => user.userId === previous && user.userId !== CURRENT_USER_ID)) {
          return previous;
        }
        const fallback = fetched.find((user) => user.userId !== CURRENT_USER_ID);
        return fallback ? fallback.userId : null;
      });
    } catch (error) {
      console.error('[Backend] Failed to load users', error);
      setUsers([]);
      setSelectedUserId(null);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [CURRENT_USER_ID, CURRENT_USER_NAME]);

  const refreshConversationSummaries = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const chats = await getVoiceChats();
      const summaries: Record<string, VoiceChatResponse> = {};

      chats.forEach((chat) => {
        const otherUserId = chat.senderId === CURRENT_USER_ID ? chat.receiverId : chat.senderId;
        if (!otherUserId || otherUserId === CURRENT_USER_ID) {
          return;
        }

        const existing = summaries[otherUserId];
        if (!existing || chat.timestamp > existing.timestamp) {
          summaries[otherUserId] = chat;
        }
      });

      setConversationSummaries(summaries);
    } catch (error) {
      console.error('[Backend] Failed to load voice chat summaries', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [CURRENT_USER_ID]);

  useEffect(() => {
    // ensure current user state is in sync with tokenManager
    const stored = tokenManager.getUser();
    if (stored && (!currentUser || stored.id !== currentUser.id)) {
      setCurrentUser(stored);
    }

    void loadUsers();
  }, [loadUsers, currentUser]);

  useEffect(() => {
    void refreshConversationSummaries();
  }, [refreshConversationSummaries]);

  const handleSelectUser = useCallback((userId: string | null) => {
    if (!userId) {
      setSelectedUserId(null);
      return;
    }

    if (userId === CURRENT_USER_ID) {
      return;
    }

    setSelectedUserId(userId);
  }, [CURRENT_USER_ID]);

  const handleConversationUpdated = useCallback(() => {
    refreshConversationSummaries();
  }, [refreshConversationSummaries]);

  const selectableUsers = useMemo(
    () => users.filter((user) => user.userId !== CURRENT_USER_ID),
    [users, CURRENT_USER_ID],
  );

  return (
    <div className="h-screen flex bg-gray-50">
      <SideBar />

      <div className="flex-1 flex flex-col ml-64">
        <TopNavBar />

        <div className="flex-1 flex overflow-hidden mt-16">
          <div className="w-80 shrink-0">
            <ConversationsList
              users={selectableUsers}
              currentUserId={CURRENT_USER_ID}
              selectedUserId={selectedUserId}
              onSelect={handleSelectUser}
              conversationSummaries={conversationSummaries}
              isLoading={isLoadingUsers || isLoadingConversations}
            />
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-hidden">
              <VoiceMessagesArea
                currentUserId={CURRENT_USER_ID}
                selectedUserId={selectedUserId}
                users={users}
                isLoadingUsers={isLoadingUsers}
                onConversationRefresh={handleConversationUpdated}
              />
            </div>

            <div className="shrink-0">
              <VoiceRecorder
                currentUserId={CURRENT_USER_ID}
                selectedUserId={selectedUserId}
                users={selectableUsers}
                onRecipientChange={handleSelectUser}
                onUploadComplete={handleConversationUpdated}
              />
            </div>
          </div>

          <div className="w-80 shrink-0 hidden xl:block">
            <OnlineUsersList
              users={users}
              currentUserId={CURRENT_USER_ID}
              selectedUserId={selectedUserId}
              onSelect={handleSelectUser}
              isLoading={isLoadingUsers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
