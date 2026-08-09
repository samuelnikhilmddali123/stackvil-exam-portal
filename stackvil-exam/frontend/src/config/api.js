const rawApiUrl = import.meta.env.VITE_API_URL;

// Guarantee correct API and Socket URL for both local development and production deployment
export const API_BASE_URL = (rawApiUrl && !rawApiUrl.includes('ngrok'))
  ? rawApiUrl
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? window.location.origin
    : 'http://localhost:5000';

export default API_BASE_URL;
