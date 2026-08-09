const rawApiUrl = import.meta.env.VITE_API_URL;

// If VITE_API_URL is provided, use it.
// If running locally (localhost / 127.0.0.1), target local backend http://localhost:5000.
// Otherwise, target production backend https://api.stackvil.com.
export const API_BASE_URL = (rawApiUrl && !rawApiUrl.includes('ngrok'))
  ? rawApiUrl
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:5000'
    : 'https://api.stackvil.com';

export default API_BASE_URL;
