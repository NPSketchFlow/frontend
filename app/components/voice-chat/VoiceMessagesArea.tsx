'use client';

import React, { useRef, useEffect, useState } from 'react';
import VoiceMessage, {
  VoiceMessageData,
} from '../voice-chatComponents/VoiceMessage';

// TODO: Replace with actual data from UDP service
const DUMMY_MESSAGES: VoiceMessageData[] = [
  {
    id: '1',
    senderId: 'user-1',
    senderName: 'Alice Johnson',
    senderAvatar: '',
    audioUrl: '', // TODO: Replace with actual audio URL
    duration: 15,
    timestamp: new Date(Date.now() - 3600000),
    isOwn: false,
  },
  {
    id: '2',
    senderId: 'user-2',
    senderName: 'You',
    senderAvatar: '',
    audioUrl: '', // TODO: Replace with actual audio URL
    duration: 8,
    timestamp: new Date(Date.now() - 1800000),
    isOwn: true,
  },
  {
    id: '3',
    senderId: 'user-3',
    senderName: 'Bob Smith',
    senderAvatar: '',
    audioUrl: '', // TODO: Replace with actual audio URL
    duration: 22,
    timestamp: new Date(Date.now() - 900000),
    isOwn: false,
  },
  {
    id: '4',
    senderId: 'user-2',
    senderName: 'You',
    senderAvatar: '',
    audioUrl: '', // TODO: Replace with actual audio URL
    duration: 12,
    timestamp: new Date(Date.now() - 300000),
    isOwn: true,
  },
];

export default function VoiceMessagesArea() {
  const [messages, setMessages] = useState<VoiceMessageData[]>(DUMMY_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // TODO: Set up UDP message listener
  useEffect(() => {
    console.log('[UDP] Setting up voice message listener...');

    // TODO: Simulate receiving a new message (uncomment to test)
    // const mockNewMessage = () => {
    //   const newMessage: VoiceMessageData = {
    //     id: `msg-${Date.now()}`,
    //     senderId: 'user-4',
    //     senderName: 'Charlie Brown',
    //     senderAvatar: '',
    //     audioUrl: '', // TODO: UDP audio stream URL
    //     duration: 10,
    //     timestamp: new Date(),
    //     isOwn: false,
    //     isLoading: true,
    //   };

    //   setMessages((prev) => [...prev, newMessage]);

    //   // Simulate download completion
    //   setTimeout(() => {
    //     setMessages((prev) =>
    //       prev.map((msg) =>
    //         msg.id === newMessage.id ? { ...msg, isLoading: false } : msg
    //       )
    //     );
    //   }, 2000);
    // };

    // TODO: Replace with actual UDP event listener
    // udpService.on('voiceMessage', (message) => {
    //   setMessages((prev) => [...prev, message]);
    // });

    return () => {
      console.log('[UDP] Cleaning up voice message listener...');
      // TODO: Cleanup UDP listeners
    };
  }, []);

  const handleLoadMore = async () => {
    setIsLoading(true);

    try {
      // TODO: Request older messages via UDP
      console.log('[UDP] Requesting older messages...');

      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Add loaded messages to state
      console.log('[UDP] Older messages loaded');
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Voice Messages
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Messages Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-2"
      >
        {/* Load More Button */}
        {messages.length > 0 && (
          <div className="flex justify-center mb-4">
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </span>
              ) : (
                'Load older messages'
              )}
            </button>
          </div>
        )}

        {/* Messages List */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🎙️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No voice messages yet
            </h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Start a conversation by recording and sending a voice message
              below.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <VoiceMessage key={message.id} message={message} />
          ))
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
