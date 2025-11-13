'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { WhiteboardSessionManager } from '../../services/whiteboardClient';
import { type ChatMessage, chatAPI } from '../../services/chatService';
import { tokenManager } from '../../services/authService';

interface ChatPanelProps {
  sessionManager: WhiteboardSessionManager | null;
  sessionId: string;
}

type DisplayMessage = {
  id: string;
  senderId: string;
  senderUsername: string;
  message: string;
  timestamp: string;
  isOwn: boolean;
};

export default function ChatPanel({ sessionManager, sessionId }: ChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = tokenManager.getUser()?.id || '';

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history on component mount
  useEffect(() => {
    if (!sessionId) return;

    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const history = await chatAPI.getChatHistory(sessionId);
        const formattedHistory = history.map((msg) => ({
          id: msg.id,
          senderId: msg.senderId,
          senderUsername: msg.senderUsername,
          message: msg.messageContent,
          timestamp: msg.timestamp,
          isOwn: msg.senderId === currentUserId,
        }));
        setMessages(formattedHistory);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHistory();
  }, [sessionId, currentUserId]);

  // Set up WebSocket listener
  useEffect(() => {
    if (!sessionManager) return;

    const handleChatMessage = (msg: any) => {
      // msg comes from WebSocketMessage, which has messageContent
      setMessages((prev) => [
        ...prev,
        {
          id: `ws-${Date.now()}`,
          senderId: msg.userId,
          senderUsername: msg.username || 'Anonymous',
          message: msg.messageContent || '',
          timestamp: new Date(msg.timestamp).toISOString(),
          isOwn: msg.userId === currentUserId,
        },
      ]);
    };

    // Register the event handler
    sessionManager.on('CHAT_MESSAGE', handleChatMessage);

    // Cleanup
    return () => {
      // We need a way to 'off' the event, but for now this is fine
      // if manager has 'off', use it: sessionManager.off('CHAT_MESSAGE', handleChatMessage);
    };
  }, [sessionManager, currentUserId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !sessionManager) return;

    sessionManager.sendChatMessage(newMessage.trim());
    setNewMessage('');
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '...';
    }
  };

  return (
    <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Session Chat
        </h3>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {isLoading && (
          <div className="text-center text-slate-400">Loading history...</div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="text-center text-slate-400 pt-10">
            No messages yet.
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.isOwn ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`rounded-lg px-3 py-2 max-w-[80%] ${
                msg.isOwn
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-200'
              }`}
            >
              {!msg.isOwn && (
                <div className="text-xs font-semibold text-purple-300 mb-1">
                  {msg.senderUsername}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">
                {msg.message}
              </p>
            </div>
            <span className="text-xs text-slate-500 mt-1 px-1">
              {formatTime(msg.timestamp)}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            className="w-10 h-10 flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
            disabled={newMessage.trim() === ''}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}