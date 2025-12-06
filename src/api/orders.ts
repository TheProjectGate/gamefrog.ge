import { getApiBaseUrl } from './baseUrl';

const API_BASE_URL = getApiBaseUrl();

export interface CreateOrderRequest {
  customerEmail: string;
  products: Array<{
    id: number;
    name: string;
    price: number;
    goldCoins?: number;
  }>;
  total: number;
  shippingMethod?: 'delivery' | 'pickup';
  deliveryZone?: 'city' | 'region';
  tipAmount?: number;
}

export interface OrderResponse {
  id: number;
  message: string;
}

export const createOrder = async (orderData: CreateOrderRequest): Promise<OrderResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to create order.');
  }

  return response.json();
};

export const getOrders = async (email?: string, page: number = 1, limit: number = 10) => {
  const params = new URLSearchParams();
  if (email) params.append('email', email);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/api/orders?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch orders.');
  }

  return response.json();
};

export const getOrderById = async (orderId: number) => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch order.');
  }

  return response.json();
};

