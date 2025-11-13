'use client';

import React, { useEffect, useRef } from 'react';
import { type DirectMessage } from '../../services/directMessageService';
import { tokenManager } from '../../services/authService';
import UserAvatar from '../shared/UserAvatar';

interface ChatMessagesAreaProps {
    selectedUsername: string | null;
    messages: DirectMessage[];
    isLoading: boolean;
}

export default function ChatMessagesArea({ selectedUsername, messages, isLoading }: ChatMessagesAreaProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const currentUser = tokenManager.getUser();

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return '...'; }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center bg-gray-50">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!selectedUsername) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center bg-gray-50">
                <span className="text-4xl mb-4">💬</span>
                <h3 className="text-lg font-medium text-gray-900">Select a conversation</h3>
                <p className="text-sm text-gray-500">Choose a user from the list to start chatting.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">{selectedUsername}</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 pt-10">
                        No messages yet. Say hello!
                    </div>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex items-start space-x-3 ${msg.senderUsername === currentUser?.username ? 'flex-row-reverse space-x-reverse' : ''
                            }`}
                    >
                        <UserAvatar name={msg.senderUsername} size="sm" showStatus={false} />
                        <div
                            className={`flex flex-col ${msg.senderUsername === currentUser?.username ? 'items-end' : 'items-start'
                                }`}
                        >
                            <div
                                className={`rounded-lg px-3 py-2 shadow-sm ${msg.senderUsername === currentUser?.username
                                        ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900'
                }`}
              >
                            <p className="text-sm">{msg.messageContent}</p>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 px-1">
                            {formatTime(msg.timestamp)}
                        </span>
                    </div>
          </div>
        ))}
            <div ref={messagesEndRef} />
        </div>
    </div >
  );
}