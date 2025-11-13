import { getAuthHeaders, tokenManager } from './authService';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

// This matches the DirectMessage.java model
export interface DirectMessage {
  id: string;
  senderUsername: string;
  receiverUsername: string;
  messageContent: string;
  timestamp: string; // ISO Date string
  conversationId: string;
}

// --- ADD THIS NEW INTERFACE ---
export interface ConversationDTO {
  lastMessage: DirectMessage;
  unreadCount: number;
  otherUser: string;
}

export const dmAPI = {
  /**
   * REPLACED: Get the list of all conversations, with the last message for each.
   */
  getConversations: async (): Promise<ConversationDTO[]> => {
    const response = await fetch(`${BACKEND_URL}/api/dm/conversations`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
  },

  /**
   * Get the full chat history with a specific user.
   */
  getConversationHistory: async (otherUsername: string): Promise<DirectMessage[]> => {
    const response = await fetch(`${BACKEND_URL}/api/dm/history/${otherUsername}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chat history');
    return response.json();
  },
  /**
   * NEW: Mark all messages with a user as read.
   */
  markAsRead: async (otherUsername: string): Promise<void> => {
    const response = await fetch(`${BACKEND_URL}/api/dm/read/${otherUsername}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to mark messages as read');
  },
};
