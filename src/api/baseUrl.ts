export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') {
    return import.meta.env.DEV ? 'http://localhost:5433' : 'https://gamefrog.ge';
  }

  return '';
};


