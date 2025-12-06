import { getApiBaseUrl } from './baseUrl';
import { Product } from '../types';

const API_BASE_URL = getApiBaseUrl();

export async function addToWishlist(userEmail: string, productId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/wishlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userEmail, productId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to add to wishlist');
  }
}

export async function removeFromWishlist(userEmail: string, productId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/wishlist/${encodeURIComponent(userEmail)}/${productId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to remove from wishlist');
  }
}

export async function getWishlist(userEmail: string): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/api/wishlist/${encodeURIComponent(userEmail)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch wishlist');
  }

  return response.json();
}
