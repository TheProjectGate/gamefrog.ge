import { getApiBaseUrl } from './baseUrl';

const API_BASE_URL = getApiBaseUrl();

export interface CheckoutItem {
  title: string;
  price: number;
  quantity: number;
  description?: string;
  currency?: string;
}

export interface CreateUnipayOrderRequest {
  customerEmail?: string;
  merchantUser?: string;
  total: number;
  currency?: 'GEL' | 'USD' | 'EUR' | string;
  orderName: string;
  orderDescription?: string;
  successRedirectUrl?: string;
  cancelRedirectUrl?: string;
  callbackUrl?: string;
  language?: 'EN' | 'GE';
  merchantOrderId?: string;
  items?: CheckoutItem[];
}

export interface CreateUnipayOrderResponse {
  checkoutUrl: string;
  unipayOrderHashId: string;
  merchantOrderId: string;
  message?: string;
}

const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const fallbackText = (await response.text().catch(() => '')).slice(0, 200);
  throw new Error(
    `Unexpected response (${response.status}). Body: ${fallbackText || 'no body'}`
  );
};

export const createUnipayOrder = async (
  payload: CreateUnipayOrderRequest
): Promise<CreateUnipayOrderResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/payments/unipay/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok || !data?.checkoutUrl) {
    throw new Error(
      data?.message || `UniPay endpoint responded with ${response.status}.`
    );
  }

  return data;
};


