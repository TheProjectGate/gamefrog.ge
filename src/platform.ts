import { Capacitor } from '@capacitor/core';

export type PlatformTarget = 'web' | 'android';

const normalize = (value?: string | null): PlatformTarget | null => {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith('android')) return 'android';
  if (lower.startsWith('web')) return 'web';
  return null;
};

const PLATFORM_OVERRIDE_STORAGE_KEY = 'gamefrog.platformPreference';

const getStoredPlatform = (): PlatformTarget | null => {
  if (typeof window === 'undefined') return null;
  try {
    return normalize(window.localStorage.getItem(PLATFORM_OVERRIDE_STORAGE_KEY));
  } catch {
    return null;
  }
};

const getQueryPlatform = (): PlatformTarget | null => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return normalize(params.get('platform'));
  } catch {
    return null;
  }
};

const envPlatform = normalize(import.meta.env.VITE_PLATFORM);
const nativePlatform = Capacitor?.isNativePlatform?.()
  ? normalize(Capacitor.getPlatform())
  : null;
const queryPlatform = getQueryPlatform();
const storedPlatform = getStoredPlatform();

export const platform: PlatformTarget = envPlatform ?? queryPlatform ?? storedPlatform ?? nativePlatform ?? 'web';
export const isAndroidPlatform = platform === 'android';

export const syncDocumentPlatformState = (target: PlatformTarget = platform) => {
  if (typeof document === 'undefined') return;

  const body = document.body;
  const classesToRemove: PlatformTarget[] = ['android', 'web'];

  classesToRemove.forEach((name) => body.classList.remove(`platform-${name}`));
  body.classList.add(`platform-${target}`);

  document.documentElement.dataset.platform = target;
};

export const setPlatformPreference = (nextPlatform: PlatformTarget | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (nextPlatform) {
      window.localStorage.setItem(PLATFORM_OVERRIDE_STORAGE_KEY, nextPlatform);
    } else {
      window.localStorage.removeItem(PLATFORM_OVERRIDE_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
};

export const getPlatformPreference = (): PlatformTarget | null => getStoredPlatform();
export const clearPlatformPreference = () => setPlatformPreference(null);

export const platformTokens = {
  cardRadius: 0,
  cardShadow: 'none',
  cardBorderWidth: 4,
  cardBorderColor: '#000000',
  buttonRadius: 0,
  buttonHeight: 44
} as const;

