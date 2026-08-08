const rawApiUrl = import.meta.env.VITE_API_URL;

// Guarantee production requests always target https://api.stackvil.com
// and ignore any stale ngrok URLs from environment settings.
export const API_BASE_URL = (rawApiUrl && !rawApiUrl.includes('ngrok'))
  ? rawApiUrl
  : 'https://api.stackvil.com';

export default API_BASE_URL;
