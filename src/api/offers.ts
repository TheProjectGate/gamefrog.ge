import { getApiBaseUrl } from './baseUrl';

export type ShowFrequency = 'once_per_day' | 'every_hour' | 'on_refresh';

export interface LimitedTimeOffer {
  id: number;
  name?: string; // Name for admin identification only
  backgroundImageUrl?: string;
  backgroundColor?: string; // Custom background color for offer section on sale page
  discountPercent: number;
  endsAt: string;
  isActive: boolean;
  redirectUrl?: string;
  productIds?: number[];
  showFrequency?: ShowFrequency;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOfferData {
  name?: string; // Name for admin identification only
  backgroundImageUrl?: string;
  backgroundColor?: string; // Custom background color for offer section on sale page
  discountPercent?: number;
  endsAt: string;
  isActive?: boolean;
  redirectUrl?: string;
  productIds?: number[];
  showFrequency?: ShowFrequency;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token missing');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const fetchOffers = async (): Promise<LimitedTimeOffer[]> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/offers`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch offers' }));
    throw new Error(error.message || 'Failed to fetch offers');
  }

  return response.json();
};

export const fetchActiveOffer = async (): Promise<LimitedTimeOffer | null> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/offers/active`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    // If response is null/empty, return null
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json().catch(() => null);
      if (data === null) {
        return null;
      }
      const error = data.message || 'Failed to fetch active offer';
      throw new Error(error);
    }
    return null;
  }

  const data = await response.json();
  return data || null;
};

export const fetchActiveOffers = async (): Promise<LimitedTimeOffer[]> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/offers/active/all`);

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    const error = await response.json().catch(() => ({ message: 'Failed to fetch active offers' }));
    throw new Error(error.message || 'Failed to fetch active offers');
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const createOffer = async (data: CreateOfferData): Promise<{ id: number; message: string }> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/offers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create offer' }));
    throw new Error(error.message || 'Failed to create offer');
  }

  return response.json();
};

export const updateOffer = async (id: number, data: Partial<CreateOfferData>): Promise<{ message: string }> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/offers/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update offer' }));
    throw new Error(error.message || 'Failed to update offer');
  }

  return response.json();
};

export const deleteOffer = async (id: number): Promise<void> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/offers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete offer' }));
    throw new Error(error.message || 'Failed to delete offer');
  }
};

