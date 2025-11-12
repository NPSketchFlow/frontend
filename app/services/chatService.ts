import { getAuthHeaders } from './authService';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

// This matches the ChatMessage.java model
export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderUsername: string;
  messageContent: string;
  timestamp: string; // ISO Date string
}

export interface ChatHistoryResponse {
  sessionId: string;
  history: ChatMessage[];
  count: number;
}

export const chatAPI = {
  /**
   * Get all chat history for a specific session
   */
  getChatHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    if (!sessionId) {
      console.warn('No session ID provided to getChatHistory');
      return [];
    }
    
    const response = await fetch(
      `${BACKEND_URL}/api/chat/sessions/${sessionId}/history`,
      {
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get chat history:', errorText);
      throw new Error(`Failed to get chat history: ${response.statusText}`);
    }

    const data: ChatHistoryResponse = await response.json();
    return data.history || [];
  },
};