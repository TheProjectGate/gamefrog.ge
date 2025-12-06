import { getApiBaseUrl } from './baseUrl';
import { BadgeColorConfig } from '../types';

const API_BASE_URL = getApiBaseUrl();

export interface UserSettingsResponse {
  badgeColors: BadgeColorConfig;
}

export const getUserSettings = async (): Promise<UserSettingsResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/user-settings`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user settings');
  }

  return response.json();
};

export const updateUserSettings = async (badgeColors: BadgeColorConfig): Promise<UserSettingsResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/user-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ badgeColors }),
  });

  if (!response.ok) {
    throw new Error('Failed to update user settings');
  }

  return response.json();
};

