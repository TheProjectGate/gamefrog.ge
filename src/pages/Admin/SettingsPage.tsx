import React, { useState, useEffect } from 'react';
import { CogIcon, CheckIcon, CloseIcon, TagIcon, ReceiptIcon } from '../../components/Icons';
import unipayLogo from '../../img/unipay_logo_dark-8564506.svg';
import useStore from '../../store/useStore';

interface PaymentSetting {
  id: number;
  paymentProvider: string;
  isEnabled: boolean;
  displayName: string;
  config: {
    merchantId?: string;
    secretKey?: string;
    merchantUser?: string;
    apiUrl?: string;
    successUrl?: string;
    cancelUrl?: string;
    callbackUrl?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

const TOKEN_STORAGE_KEY = 'token';
const AUTH_STORAGE_KEY = 'gf_auth';
const AUTH_RETRY_COOLDOWN_MS = 5000;
let tokenRefreshPromise: Promise<string> | null = null;
let nextAuthRetryAt = 0;

type SavedCredentials = {
  email?: string;
  password?: string;
  userRole?: string | null;
  isLoggedIn?: boolean;
};

const getSavedCredentials = (): SavedCredentials | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearStoredAuthState = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.warn('[SettingsPage] Failed to clear stored auth state:', error);
  }
};

const requestTokenWithSavedCredentials = async (): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('Authentication is only available in the browser.');
  }

  if (Date.now() < nextAuthRetryAt) {
    throw new Error('Too many login attempts. Please wait a few seconds and try again.');
  }

  const saved = getSavedCredentials();
  if (!saved?.email || !saved?.password || saved?.isLoggedIn === false) {
    throw new Error('Admin session expired. Please sign in again.');
  }

  let response: Response;
  let data: any;

  try {
    response = await fetch('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: saved.email,
        password: saved.password,
      }),
    });
    data = await response.json().catch(() => null);
  } catch (error) {
    throw new Error('Failed to reach authentication service. Please try again.');
  }

  if (!response.ok || !data?.token) {
    if (response.status === 401) {
      clearStoredAuthState();
      throw new Error('Admin authentication failed. Please sign in again.');
    }
    if (response.status === 429) {
      nextAuthRetryAt = Date.now() + AUTH_RETRY_COOLDOWN_MS;
      throw new Error('Too many login attempts. Please wait a moment and try again.');
    }
    throw new Error(data?.message || 'Unable to refresh admin session. Please sign in again.');
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
  try {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        ...saved,
        isLoggedIn: true,
        userRole: data.role ?? saved.userRole ?? 'admin',
      })
    );
  } catch (error) {
    console.warn('[SettingsPage] Failed to persist refreshed credentials:', error);
  }

  return data.token;
};

const ensureAuthToken = async (forceRefresh = false): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('Authentication is only available in the browser.');
  }

  if (!forceRefresh) {
    const existingToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (existingToken) {
      return existingToken;
    }
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  if (!tokenRefreshPromise) {
    tokenRefreshPromise = requestTokenWithSavedCredentials()
      .finally(() => {
        tokenRefreshPromise = null;
      });
  }

  return tokenRefreshPromise;
};

const fetchWithAuth = async (
  url: string,
  init: RequestInit = {},
  retried = false
): Promise<Response> => {
  const token = await ensureAuthToken(retried);
  const headers = new Headers(init.headers as HeadersInit);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 401 && !retried) {
    return fetchWithAuth(url, init, true);
  }

  return response;
};

