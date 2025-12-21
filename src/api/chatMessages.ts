import { getApiBaseUrl } from './baseUrl';
import { Message, PendingAction } from '../chat/types/AvatarConfig';

const API_BASE_URL = getApiBaseUrl();

export interface ChatMessageResponse {
  id: number;
  user_email: string;
  role: 'user' | 'assistant';
  content: string;
  pending_actions?: PendingAction[];
  metadata?: {
    productMentions?: string[];
    userInfoMentions?: string[];
    actions?: string[];
  };
  created_at: string;
}

export interface ChatMessageWithUserInfo extends ChatMessageResponse {
  user_name?: string;
  user_phone?: string;
  user_address?: string;
}

/**
 * Save a chat message to the database
 */
export const saveChatMessage = async (
  role: 'user' | 'assistant',
  content: string,
  pendingActions?: PendingAction[],
  metadata?: {
    productMentions?: string[];
    userInfoMentions?: string[];
    actions?: string[];
  }
): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('[saveChatMessage] No token found, skipping save');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        role,
        content,
        pendingActions,
        metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to save chat message' }));
      console.error('[saveChatMessage] Error:', error);
      // Don't throw - we don't want to break the chat if saving fails
    }
  } catch (error) {
    console.error('[saveChatMessage] Network error:', error);
    // Don't throw - we don't want to break the chat if saving fails
  }
};

/**
 * Get chat messages for current user
 */
export const getChatMessages = async (
  startDate?: string,
  endDate?: string,
  limit?: number
): Promise<ChatMessageResponse[]> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (limit) params.append('limit', limit.toString());

  const response = await fetch(
    `${API_BASE_URL}/api/chat-messages?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get chat messages' }));
    throw new Error(error.message || 'Failed to get chat messages');
  }

  return response.json();
};

/**
 * Get all chat messages (admin only)
 */
export const getAllChatMessages = async (
  startDate?: string,
  endDate?: string,
  userEmail?: string,
  limit?: number
): Promise<ChatMessageWithUserInfo[]> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (userEmail) params.append('userEmail', userEmail);
  if (limit) params.append('limit', limit.toString());

  const response = await fetch(
    `${API_BASE_URL}/api/chat-messages?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get chat messages' }));
    throw new Error(error.message || 'Failed to get chat messages');
  }

  return response.json();
};

/**
 * Get chat messages for a specific user (admin only)
 */
export const getChatMessagesByUser = async (
  userEmail: string,
  startDate?: string,
  endDate?: string,
  limit?: number
): Promise<ChatMessageResponse[]> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (limit) params.append('limit', limit.toString());

  const response = await fetch(
    `${API_BASE_URL}/api/chat-messages/${encodeURIComponent(userEmail)}?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get chat messages' }));
    throw new Error(error.message || 'Failed to get chat messages');
  }

  return response.json();
};

/**
 * Delete chat messages by date range (admin only)
 */
export const deleteChatMessages = async (
  options: {
    startDate?: string;
    endDate?: string;
    userEmail?: string;
    period?: 'week' | 'month' | 'year';
  }
): Promise<{ deletedCount: number; message: string }> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/chat-messages`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete chat messages' }));
    throw new Error(error.message || 'Failed to delete chat messages');
  }

  return response.json();
};

/**
 * Delete a specific chat message (admin only)
 */
export const deleteChatMessage = async (messageId: number): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/chat-messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete chat message' }));
    throw new Error(error.message || 'Failed to delete chat message');
  }
};
