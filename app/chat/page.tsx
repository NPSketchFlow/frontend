'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { tokenManager } from '../services/authService';
import SideBar from '../components/layout/SideBar';
import TopNavBar from '../components/layout/TopNavBar';
import OnlineUsersList from '../components/voice-chatComponents/OnlineUsersList';
import { getUsers, type UserResponse } from '../services/api';
import { ChatWebSocket, type DirectMessage } from '../services/chatWebSocket';
import { dmAPI } from '../services/directMessageService';
import ChatConversationsList from '../components/chat/ChatConversationsList';
import ChatMessagesArea from '../components/chat/ChatMessagesArea';
import ChatInput from '../components/chat/ChatInput';

export default function ChatPage() {
  const router = useRouter();
  
  // State
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [refreshConvoTrigger, setRefreshConvoTrigger] = useState(0);

  // --- START OF REPLACEMENT ---

  // Ref to prevent Strict Mode double-runs
  const wsRef = useRef<ChatWebSocket | null>(null);

  // Hook 1: Handle Auth and Load Users (runs once)
  useEffect(() => {
    const user = tokenManager.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const userData: UserResponse = {
      userId: user.id,
      username: user.username,
      status: 'ONLINE',
      ip: '',
      port: 0,
      lastSeen: Date.now(),
    };
    setCurrentUser(userData);

    // Load users
    const loadAllUsers = async () => {
      setIsLoadingPage(true);
      try {
        const allUsers = await getUsers();
        // Filter out the current user from the list
        setUsers(allUsers.filter((u: any) => u.username !== userData.username));
      } catch (error) {
        console.error("Failed to load users", error);
      } finally {
        setIsLoadingPage(false); // Finish page load
      }
    };
    loadAllUsers();
  }, [router]); // Runs once on mount

  // Hook 2: Handle WebSocket connection (runs *after* currentUser is set)
  useEffect(() => {
    // Wait until we have a user
    if (!currentUser || wsRef.current) {
      return;
    }

    const ws = new ChatWebSocket();
    wsRef.current = ws;

    ws.connect()
      .then(() => {
        console.log("Chat WebSocket is connected and authenticated.");
        
        ws.on('message', (dm: DirectMessage) => {
          // Now, currentUser is guaranteed to be set and not stale
          
          const isFromMe = dm.senderUsername === currentUser.username;
          const isToMe = dm.receiverUsername === currentUser.username;
          
          // Determine if this message is for the *currently open chat*
          // We use a state-getter function to get the *absolute latest* value
          // of selectedUsername, avoiding the stale closure.
          let isForOpenChat = false;
          
          setSelectedUsername(currentSelectedUser => {
            if (currentSelectedUser) { // Only if a chat is open
              const isFromSelected = dm.senderUsername === currentSelectedUser;
              const isToSelected = dm.receiverUsername === currentSelectedUser;
              if ((isFromMe && isToSelected) || (isFromSelected && isToMe)) {
                isForOpenChat = true;
              }
            }
            
            // Now we can act
            if (isForOpenChat) {
              // It's for the open chat. Add it to the message list.
              
              // --- START OF FIX ---
              setMessages(prev => {
                // Check if the message ID is already in our list
                if (prev.find(msg => msg.id === dm.id)) {
                  return prev; // If it is, don't add it again
                }
                return [...prev, dm]; // Otherwise, add the new message
              });
              
              // If it's *from* the other person, mark it as read.
              if (dm.senderUsername === currentSelectedUser && currentSelectedUser) {
                  dmAPI.markAsRead(currentSelectedUser);
              }
            } else if (isToMe) {
              // It's a message *for me*, but for a *different* (or no) open chat.
              // Trigger a refresh of the conversation list to show the badge.
              setRefreshConvoTrigger(c => c + 1);
            }
            
            return currentSelectedUser; // Don't change the state, just read it
          });
        });
      })
      .catch((err) => {
        console.error("WebSocket connection failed", err);
        alert("Could not connect to chat. Please refresh.");
      });

    // Setup cleanup function
    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, [currentUser]); // This hook depends on currentUser

  // Hook 3: Load history (this hook is unchanged, but now separate)
  useEffect(() => {
    if (!selectedUsername) {
      setMessages([]); // Clear messages when no user is selected
      return;
    }

    const loadHistory = async () => {
      setIsLoadingMessages(true);
      try {
        // Load the history
        const history = await dmAPI.getConversationHistory(selectedUsername);
        setMessages(history);
        
        // Mark this conversation as read
        await dmAPI.markAsRead(selectedUsername);
        
        // Trigger a refresh of the conversation list to clear the unread count
        setRefreshConvoTrigger(c => c + 1);
        
      } catch (error) {
        console.error("Failed to load chat history", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadHistory();
  }, [selectedUsername]); // This hook only runs when you select a user

  // ... (rest of the file is the same)


  const handleSelectUser = (username: string | null) => {
    setSelectedUsername(username);
  };

  // Render logic
  if (isLoadingPage) {
    return <div>Loading...</div>; // Main page loader
  }

  if (!currentUser) {
    return <div>Initializing...</div>;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <SideBar />
      <div className="flex-1 flex flex-col ml-64">
        <TopNavBar />
        <div className="flex-1 flex overflow-hidden mt-16">
          
          <div className="w-80 shrink-0 hidden lg:block">
            <ChatConversationsList
              selectedUsername={selectedUsername}
              onSelectUser={handleSelectUser}
              refreshTrigger={refreshConvoTrigger} // Pass the trigger
            />
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-hidden">
              <ChatMessagesArea
                selectedUsername={selectedUsername}
                messages={messages} // Pass the messages
                isLoading={isLoadingMessages} // Pass the loading state
              />
            </div>
            <div className="shrink-0">
              <ChatInput
                selectedUsername={selectedUsername}
                webSocket={wsRef.current} // Pass the WebSocket from the ref
              />
            </div>
          </div>

          <div className="w-80 shrink-0 hidden xl:block">
            <OnlineUsersList
              users={users}
              currentUserId={currentUser.userId}
              selectedUsername={selectedUsername}
              onSelect={handleSelectUser}
              isLoading={isLoadingPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}