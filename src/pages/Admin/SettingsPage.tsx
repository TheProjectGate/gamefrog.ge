import React, { useState, useEffect } from 'react';
import { CogIcon, CheckIcon, CloseIcon, TagIcon, ReceiptIcon } from '../../components/Icons';
import { MessageCircle, Trash2 } from 'lucide-react';
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
  
  // AI Chat Settings
  const [isAIChatSectionOpen, setIsAIChatSectionOpen] = useState(false);
  const [aiChatSettings, setAiChatSettings] = useState({
    enabled: true,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 1024,
    systemPrompt: '',
    geminiApiKey: '',
    openaiApiKey: '',
    deepseekApiKey: '',
    anthropicApiKey: '',
    customProviderApiKey: '',
    customProviderName: '',
    customProviderUrl: '',
    apiKeyConfigured: false,
    chatBubblesEnabled: true,
    chatBubblesTestMode: false,
    chatBubblesMinInterval: 20,
    chatBubblesMaxInterval: 40,
    chatBubblesDisplayDuration: 5,
    chatBubblesMaxPerDay: 10,
    commentsAutoHideDuration: 10,
    providerStatus: {
      primary: 'gemini',
      lastUsed: 'gemini',
      configured: {
        gemini: false,
        openai: false,
        deepseek: false,
        anthropic: false,
      },
    },
  });
  const [aiChatLoading, setAiChatLoading] = useState(true);
  const [savingAiChat, setSavingAiChat] = useState(false);

  useEffect(() => {
    fetchPaymentSettings();
    fetchGlobalTestMode();
    fetchAIChatSettings();
    // Load user settings when page opens
    if (isLoggedIn) {
      loadUserSettings().catch(error => {
        console.error('[SettingsPage] Failed to load user settings:', error);
      });
    }

    // Auto-refresh provider status every 10 seconds when AI chat section is open
    // (more frequent to catch provider switches faster)
    let intervalId: NodeJS.Timeout | null = null;
    if (isAIChatSectionOpen) {
      intervalId = setInterval(() => {
        fetchAIChatSettings();
      }, 10000); // Update every 10 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoggedIn, loadUserSettings, isAIChatSectionOpen]);

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

  const fetchAIChatSettings = async () => {
    try {
      const response = await fetchWithAuth('/api/ai-chat-settings');

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to load AI chat settings');
      }

      const data = await response.json();
      const settingsData = {
        enabled: data.enabled ?? true,
        provider: data.provider || 'gemini',
        model: data.model || 'gemini-2.5-flash',
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens ?? 1024,
        systemPrompt: data.systemPrompt || '',
        geminiApiKey: data.geminiApiKey || '',
        openaiApiKey: data.openaiApiKey || '',
        deepseekApiKey: data.deepseekApiKey || '',
        anthropicApiKey: data.anthropicApiKey || '',
        customProviderApiKey: data.customProviderApiKey || '',
        customProviderName: data.customProviderName || '',
        customProviderUrl: data.customProviderUrl || '',
        apiKeyConfigured: data.apiKeyConfigured ?? false,
        chatBubblesEnabled: data.chatBubblesEnabled ?? true,
        chatBubblesTestMode: data.chatBubblesTestMode ?? false,
        chatBubblesMinInterval: data.chatBubblesMinInterval ?? 20,
        chatBubblesMaxInterval: data.chatBubblesMaxInterval ?? 40,
        chatBubblesDisplayDuration: data.chatBubblesDisplayDuration ?? 5,
        chatBubblesMaxPerDay: data.chatBubblesMaxPerDay ?? 10,
        commentsAutoHideDuration: data.commentsAutoHideDuration ?? 10,
        providerStatus: data.providerStatus || {
          primary: data.provider || 'gemini',
          lastUsed: data.provider || 'gemini',
          configured: {
            gemini: !!(data.geminiApiKey),
            openai: !!(data.openaiApiKey),
            deepseek: !!(data.deepseekApiKey),
            anthropic: !!(data.anthropicApiKey),
          },
        },
      };
      
      setAiChatSettings(settingsData);
    } catch (error: any) {
      const message = error?.message || 'Failed to load AI chat settings';
      setToast(message);
      if (/sign in/i.test(message) || /authentication/i.test(message)) {
        openRegisterModal('Please sign in to manage AI chat settings.');
      }
    } finally {
      setAiChatLoading(false);
    }
  };

  const handleAIChatSettingsSave = async () => {
    setSavingAiChat(true);
    try {
      const response = await fetchWithAuth('/api/ai-chat-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: aiChatSettings.enabled,
          provider: aiChatSettings.provider || 'gemini',
          model: aiChatSettings.model || 'gemini-1.5-flash',
          temperature: typeof aiChatSettings.temperature === 'number' ? aiChatSettings.temperature : parseFloat(String(aiChatSettings.temperature || 0.7)),
          maxTokens: typeof aiChatSettings.maxTokens === 'number' ? aiChatSettings.maxTokens : parseInt(String(aiChatSettings.maxTokens || 1024), 10),
          systemPrompt: aiChatSettings.systemPrompt || undefined,
          geminiApiKey: aiChatSettings.geminiApiKey || undefined,
          openaiApiKey: aiChatSettings.openaiApiKey || undefined,
          deepseekApiKey: aiChatSettings.deepseekApiKey || undefined,
          anthropicApiKey: aiChatSettings.anthropicApiKey || undefined,
          customProviderApiKey: aiChatSettings.customProviderApiKey || undefined,
          customProviderName: aiChatSettings.customProviderName || undefined,
          customProviderUrl: aiChatSettings.customProviderUrl || undefined,
          chatBubblesEnabled: aiChatSettings.chatBubblesEnabled,
          chatBubblesTestMode: aiChatSettings.chatBubblesTestMode,
          chatBubblesMinInterval: aiChatSettings.chatBubblesMinInterval,
          chatBubblesMaxInterval: aiChatSettings.chatBubblesMaxInterval,
          chatBubblesDisplayDuration: aiChatSettings.chatBubblesDisplayDuration || 5,
          chatBubblesMaxPerDay: aiChatSettings.chatBubblesMaxPerDay || 10,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to update AI chat settings');
      }

      const data = await response.json();
      if (data.settings) {
        setAiChatSettings(prev => ({
          ...prev,
          ...data.settings,
          // Убеждаемся, что все поля присутствуют
          chatBubblesDisplayDuration: data.settings.chatBubblesDisplayDuration ?? prev.chatBubblesDisplayDuration ?? 5,
          chatBubblesMaxPerDay: data.settings.chatBubblesMaxPerDay ?? prev.chatBubblesMaxPerDay ?? 10,
          commentsAutoHideDuration: data.settings.commentsAutoHideDuration ?? prev.commentsAutoHideDuration ?? 10,
          providerStatus: data.settings.providerStatus || prev.providerStatus || {
            primary: data.settings.provider || 'gemini',
            lastUsed: data.settings.provider || 'gemini',
            configured: {
              gemini: !!(data.settings.geminiApiKey),
              openai: !!(data.settings.openaiApiKey),
              deepseek: !!(data.settings.deepseekApiKey),
              anthropic: !!(data.settings.anthropicApiKey),
            },
          },
        }));
      }
      setToast('AI Chat settings updated successfully');
    } catch (error: any) {
      const message = error?.message || 'Failed to update AI chat settings';
      setToast(message);
      if (/sign in/i.test(message) || /authentication/i.test(message)) {
        openRegisterModal('Please sign in to manage AI chat settings.');
      }
    } finally {
      setSavingAiChat(false);
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

  if (loading || globalTestLoading || aiChatLoading) {
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
          {/* AI Chat Settings */}
          <div className="bg-gray-100 border-4 border-black shadow-[4px_4px_0_0_#000]">
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setIsAIChatSectionOpen(prev => !prev)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFD700] flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-black" strokeWidth={3} />
                </div>
                <h3 className="text-xl font-bold uppercase">
                  AI Chat Settings
                </h3>
              </div>
              <span className="font-bold text-lg">
                {isAIChatSectionOpen ? '−' : '+'}
              </span>
            </button>

            {isAIChatSectionOpen && (
              <div className="p-4 border-t-4 border-black bg-white space-y-4">
                <p className="text-xs text-gray-600 mb-3">
                  Configure AI chat assistant. Choose a provider and enter API keys.
                </p>

                {/* Provider Status Indicators - Enhanced Visual Display */}
                <div className="bg-gray-50 border-4 border-black shadow-[4px_4px_0_0_#000] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-black uppercase">AI Provider Status</h4>
                    {aiChatSettings.providerStatus?.lastUsed && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFD700] border-2 border-black shadow-[2px_2px_0_0_#000]">
                        <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse"></div>
                        <span className="text-xs font-black uppercase text-black">
                          Active: {aiChatSettings.providerStatus.lastUsed.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'gemini', name: 'Gemini', color: 'bg-blue-500', icon: '⚡' },
                      { id: 'openai', name: 'OpenAI', color: 'bg-green-600', icon: '🤖' },
                      { id: 'deepseek', name: 'DeepSeek', color: 'bg-purple-600', icon: '🔮' },
                      { id: 'anthropic', name: 'Anthropic', color: 'bg-orange-600', icon: '🧠' },
                    ].map((provider) => {
                      const isConfigured = aiChatSettings.providerStatus?.configured?.[provider.id as keyof typeof aiChatSettings.providerStatus.configured] || false;
                      const isPrimary = aiChatSettings.providerStatus?.primary === provider.id;
                      const isLastUsed = aiChatSettings.providerStatus?.lastUsed === provider.id;
                      const isActive = isLastUsed;

                      return (
                        <div
                          key={provider.id}
                          className={`relative p-4 border-4 transition-all ${
                            isActive
                              ? 'bg-[#FFD700] border-[#FFD700] shadow-[6px_6px_0_0_#000] scale-105'
                              : isPrimary
                              ? 'bg-white border-blue-500 shadow-[4px_4px_0_0_#000]'
                              : 'bg-white border-gray-400 shadow-[2px_2px_0_0_#000] opacity-75'
                          }`}
                        >
                          {/* Active indicator border animation */}
                          {isActive && (
                            <div className="absolute -inset-1 border-4 border-green-500 rounded animate-pulse opacity-75"></div>
                          )}
                          
                          <div className="relative flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{provider.icon}</span>
                              <span className="text-base font-black uppercase">{provider.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Large status indicator */}
                              <div
                                className={`w-5 h-5 rounded-full border-3 border-black flex items-center justify-center ${
                                  isConfigured
                                    ? isActive
                                      ? 'bg-green-500 animate-pulse shadow-lg'
                                      : 'bg-yellow-400'
                                    : 'bg-gray-300'
                                }`}
                                title={
                                  isConfigured
                                    ? isActive
                                      ? 'Currently Active'
                                      : 'Configured'
                                    : 'Not configured'
                                }
                              >
                                {isActive && (
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                              
                              {isActive && (
                                <span className="text-xs font-black uppercase text-white bg-green-600 px-2 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">
                                  ACTIVE NOW
                                </span>
                              )}
                              {isPrimary && !isActive && (
                                <span className="text-xs font-black uppercase text-white bg-blue-600 px-2 py-1 border-2 border-black">
                                  PRIMARY
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="relative text-xs font-bold space-y-1">
                            <div className={`flex items-center gap-2 px-2 py-1 rounded border border-black ${
                              isConfigured ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <span className={`w-2.5 h-2.5 rounded-full border-2 border-black ${isConfigured ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                              <span>{isConfigured ? '✓ API Key Configured' : '✗ Not Configured'}</span>
                            </div>
                            {isPrimary && (
                              <div className="flex items-center gap-2 px-2 py-1 rounded bg-blue-100 border border-black">
                                <span className="w-2.5 h-2.5 rounded-full border-2 border-black bg-blue-500"></span>
                                <span>Selected as Primary</span>
                              </div>
                            )}
                            {isActive && !isPrimary && (
                              <div className="flex items-center gap-2 px-2 py-1 rounded bg-orange-100 border border-black">
                                <span className="w-2.5 h-2.5 rounded-full border-2 border-black bg-orange-500"></span>
                                <span>Fallback Active (switched from {aiChatSettings.providerStatus?.primary})</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Current Status Summary */}
                  {aiChatSettings.providerStatus?.lastUsed && (
                    <div className="mt-4 pt-4 border-t-4 border-black">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-700 mb-1">
                            Current AI Provider:
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-black uppercase text-black bg-[#FFD700] px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_#000]">
                              {aiChatSettings.providerStatus.lastUsed.toUpperCase()}
                            </span>
                            {aiChatSettings.providerStatus.lastUsed !== aiChatSettings.providerStatus.primary && (
                              <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 border-2 border-orange-500">
                                <span className="text-sm">⚠️</span>
                                <span className="text-xs font-bold text-orange-800">
                                  Switched from {aiChatSettings.providerStatus.primary} (quota/error)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600 mb-1">Primary:</p>
                          <span className="text-sm font-bold uppercase bg-blue-100 px-2 py-1 border-2 border-blue-500">
                            {aiChatSettings.providerStatus.primary}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="ai-provider" className="block text-xs font-bold uppercase mb-1">
                    AI Provider
                  </label>
                  <select
                    id="ai-provider"
                    value={aiChatSettings.provider || 'gemini'}
                    onChange={e => {
                      const newProvider = e.target.value;
                      const defaultModels: Record<string, string> = {
                        gemini: 'gemini-2.5-flash',
                        openai: 'gpt-4o',
                        deepseek: 'deepseek-chat',
                        anthropic: 'claude-3-5-sonnet-20241022',
                        custom: 'custom-model',
                      };
                      setAiChatSettings(prev => ({ 
                        ...prev, 
                        provider: newProvider,
                        model: defaultModels[newProvider] || prev.model,
                      }));
                    }}
                    className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI (ChatGPT)</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="custom">Custom Provider</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    Select the AI provider to use for chat responses.
                  </p>
                </div>

                {/* API Keys Section */}
                <div className="bg-gray-50 border-2 border-black shadow-[2px_2px_0_0_#000] p-3 space-y-3">
                  <h4 className="text-base font-bold uppercase">API Keys</h4>
                  
                  {/* Gemini API Key */}
                  <div>
                    <label htmlFor="gemini-api-key" className="block text-xs font-bold uppercase mb-1">
                      Gemini API Key
                    </label>
                    <input
                      id="gemini-api-key"
                      type="password"
                      value={aiChatSettings.geminiApiKey || ''}
                      onChange={e => setAiChatSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                      placeholder="Enter Gemini API key or leave empty to use GEMINI_API_KEY from .env"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Get your key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google AI Studio</a>
                    </p>
                  </div>

                  {/* OpenAI API Key */}
                  <div>
                    <label htmlFor="openai-api-key" className="block text-xs font-bold uppercase mb-1">
                      OpenAI API Key
                    </label>
                    <input
                      id="openai-api-key"
                      type="password"
                      value={aiChatSettings.openaiApiKey || ''}
                      onChange={e => setAiChatSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                      placeholder="Enter OpenAI API key or leave empty to use OPENAI_API_KEY from .env"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenAI Platform</a>
                    </p>
                  </div>

                  {/* DeepSeek API Key */}
                  <div>
                    <label htmlFor="deepseek-api-key" className="block text-xs font-bold uppercase mb-1">
                      DeepSeek API Key
                    </label>
                    <input
                      id="deepseek-api-key"
                      type="password"
                      value={aiChatSettings.deepseekApiKey || ''}
                      onChange={e => setAiChatSettings(prev => ({ ...prev, deepseekApiKey: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                      placeholder="Enter DeepSeek API key or leave empty to use DEEPSEEK_API_KEY from .env"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Get your key from <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">DeepSeek Platform</a>
                    </p>
                  </div>

                  {/* Anthropic API Key */}
                  <div>
                    <label htmlFor="anthropic-api-key" className="block text-xs font-bold uppercase mb-1">
                      Anthropic (Claude) API Key
                    </label>
                    <input
                      id="anthropic-api-key"
                      type="password"
                      value={aiChatSettings.anthropicApiKey || ''}
                      onChange={e => setAiChatSettings(prev => ({ ...prev, anthropicApiKey: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                      placeholder="Enter Anthropic API key or leave empty to use ANTHROPIC_API_KEY from .env"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Get your key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Anthropic Console</a>
                    </p>
                  </div>

                  {/* Custom Provider Fields */}
                  {(aiChatSettings.provider || 'gemini') === 'custom' && (
                    <>
                      <div>
                        <label htmlFor="custom-provider-name" className="block text-xs font-bold uppercase mb-1">
                          Custom Provider Name
                        </label>
                        <input
                          id="custom-provider-name"
                          type="text"
                          value={aiChatSettings.customProviderName || ''}
                          onChange={e => setAiChatSettings(prev => ({ ...prev, customProviderName: e.target.value }))}
                          className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                          placeholder="e.g., Local LLM, Custom API"
                        />
                      </div>
                      <div>
                        <label htmlFor="custom-provider-url" className="block text-xs font-bold uppercase mb-1">
                          Custom Provider API URL
                        </label>
                        <input
                          id="custom-provider-url"
                          type="text"
                          value={aiChatSettings.customProviderUrl}
                          onChange={e => setAiChatSettings(prev => ({ ...prev, customProviderUrl: e.target.value }))}
                          className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                          placeholder="https://api.example.com/v1/chat/completions"
                        />
                      </div>
                      <div>
                        <label htmlFor="custom-provider-api-key" className="block text-xs font-bold uppercase mb-1">
                          Custom Provider API Key
                        </label>
                        <input
                          id="custom-provider-api-key"
                          type="password"
                          value={aiChatSettings.customProviderApiKey || ''}
                          onChange={e => setAiChatSettings(prev => ({ ...prev, customProviderApiKey: e.target.value }))}
                          className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                          placeholder="Enter custom provider API key"
                        />
                      </div>
                    </>
                  )}

                  {/* API Key Status */}
                  <div className="pt-2 border-t-2 border-gray-300">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-bold uppercase">Current Provider Status</h5>
                      <span
                        className={`px-2 py-1 text-xs font-black uppercase border-2 border-black ${
                          aiChatSettings.apiKeyConfigured
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {aiChatSettings.apiKeyConfigured ? 'Configured' : 'Not Set'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {aiChatSettings.apiKeyConfigured
                        ? `${(aiChatSettings.provider || 'gemini').charAt(0).toUpperCase() + (aiChatSettings.provider || 'gemini').slice(1)} API key is configured.`
                        : `Please enter ${(aiChatSettings.provider || 'gemini').charAt(0).toUpperCase() + (aiChatSettings.provider || 'gemini').slice(1)} API key above or set it in environment variables.`}
                    </p>
                  </div>
                </div>

                {/* Enable/Disable AI */}
                <div className="flex items-center justify-between p-3 border-2 border-black">
                  <div>
                    <h4 className="text-base font-bold uppercase mb-1">Enable AI Chat</h4>
                    <p className="text-xs text-gray-600">
                      Turn AI-powered responses on or off. When disabled, chat will use rule-based responses only.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiChatSettings.enabled}
                      onChange={e => setAiChatSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FFD700] border-2 border-black peer-checked:bg-green-500 transition-colors relative">
                      <div className="absolute top-0.5 left-0.5 bg-white border-2 border-black w-6 h-6 transition-transform peer-checked:translate-x-7"></div>
                    </div>
                  </label>
                </div>

                {/* Model Selection */}
                <div>
                  <label htmlFor="ai-model" className="block text-xs font-bold uppercase mb-1">
                    AI Model
                  </label>
                  <select
                    id="ai-model"
                    value={aiChatSettings.model || 'gemini-2.5-flash'}
                    onChange={e => setAiChatSettings(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                  >
                    {(aiChatSettings.provider || 'gemini') === 'gemini' && (
                      <>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Latest, Recommended)</option>
                        <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Lightweight)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legacy)</option>
                        <option value="gemini-pro">Gemini Pro (Legacy)</option>
                      </>
                    )}
                    {(aiChatSettings.provider || 'gemini') === 'openai' && (
                      <>
                        <option value="gpt-4o">GPT-4o (Latest, Recommended)</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </>
                    )}
                    {(aiChatSettings.provider || 'gemini') === 'deepseek' && (
                      <>
                        <option value="deepseek-chat">DeepSeek Chat</option>
                        <option value="deepseek-coder">DeepSeek Coder</option>
                      </>
                    )}
                    {(aiChatSettings.provider || 'gemini') === 'anthropic' && (
                      <>
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Latest)</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                        <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                      </>
                    )}
                    {(aiChatSettings.provider || 'gemini') === 'custom' && (
                      <option value="custom-model">Custom Model</option>
                    )}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    {(aiChatSettings.provider || 'gemini') === 'gemini' && 'Flash is faster and cheaper, Pro is more capable for complex queries.'}
                    {(aiChatSettings.provider || 'gemini') === 'openai' && 'GPT-4o is the latest and most capable model.'}
                    {(aiChatSettings.provider || 'gemini') === 'deepseek' && 'DeepSeek Chat is optimized for general conversations.'}
                    {(aiChatSettings.provider || 'gemini') === 'anthropic' && 'Claude 3.5 Sonnet offers the best balance of speed and capability.'}
                    {(aiChatSettings.provider || 'gemini') === 'custom' && 'Model name will depend on your custom provider configuration.'}
                  </p>
                </div>

                {/* Temperature */}
                <div>
                  <label htmlFor="ai-temperature" className="block text-xs font-bold uppercase mb-1">
                    Temperature: {aiChatSettings.temperature}
                  </label>
                  <input
                    id="ai-temperature"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={aiChatSettings.temperature ?? 0.7}
                    onChange={e => setAiChatSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Focused (0)</span>
                    <span>Balanced (1)</span>
                    <span>Creative (2)</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Controls randomness. Lower = more consistent, Higher = more creative.
                  </p>
                </div>

                {/* Max Tokens */}
                <div>
                  <label htmlFor="ai-max-tokens" className="block text-xs font-bold uppercase mb-1">
                    Max Tokens: {aiChatSettings.maxTokens}
                  </label>
                  <input
                    id="ai-max-tokens"
                    type="range"
                    min="256"
                    max="4096"
                    step="256"
                    value={aiChatSettings.maxTokens ?? 1024}
                    onChange={e => setAiChatSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Short (256)</span>
                    <span>Medium (1024)</span>
                    <span>Long (4096)</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Maximum length of AI responses. Higher = longer responses.
                  </p>
                </div>

                {/* System Prompt */}
                <div>
                  <label htmlFor="ai-system-prompt" className="block text-xs font-bold uppercase mb-1">
                    System Prompt (Optional)
                  </label>
                  <textarea
                    id="ai-system-prompt"
                    value={aiChatSettings.systemPrompt || ''}
                    onChange={e => setAiChatSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700] resize-y"
                    placeholder="Custom instructions for the AI assistant..."
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Override default system prompt. Leave empty to use default personality.
                  </p>
                </div>

                {/* Chat Bubbles Settings */}
                <div className="bg-gray-50 border-2 border-black shadow-[2px_2px_0_0_#000] p-3 space-y-3">
                  <h4 className="text-base font-bold uppercase">Chat Bubbles Settings</h4>
                  <p className="text-xs text-gray-600">
                    Configure the floating comment bubbles that appear next to the chat avatar.
                  </p>

                  {/* Enable Chat Bubbles */}
                  <div className="flex items-center justify-between p-2 border-2 border-gray-200">
                    <div>
                      <h5 className="text-sm font-bold uppercase mb-1">Enable Chat Bubbles</h5>
                      <p className="text-xs text-gray-600">
                        Show floating comment bubbles next to the chat avatar.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiChatSettings.chatBubblesEnabled}
                        onChange={e => setAiChatSettings(prev => ({ ...prev, chatBubblesEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FFD700] border-2 border-black peer-checked:bg-green-500 transition-colors relative">
                        <div className="absolute top-0.5 left-0.5 bg-white border-2 border-black w-6 h-6 transition-transform peer-checked:translate-x-7"></div>
                      </div>
                    </label>
                  </div>

                  {/* Test Mode */}
                  <div className="flex items-center justify-between p-2 border-2 border-gray-200">
                    <div>
                      <h5 className="text-sm font-bold uppercase mb-1">Test Mode</h5>
                      <p className="text-xs text-gray-600">
                        When enabled, bubbles will always appear (useful for testing).
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiChatSettings.chatBubblesTestMode}
                        onChange={e => setAiChatSettings(prev => ({ ...prev, chatBubblesTestMode: e.target.checked }))}
                        className="sr-only peer"
                        disabled={!aiChatSettings.chatBubblesEnabled}
                      />
                      <div className={`w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FFD700] border-2 border-black peer-checked:bg-green-500 transition-colors relative ${!aiChatSettings.chatBubblesEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className="absolute top-0.5 left-0.5 bg-white border-2 border-black w-6 h-6 transition-transform peer-checked:translate-x-7"></div>
                      </div>
                    </label>
                  </div>

                  {/* Min Interval */}
                  <div>
                    <label htmlFor="chat-bubbles-min-interval" className="block text-xs font-bold uppercase mb-1">
                      Minimum Interval (seconds): {aiChatSettings.chatBubblesMinInterval}
                    </label>
                    <input
                      id="chat-bubbles-min-interval"
                      type="range"
                      min="5"
                      max="300"
                      step="5"
                      value={aiChatSettings.chatBubblesMinInterval}
                      onChange={e => {
                        const newMin = parseInt(e.target.value, 10);
                        setAiChatSettings(prev => ({
                          ...prev,
                          chatBubblesMinInterval: newMin,
                          chatBubblesMaxInterval: Math.max(prev.chatBubblesMaxInterval, newMin),
                        }));
                      }}
                      className="w-full"
                      disabled={!aiChatSettings.chatBubblesEnabled}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Minimum time between bubble appearances (5-300 seconds).
                    </p>
                  </div>

                  {/* Max Interval */}
                  <div>
                    <label htmlFor="chat-bubbles-max-interval" className="block text-xs font-bold uppercase mb-1">
                      Maximum Interval (seconds): {aiChatSettings.chatBubblesMaxInterval}
                    </label>
                    <input
                      id="chat-bubbles-max-interval"
                      type="range"
                      min="10"
                      max="600"
                      step="10"
                      value={aiChatSettings.chatBubblesMaxInterval}
                      onChange={e => {
                        const newMax = parseInt(e.target.value, 10);
                        setAiChatSettings(prev => ({
                          ...prev,
                          chatBubblesMaxInterval: newMax,
                          chatBubblesMinInterval: Math.min(prev.chatBubblesMinInterval, newMax),
                        }));
                      }}
                      className="w-full"
                      disabled={!aiChatSettings.chatBubblesEnabled}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Maximum time between bubble appearances (10-600 seconds). Must be ≥ minimum interval.
                    </p>
                  </div>

                  {/* Display Duration */}
                  <div>
                    <label htmlFor="chat-bubbles-display-duration" className="block text-xs font-bold uppercase mb-1">
                      Display Duration (seconds): {aiChatSettings.chatBubblesDisplayDuration || 5}
                    </label>
                    <input
                      id="chat-bubbles-display-duration"
                      type="range"
                      min="2"
                      max="30"
                      step="1"
                      value={aiChatSettings.chatBubblesDisplayDuration || 5}
                      onChange={e => {
                        const newDuration = parseInt(e.target.value, 10);
                        setAiChatSettings(prev => ({
                          ...prev,
                          chatBubblesDisplayDuration: newDuration,
                        }));
                      }}
                      className="w-full"
                      disabled={!aiChatSettings.chatBubblesEnabled}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      How long each comment bubble stays visible before switching to the next one (2-30 seconds).
                    </p>
                  </div>

                  {/* Max Comments Per Day */}
                  <div>
                    <label htmlFor="chat-bubbles-max-per-day" className="block text-xs font-bold uppercase mb-1">
                      Max Comments Per Day: {aiChatSettings.chatBubblesMaxPerDay || 10}
                    </label>
                    <input
                      id="chat-bubbles-max-per-day"
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={aiChatSettings.chatBubblesMaxPerDay || 10}
                      onChange={e => {
                        const newMaxPerDay = parseInt(e.target.value, 10);
                        setAiChatSettings(prev => ({
                          ...prev,
                          chatBubblesMaxPerDay: newMaxPerDay,
                        }));
                      }}
                      className="w-full"
                      disabled={!aiChatSettings.chatBubblesEnabled}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Maximum number of different comment bubbles to show per day (1-100). After reaching this limit, no more bubbles will be shown until the next day.
                    </p>
                  </div>

                  {/* Comments Auto-Hide Duration */}
                  <div>
                    <label htmlFor="comments-auto-hide-duration" className="block text-xs font-bold uppercase mb-1">
                      Comments Auto-Hide Duration (seconds): {aiChatSettings.commentsAutoHideDuration || 10}
                    </label>
                    <input
                      id="comments-auto-hide-duration"
                      type="range"
                      min="1"
                      max="300"
                      step="1"
                      value={aiChatSettings.commentsAutoHideDuration || 10}
                      onChange={e => {
                        const newDuration = parseInt(e.target.value, 10);
                        setAiChatSettings(prev => ({
                          ...prev,
                          commentsAutoHideDuration: newDuration,
                        }));
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Fast (1s)</span>
                      <span>Medium (10s)</span>
                      <span>Slow (300s)</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      How long comments will be displayed before automatically hiding. Comments appear from chat avatar.
                    </p>
                  </div>
                </div>

                {/* AI Quota Errors Section */}
                <div className="bg-yellow-50 border-2 border-yellow-400 shadow-[2px_2px_0_0_#000] p-3 space-y-3 mt-4">
                  <h4 className="text-base font-bold uppercase">AI Quota Errors</h4>
                  <p className="text-xs text-gray-600">
                    Information about AI API quota limit errors. These errors are logged automatically and not shown to users.
                  </p>
                  
                  <QuotaErrorsList />
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2 border-t-2 border-gray-200">
                  <button
                    onClick={handleAIChatSettingsSave}
                    disabled={savingAiChat}
                    className="px-4 py-2 bg-[#00C2FF] text-white font-bold uppercase text-sm border-2 border-black hover:bg-[#0099CC] transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingAiChat ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        Save Settings
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

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
                <p className="text-xs text-gray-600 mb-3">
                  Customize badge colors for different message types
                </p>

                <div className="space-y-2">
                  {([
                    { type: 'general' as const, label: 'General Messages' },
                    { type: 'order' as const, label: 'Order Receipts' },
                    { type: 'wishlist' as const, label: 'Wishlist Alerts' }
                  ]).map(({ type, label }) => {
                    const currentColor = badgeColors[type];
                    const getColorClass = (color: string) => {
                      const colorMap: Record<string, string> = {
                        red: 'bg-red-600',
                        green: 'bg-green-600',
                        blue: 'bg-blue-600',
                        yellow: 'bg-yellow-500',
                        purple: 'bg-purple-600',
                        pink: 'bg-pink-500',
                        orange: 'bg-orange-500',
                        cyan: 'bg-cyan-500'
                      };
                      return colorMap[color] || 'bg-gray-400';
                    };

                    return (
                      <div key={type} className="flex items-center gap-3 p-2 border-2 border-gray-200 hover:border-black transition-colors">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <span 
                            className={`w-6 h-6 rounded-full border-2 border-black ${getColorClass(currentColor)}`}
                            title={currentColor}
                          />
                          <span className="text-sm font-bold uppercase">{label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 justify-end">
                          {(['red', 'green', 'blue', 'yellow', 'purple', 'pink', 'orange', 'cyan'] as const).map(color => (
                            <button
                              key={color}
                              onClick={() => setBadgeColor(type, color)}
                              className={`w-7 h-7 rounded-full border-2 transition-all ${
                                currentColor === color 
                                  ? 'border-black ring-1 ring-offset-1 ring-black scale-110' 
                                  : 'border-gray-300 hover:border-black'
                              } ${getColorClass(color)} hover:scale-110`}
                              title={color}
                              aria-label={`Set ${label} to ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
                                    <label htmlFor={`payment-display-name-${setting.paymentProvider}`} className="block text-xs font-bold uppercase mb-1">
                                      Display Name
                                    </label>
                                    <input
                                      id={`payment-display-name-${setting.paymentProvider}`}
                                      name={`payment-display-name-${setting.paymentProvider}`}
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
                                          <label htmlFor={`payment-merchant-id-${setting.paymentProvider}`} className="block text-xs font-bold uppercase mb-1">
                                            Merchant ID *
                                          </label>
                                          <p className="text-xs text-gray-600 mb-1">.env → UNIPAY_MERCHANT_ID</p>
                                          <input
                                            id={`payment-merchant-id-${setting.paymentProvider}`}
                                            name={`payment-merchant-id-${setting.paymentProvider}`}
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
                                          <label htmlFor={`payment-secret-key-${setting.paymentProvider}`} className="block text-xs font-bold uppercase mb-1">
                                            Secret Key *
                                          </label>
                                          <p className="text-xs text-gray-600 mb-1">.env → UNIPAY_SECRET_KEY (line 13)</p>
                                          <input
                                            id={`payment-secret-key-${setting.paymentProvider}`}
                                            name={`payment-secret-key-${setting.paymentProvider}`}
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
                                          <label htmlFor={`payment-merchant-user-${setting.paymentProvider}`} className="block text-xs font-bold uppercase mb-1">
                                            Merchant User
                                          </label>
                                          <p className="text-xs text-gray-600 mb-1">.env → UNIPAY_MERCHANT_USER (line 14)</p>
                                          <input
                                            id={`payment-merchant-user-${setting.paymentProvider}`}
                                            name={`payment-merchant-user-${setting.paymentProvider}`}
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
                                          <label htmlFor={`payment-api-url-${setting.paymentProvider}`} className="block text-xs font-bold uppercase mb-1">
                                            API URL
                                          </label>
                                          <input
                                            id={`payment-api-url-${setting.paymentProvider}`}
                                            name={`payment-api-url-${setting.paymentProvider}`}
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
                                          <label htmlFor={`payment-success-url-${setting.paymentProvider}`} className="block text-xs font-bold uppercase mb-1">
                                            Success URL
                                          </label>
                                          <input
                                            id={`payment-success-url-${setting.paymentProvider}`}
                                            name={`payment-success-url-${setting.paymentProvider}`}
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
                                          <label htmlFor={`payment-cancel-url-${setting.paymentProvider}`} className="block text-xs font-bold uppercase mb-1">
                                            Cancel URL
                                          </label>
                                          <input
                                            id={`payment-cancel-url-${setting.paymentProvider}`}
                                            name={`payment-cancel-url-${setting.paymentProvider}`}
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
                                          <label htmlFor={`payment-callback-url-${setting.paymentProvider}`} className="block text-xs font-bold uppercase mb-1">
                                            Callback URL
                                          </label>
                                          <input
                                            id={`payment-callback-url-${setting.paymentProvider}`}
                                            name={`payment-callback-url-${setting.paymentProvider}`}
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

// Component for displaying AI quota errors
const QuotaErrorsList: React.FC = () => {
  const [quotaErrors, setQuotaErrors] = useState<Array<{
    id: number;
    error_message: string;
    user_email: string | null;
    created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const { setToast } = useStore();

  useEffect(() => {
    loadQuotaErrors();
  }, []);

  const loadQuotaErrors = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/ai-quota-errors?limit=50');
      if (response.ok) {
        const data = await response.json();
        setQuotaErrors(data.errors || []);
      }
    } catch (error) {
      console.error('Failed to load quota errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this quota error log?')) return;
    
    try {
      const response = await fetchWithAuth(`/api/ai-quota-errors/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setQuotaErrors(prev => prev.filter(e => e.id !== id));
        setToast('Quota error deleted');
      }
    } catch (error) {
      setToast('Failed to delete quota error');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all quota error logs?')) return;
    
    try {
      const response = await fetchWithAuth('/api/ai-quota-errors', {
        method: 'DELETE',
      });
      if (response.ok) {
        setQuotaErrors([]);
        setToast('All quota errors deleted');
      }
    } catch (error) {
      setToast('Failed to delete quota errors');
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-600">Loading quota errors...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold">
          Recent Errors: {quotaErrors.length}
        </span>
        {quotaErrors.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="text-xs px-2 py-1 bg-red-500 text-white border-2 border-black hover:bg-red-600 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
      
      {quotaErrors.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-4">
          No quota errors logged yet.
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto space-y-2">
          {quotaErrors.map(error => (
            <div
              key={error.id}
              className="bg-white border-2 border-yellow-300 p-2 text-xs"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="font-bold text-red-600 mb-1">
                    {error.error_message.substring(0, 100)}
                    {error.error_message.length > 100 ? '...' : ''}
                  </div>
                  <div className="text-gray-600">
                    {error.user_email && <span>User: {error.user_email} • </span>}
                    {new Date(error.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(error.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

