'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { type ChatWebSocket } from '../../services/chatWebSocket';

interface ChatInputProps {
  selectedUsername: string | null;
  webSocket: ChatWebSocket | null;
}

export default function ChatInput({ selectedUsername, webSocket }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsername || !webSocket || message.trim() === '') return;

    webSocket.sendDM(selectedUsername, message.trim());
    setMessage('');
  };

  return (
    <form onSubmit={handleSend} className="bg-white border-t border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={selectedUsername ? `Message ${selectedUsername}` : 'Select a user to chat'}
          className="flex-1 px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!selectedUsername || !webSocket}
        />
        <button
          type="submit"
          className="w-12 h-12 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
          disabled={!selectedUsername || !webSocket || message.trim() === ''}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}