const SettingsPage: React.FC = () => {
  // Use proper selectors to ensure re-renders
  const setToast = useStore(state => state.setToast);
  const openRegisterModal = useStore(state => state.openRegisterModal);
  const badgeColors = useStore(state => state.badgeColors);
  const setBadgeColor = useStore(state => state.setBadgeColor);
  const loadUserSettings = useStore(state => state.loadUserSettings);
  const isLoggedIn = useStore(state => state.isLoggedIn);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentSetting>>({});
  const [isPaymentSectionOpen, setPaymentSectionOpen] = useState(false);
  const [isBadgeColorsSectionOpen, setIsBadgeColorsSectionOpen] = useState(false);
  const [togglingProvider, setTogglingProvider] = useState<string | null>(null);
  const [globalTestMode, setGlobalTestMode] = useState(false);
  const [globalTestLoading, setGlobalTestLoading] = useState(true);
  const [updatingGlobalTestMode, setUpdatingGlobalTestMode] = useState(false);
  const [globalTestModeUpdatedAt, setGlobalTestModeUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentSettings();
    fetchGlobalTestMode();
    // Load user settings when page opens
    if (isLoggedIn) {
      loadUserSettings().catch(error => {
        console.error('[SettingsPage] Failed to load user settings:', error);
      });
    }
  }, [isLoggedIn, loadUserSettings]);

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetchWithAuth('/api/payment-settings');

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to fetch payment settings');
      }

      const data = await response.json();
      setPaymentSettings(data);
    } catch (error: any) {
      const message = error?.message || 'Failed to load payment settings';
      setToast(message);
      if (/sign in/i.test(message) || /authentication/i.test(message)) {
        openRegisterModal('Please sign in to manage payment settings.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalTestMode = async () => {
    try {
      const response = await fetchWithAuth('/api/payments/test-mode');

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to load payment test mode state');
      }

      const data = await response.json();
      setGlobalTestMode(Boolean(data.enabled));
      setGlobalTestModeUpdatedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : null);
    } catch (error: any) {
      const message = error?.message || 'Failed to load payment test mode state';
      setToast(message);
      if (/sign in/i.test(message) || /authentication/i.test(message)) {
        openRegisterModal('Please sign in to manage payment settings.');
      }
    } finally {
      setGlobalTestLoading(false);
    }
  };

  const handleEdit = (setting: PaymentSetting) => {
    setEditingProvider(setting.paymentProvider);
    setExpandedProvider(setting.paymentProvider);
    setFormData({
      isEnabled: setting.isEnabled,
      displayName: setting.displayName,
      config: { ...setting.config },
    });
  };

  const handleCancel = () => {
    setEditingProvider(null);
    setFormData({});
  };

  const handleSave = async (provider: string) => {
    try {
      const response = await fetchWithAuth(`/api/payment-settings/${provider}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEnabled: formData.isEnabled,
          displayName: formData.displayName,
          config: formData.config,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }

      const updated = await response.json();
      setPaymentSettings(prev =>
        prev.map(s => s.paymentProvider === provider ? updated : s)
      );
      setEditingProvider(null);
      setFormData({});
      setToast('Payment settings updated successfully');
    } catch (error: any) {
      setToast(error.message || 'Failed to update payment settings');
    }
  };

  const handleConfigChange = (key: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value,
      },
    }));
  };

  const handleToggleEnabled = async (setting: PaymentSetting) => {
    const nextValue = !setting.isEnabled;
    setTogglingProvider(setting.paymentProvider);
    try {
      const response = await fetchWithAuth(`/api/payment-settings/${setting.paymentProvider}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEnabled: nextValue,
          displayName: setting.displayName,
          config: setting.config,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || 'Failed to update payment provider status');
      }

      const updated = await response.json();
      setPaymentSettings(prev =>
        prev.map(s => (s.paymentProvider === setting.paymentProvider ? updated : s))
      );
      setToast(`Provider ${nextValue ? 'enabled' : 'disabled'} successfully`);
    } catch (error: any) {
      setToast(error?.message || 'Failed to toggle payment provider');
    } finally {
      setTogglingProvider(null);
    }
  };

  const handleGlobalTestModeToggle = async () => {
    const nextValue = !globalTestMode;
    setUpdatingGlobalTestMode(true);
    try {
      const response = await fetchWithAuth('/api/payments/test-mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: nextValue }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to update payment test mode');
      }

      const data = await response.json();
      setGlobalTestMode(Boolean(data.enabled));
      setGlobalTestModeUpdatedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : null);
      setToast(
        data.enabled
          ? 'Global payment test mode enabled. UniPay will be simulated.'
          : 'Global payment test mode disabled.'
      );
    } catch (error: any) {
      const message = error?.message || 'Failed to update payment test mode';
      setToast(message);
      if (/sign in/i.test(message) || /authentication/i.test(message)) {
        openRegisterModal('Please sign in to manage payment settings.');
      }
    } finally {
      setUpdatingGlobalTestMode(false);
    }
  };

  if (loading || globalTestLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-3xl font-black uppercase mb-6 flex items-center gap-3">
          <CogIcon className="w-8 h-8" />
          Settings
        </h2>

        <div className="space-y-6">
          {/* Badge Colors Configuration */}
          <div className="bg-gray-100 border-4 border-black shadow-[4px_4px_0_0_#000]">
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setIsBadgeColorsSectionOpen(prev => !prev)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFD700] flex items-center justify-center">
                  <TagIcon className="w-6 h-6 text-black" strokeWidth={3} />
                </div>
                <h3 className="text-xl font-bold uppercase">
                  Notification Badge Colors
                </h3>
              </div>
              <span className="font-bold text-lg">
                {isBadgeColorsSectionOpen ? '−' : '+'}
              </span>
            </button>

            {isBadgeColorsSectionOpen && (
              <div className="p-4 border-t-4 border-black bg-white">
                <p className="text-sm text-gray-700 mb-4">
                  Customize indicator colors for different message types. Badges will cycle through colors if multiple types are unread.
                </p>

                <div className="space-y-4">
                  {/* General Messages */}
                  <div className="bg-white border-4 border-black">
                    <div className="flex flex-col gap-3 border-b-4 border-black p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span 
                          className={`w-10 h-10 rounded-full border-2 border-black ${
                            badgeColors.general === 'red' ? 'bg-red-600' :
                            badgeColors.general === 'green' ? 'bg-green-600' :
                            badgeColors.general === 'blue' ? 'bg-blue-600' :
                            badgeColors.general === 'yellow' ? 'bg-yellow-500' :
                            badgeColors.general === 'purple' ? 'bg-purple-600' :
                            badgeColors.general === 'pink' ? 'bg-pink-500' :
                            badgeColors.general === 'orange' ? 'bg-orange-500' :
                            badgeColors.general === 'cyan' ? 'bg-cyan-500' : 'bg-red-600'
                          }`}
                        />
                        <div>
                          <h3 className="text-xl sm:text-2xl font-display uppercase">General Messages</h3>
                          <p className="text-xs font-bold uppercase text-gray-600">Current: {badgeColors.general}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                        {(['red', 'green', 'blue', 'yellow', 'purple', 'pink', 'orange', 'cyan'] as const).map(color => (
                          <button
                            key={color}
                            onClick={() => setBadgeColor('general', color)}
                            className={`w-12 h-12 rounded-full border-2 transition-all ${
                              badgeColors.general === color 
                                ? 'border-black ring-2 ring-offset-2 ring-black scale-110' 
                                : 'border-gray-300 hover:border-black'
                            } ${
                              color === 'red' ? 'bg-red-600' :
                              color === 'green' ? 'bg-green-600' :
                              color === 'blue' ? 'bg-blue-600' :
                              color === 'yellow' ? 'bg-yellow-500' :
                              color === 'purple' ? 'bg-purple-600' :
                              color === 'pink' ? 'bg-pink-500' :
                              color === 'orange' ? 'bg-orange-500' :
                              'bg-cyan-500'
                            } hover:scale-110`}
                            title={color}
                            aria-label={`Set General Messages to ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Order/Receipt Messages */}
                  <div className="bg-white border-4 border-black">
                    <div className="flex flex-col gap-3 border-b-4 border-black p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span 
                          className={`w-10 h-10 rounded-full border-2 border-black ${
                            badgeColors.order === 'red' ? 'bg-red-600' :
                            badgeColors.order === 'green' ? 'bg-green-600' :
                            badgeColors.order === 'blue' ? 'bg-blue-600' :
                            badgeColors.order === 'yellow' ? 'bg-yellow-500' :
                            badgeColors.order === 'purple' ? 'bg-purple-600' :
                            badgeColors.order === 'pink' ? 'bg-pink-500' :
                            badgeColors.order === 'orange' ? 'bg-orange-500' :
                            badgeColors.order === 'cyan' ? 'bg-cyan-500' : 'bg-green-600'
                          }`}
                        />
                        <div>
                          <h3 className="text-xl sm:text-2xl font-display uppercase">Order Receipts</h3>
                          <p className="text-xs font-bold uppercase text-gray-600">Current: {badgeColors.order}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                        {(['red', 'green', 'blue', 'yellow', 'purple', 'pink', 'orange', 'cyan'] as const).map(color => (
                          <button
                            key={color}
                            onClick={() => setBadgeColor('order', color)}
                            className={`w-12 h-12 rounded-full border-2 transition-all ${
                              badgeColors.order === color 
                                ? 'border-black ring-2 ring-offset-2 ring-black scale-110' 
                                : 'border-gray-300 hover:border-black'
                            } ${
                              color === 'red' ? 'bg-red-600' :
                              color === 'green' ? 'bg-green-600' :
                              color === 'blue' ? 'bg-blue-600' :
                              color === 'yellow' ? 'bg-yellow-500' :
                              color === 'purple' ? 'bg-purple-600' :
                              color === 'pink' ? 'bg-pink-500' :
                              color === 'orange' ? 'bg-orange-500' :
                              'bg-cyan-500'
                            } hover:scale-110`}
                            title={color}
                            aria-label={`Set Order Receipts to ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Wishlist Messages */}
                  <div className="bg-white border-4 border-black">
                    <div className="flex flex-col gap-3 border-b-4 border-black p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span 
                          className={`w-10 h-10 rounded-full border-2 border-black ${
                            badgeColors.wishlist === 'red' ? 'bg-red-600' :
                            badgeColors.wishlist === 'green' ? 'bg-green-600' :
                            badgeColors.wishlist === 'blue' ? 'bg-blue-600' :
                            badgeColors.wishlist === 'yellow' ? 'bg-yellow-500' :
                            badgeColors.wishlist === 'purple' ? 'bg-purple-600' :
                            badgeColors.wishlist === 'pink' ? 'bg-pink-500' :
                            badgeColors.wishlist === 'orange' ? 'bg-orange-500' :
                            badgeColors.wishlist === 'cyan' ? 'bg-cyan-500' : 'bg-pink-500'
                          }`}
                        />
                        <div>
                          <h3 className="text-xl sm:text-2xl font-display uppercase">Wishlist Alerts</h3>
                          <p className="text-xs font-bold uppercase text-gray-600">Current: {badgeColors.wishlist}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                        {(['red', 'green', 'blue', 'yellow', 'purple', 'pink', 'orange', 'cyan'] as const).map(color => (
                          <button
                            key={color}
                            onClick={() => setBadgeColor('wishlist', color)}
                            className={`w-12 h-12 rounded-full border-2 transition-all ${
                              badgeColors.wishlist === color 
                                ? 'border-black ring-2 ring-offset-2 ring-black scale-110' 
                                : 'border-gray-300 hover:border-black'
                            } ${
                              color === 'red' ? 'bg-red-600' :
                              color === 'green' ? 'bg-green-600' :
                              color === 'blue' ? 'bg-blue-600' :
                              color === 'yellow' ? 'bg-yellow-500' :
                              color === 'purple' ? 'bg-purple-600' :
                              color === 'pink' ? 'bg-pink-500' :
                              color === 'orange' ? 'bg-orange-500' :
                              'bg-cyan-500'
                            } hover:scale-110`}
                            title={color}
                            aria-label={`Set Wishlist Alerts to ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-100 border-4 border-black shadow-[4px_4px_0_0_#000]">
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setPaymentSectionOpen(prev => !prev)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFD700] flex items-center justify-center">
                  <ReceiptIcon className="w-6 h-6 text-black" strokeWidth={3} />
                </div>
                <h3 className="text-xl font-bold uppercase">
                  Payment Providers
                </h3>
              </div>
              <span className="font-bold text-lg">
                {isPaymentSectionOpen ? '−' : '+'}
              </span>
            </button>

            {isPaymentSectionOpen && (
              <div className="p-4 border-t-4 border-black space-y-3">
                {/* Global Payment Test Mode */}
                <div className="bg-gray-50 border-2 border-black shadow-[2px_2px_0_0_#000] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <h4 className="text-base font-bold uppercase mb-1">Global Payment Test Mode</h4>
                      <p className="text-xs text-gray-600 mb-1">
                        Simulate UniPay responses for the entire site. Disable when you need to process real payments.
                      </p>
                      {globalTestModeUpdatedAt && (
                        <p className="text-xs text-gray-500">
                          Last changed: {globalTestModeUpdatedAt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-black uppercase border-2 border-black ${
                          globalTestMode ? 'bg-green-500 text-white' : 'bg-gray-200 text-black'
                        }`}
                      >
                        {globalTestMode ? 'Simulation Active' : 'Live Mode'}
                      </span>
                      <button
                        type="button"
                        onClick={handleGlobalTestModeToggle}
                        disabled={updatingGlobalTestMode}
                        className={`px-3 py-1 text-xs font-bold uppercase border-2 border-black shadow-[2px_2px_0_0_#000] transition-colors ${
                          globalTestMode
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {updatingGlobalTestMode
                          ? 'Saving...'
                          : globalTestMode
                            ? 'Disable'
                            : 'Enable'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    While simulation is active, checkout requests return an instant success redirect with a fake UniPay order ID. No external payment gateways are contacted.
                  </p>
                </div>

                {paymentSettings.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No payment providers configured
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentSettings.map(setting => {
                      const isEditing = editingProvider === setting.paymentProvider;
                      const isExpanded =
                        isEditing || expandedProvider === setting.paymentProvider;
                      const currentData = isEditing ? formData : setting;
                      const isUnipay = setting.paymentProvider === 'unipay';
                      const providerLogo = isUnipay ? unipayLogo : null;
                      const isDisabled = !setting.isEnabled;
                      return (
                        <div
                          key={setting.id}
                          className="bg-gray-50 border-2 border-black shadow-[2px_2px_0_0_#000]"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            className="w-full flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 cursor-pointer focus:outline-none"
                            onClick={() =>
                              setExpandedProvider(prev =>
                                prev === setting.paymentProvider ? null : setting.paymentProvider
                              )
                            }
                            onKeyDown={event => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setExpandedProvider(prev =>
                                  prev === setting.paymentProvider ? null : setting.paymentProvider
                                );
                              }
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {!isUnipay && (
                                <h4 className="text-base font-bold uppercase">
                                  {currentData.displayName || setting.displayName}
                                </h4>
                              )}
                              {providerLogo && (
                                <img
                                  src={providerLogo}
                                  alt="UniPay logo"
                                  className="h-6 object-contain"
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation();
                                  handleToggleEnabled(setting);
                                }}
                                disabled={togglingProvider === setting.paymentProvider}
                                className={`px-2 py-1 border-2 border-black font-bold uppercase text-xs disabled:opacity-60 disabled:cursor-not-allowed ${
                                  setting.isEnabled
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                              >
                                {setting.isEnabled ? 'Disable' : 'Enable'}
                              </button>
                              <span className="font-bold text-base">{isExpanded ? '−' : '+'}</span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-4 border-t-2 border-black">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-xs text-gray-600">
                                  Provider ID: {setting.paymentProvider}
                                </div>
                                {!isEditing && (
                                  <button
                                    onClick={() => handleEdit(setting)}
                                    className="px-3 py-1 bg-[#FFD700] text-black font-bold uppercase text-xs border-2 border-black hover:bg-[#FFEE00] transition-colors"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>

                              {isUnipay && isDisabled && (
                                <div className="mb-3 px-3 py-2 border-2 border-red-600 bg-red-50 text-red-700 font-bold uppercase text-xs">
                                  UniPay endpoint responded with 500. Payment method disabled.
                                </div>
                              )}

                              {isEditing ? (
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-bold uppercase mb-1">
                                      Display Name
                                    </label>
                                    <input
                                      type="text"
                                      value={currentData.displayName || ''}
                                      onChange={e =>
                                        setFormData(prev => ({
                                          ...prev,
                                          displayName: e.target.value,
                                        }))
                                      }
                                      className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {setting.paymentProvider === 'unipay' && (
                                      <>
                                        <div>
                                          <label className="block text-xs font-bold uppercase mb-1">
                                            Merchant ID *
                                          </label>
                                          <p className="text-xs text-gray-600 mb-1">.env → UNIPAY_MERCHANT_ID</p>
                                          <input
                                            type="text"
                                            value={currentData.config?.merchantId || ''}
                                            onChange={e =>
                                              handleConfigChange('merchantId', e.target.value)
                                            }
                                            className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                            placeholder="5012485018831"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold uppercase mb-1">
                                            Secret Key *
                                          </label>
                                          <p className="text-xs text-gray-600 mb-1">.env → UNIPAY_SECRET_KEY (line 13)</p>
                                          <input
                                            type="password"
                                            value={currentData.config?.secretKey || ''}
                                            onChange={e =>
                                              handleConfigChange('secretKey', e.target.value)
                                            }
                                            className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                            placeholder="8c7f2b4b-..."
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold uppercase mb-1">
                                            Merchant User
                                          </label>
                                          <p className="text-xs text-gray-600 mb-1">.env → UNIPAY_MERCHANT_USER (line 14)</p>
                                          <input
                                            type="text"
                                            value={currentData.config?.merchantUser || ''}
                                            onChange={e =>
                                              handleConfigChange('merchantUser', e.target.value)
                                            }
                                            className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                            placeholder="merchant@example.com"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold uppercase mb-1">
                                            API URL
                                          </label>
                                          <input
                                            type="text"
                                            value={
                                              currentData.config?.apiUrl ||
                                              'https://apiv2.unipay.com/custom/checkout/v1'
                                            }
                                            onChange={e =>
                                              handleConfigChange('apiUrl', e.target.value)
                                            }
                                            className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold uppercase mb-1">
                                            Success URL
                                          </label>
                                          <input
                                            type="text"
                                            value={currentData.config?.successUrl || ''}
                                            onChange={e =>
                                              handleConfigChange('successUrl', e.target.value)
                                            }
                                            className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                            placeholder="http://localhost:5433/?payment=success"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold uppercase mb-1">
                                            Cancel URL
                                          </label>
                                          <input
                                            type="text"
                                            value={currentData.config?.cancelUrl || ''}
                                            onChange={e =>
                                              handleConfigChange('cancelUrl', e.target.value)
                                            }
                                            className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                            placeholder="http://localhost:5433/?payment=cancel"
                                          />
                                        </div>
                                        <div className="md:col-span-2">
                                          <label className="block text-xs font-bold uppercase mb-1">
                                            Callback URL
                                          </label>
                                          <input
                                            type="text"
                                            value={currentData.config?.callbackUrl || ''}
                                            onChange={e =>
                                              handleConfigChange('callbackUrl', e.target.value)
                                            }
                                            className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                            placeholder="http://localhost:5433/api/payments/unipay/callback"
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <div className="flex gap-2 justify-end mt-3">
                                    <button
                                      onClick={handleCancel}
                                      className="px-3 py-1 bg-gray-300 text-black font-bold uppercase text-xs border-2 border-black hover:bg-gray-400 transition-colors flex items-center gap-1"
                                    >
                                      <CloseIcon className="w-4 h-4" />
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSave(setting.paymentProvider)}
                                      className="px-3 py-1 bg-[#00C2FF] text-white font-bold uppercase text-xs border-2 border-black hover:bg-[#0099CC] transition-colors flex items-center gap-1"
                                    >
                                      <CheckIcon className="w-4 h-4" />
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {setting.paymentProvider === 'unipay' && (
                                    <>
                                      <div>
                                        <span className="font-bold">Merchant ID:</span>{' '}
                                        {setting.config.merchantId || 'Not set'}
                                      </div>
                                      <div>
                                        <span className="font-bold">Secret Key:</span>{' '}
                                        {setting.config.secretKey
                                          ? `${setting.config.secretKey.substring(0, 8)}...`
                                          : 'Not set'}
                                      </div>
                                      <div>
                                        <span className="font-bold">Merchant User:</span>{' '}
                                        {setting.config.merchantUser || 'Not set'}
                                      </div>
                                      <div>
                                        <span className="font-bold">API URL:</span>{' '}
                                        {setting.config.apiUrl || 'Default'}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

