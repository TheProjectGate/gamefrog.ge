import { getApiBaseUrl } from './baseUrl';

const API_BASE_URL = getApiBaseUrl();

export interface UpdateProfileRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: number;
  phone?: string;
  address?: string;
}

export interface UserProfile {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: number;
  phone?: string;
  address?: string;
  role: string;
  goldCoins: number;
  createdAt: string;
}

export interface LoginResponse {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: number;
  role: string;
  goldCoins: number;
  token: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Login failed');
  }

  return response.json();
};

export const getUserProfile = async (email: string): Promise<UserProfile> => {
  const response = await fetch(`${API_BASE_URL}/api/users/profile/${encodeURIComponent(email)}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to load user profile.');
  }
  
  return response.json();
};

export const updateUserProfile = async (payload: UpdateProfileRequest): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/users/profile/${encodeURIComponent(payload.email)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: payload.firstName,
      lastName: payload.lastName,
      avatar: payload.avatar,
      phone: payload.phone,
      address: payload.address,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to update profile.');
  }
};

export const addGoldCoins = async (email: string, amount: number): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/api/users/gold-coins/${encodeURIComponent(email)}/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to add gold coins.');
  }

  const data = await response.json();
  return data.goldCoins;
};
