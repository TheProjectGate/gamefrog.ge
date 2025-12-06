import { getApiBaseUrl } from './baseUrl';
import { CardBrand } from '../utils/cardUtils';

const API_BASE_URL = getApiBaseUrl();

const buildUrl = (path: string) => `${API_BASE_URL}/api/payment-cards${path}`;

const parseJson = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text().catch(() => '');
  throw new Error(
    `Unexpected response (${response.status}). Body: ${text.slice(0, 120) || 'no body'}`
  );
};

export interface PaymentCardSummary {
  id: number;
  cardholderName: string;
  cardType: CardBrand;
  maskedNumber: string;
  last4: string;
  expiry: string;
  fingerprint: string;
  isDefault: boolean;
}

export interface SavePaymentCardRequest {
  email: string;
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  makeDefault?: boolean;
}

export const fetchPaymentCards = async (email: string): Promise<PaymentCardSummary[]> => {
  const response = await fetch(buildUrl(`/${encodeURIComponent(email)}`));
  if (!response.ok) {
    const errorData = await parseJson(response).catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to load saved cards.');
  }
  return parseJson(response);
};

export const savePaymentCard = async (
  payload: SavePaymentCardRequest
): Promise<PaymentCardSummary> => {
  const response = await fetch(buildUrl(''), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.message || 'Failed to save card.');
  }

  return data;
};

export const deletePaymentCard = async (email: string, fingerprint: string): Promise<void> => {
  const response = await fetch(buildUrl(`/${encodeURIComponent(email)}/${fingerprint}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await parseJson(response).catch(() => ({}));
    throw new Error(data?.message || 'Failed to remove card.');
  }
};

export const setDefaultPaymentCard = async (email: string, fingerprint: string): Promise<void> => {
  const response = await fetch(
    buildUrl(`/${encodeURIComponent(email)}/${fingerprint}/default`),
    {
      method: 'PATCH',
    }
  );

  if (!response.ok) {
    const data = await parseJson(response).catch(() => ({}));
    throw new Error(data?.message || 'Failed to set default card.');
  }
};


