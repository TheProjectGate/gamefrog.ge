import { getApiBaseUrl } from './baseUrl';
import { MessageType } from '../types';

const API_BASE_URL = getApiBaseUrl();

const getAuthHeaders = (requireToken: boolean = true) => {
  const token = localStorage.getItem('token');
  if (requireToken && !token) {
    throw new Error('No authentication token found');
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export interface CreateMessageRequest {
  userEmail: string;
  subject: string;
  body: string;
  type?: MessageType;
}

export const createMessage = async (data: CreateMessageRequest) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/messages`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Authentication failed. Please log in again.');
    }
    throw new Error('Failed to create message');
  }

  return response.json();
};

// Get messages for current logged in user
export const getMyMessages = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/messages`, {
    headers: getAuthHeaders(true),
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token might be invalid, remove it
      localStorage.removeItem('token');
      throw new Error('Authentication failed. Please log in again.');
    }
    throw new Error('Failed to fetch messages');
  }

  return response.json();
};

// Get messages for a specific user (admin only)
export const getMessages = async (email: string, includeDeleted: boolean = false) => {
  const token = localStorage.getItem('token');
  const response = await fetch(
    `${API_BASE_URL}/api/messages/${encodeURIComponent(email)}?includeDeleted=${includeDeleted}`,
    {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  return response.json();
};

export const markMessageAsRead = async (messageId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/read`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to mark message as read');
  }
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/delete`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete message');
  }
};

export const deleteMessages = async (messageIds: number[]): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/messages/bulk/delete`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ messageIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete messages');
  }
};

export const archiveMessage = async (messageId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/archive`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to archive message');
  }
};

export const archiveMessages = async (messageIds: number[]): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/messages/bulk/archive`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ messageIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to archive messages');
  }
};

export const unarchiveMessage = async (messageId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/unarchive`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to unarchive message');
  }
};

export const unarchiveMessages = async (messageIds: number[]): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/messages/bulk/unarchive`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ messageIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to unarchive messages');
  }
};

export const restoreMessage = async (messageId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/restore`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to restore message');
  }
};

export const restoreMessages = async (messageIds: number[]): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/messages/bulk/restore`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ messageIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to restore messages');
  }
};

export const permanentlyDeleteMessage = async (messageId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to permanently delete message');
  }
};
