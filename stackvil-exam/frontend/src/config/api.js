import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL;

const getEffectiveApiUrl = () => {
  if (rawApiUrl && !rawApiUrl.includes('ngrok')) {
    return rawApiUrl;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000';
    }
  }
  return 'https://api.stackvil.com';
};

export const API_BASE_URL = getEffectiveApiUrl();

// Global Axios Interceptor: Always enforce correct backend target (https://api.stackvil.com or http://localhost:5000)
// and automatically sanitize any legacy/cached requests targeting static frontend hosts (entrance.stackvil.com).
axios.interceptors.request.use((config) => {
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const targetBase = isLocal ? 'http://localhost:5000' : (rawApiUrl && !rawApiUrl.includes('ngrok') ? rawApiUrl : 'https://api.stackvil.com');

  if (!config.baseURL || config.baseURL.includes('entrance.stackvil.com')) {
    config.baseURL = targetBase;
  }
  if (config.url && config.url.startsWith('https://entrance.stackvil.com')) {
    config.url = config.url.replace('https://entrance.stackvil.com', targetBase);
  }
  return config;
}, (error) => Promise.reject(error));

axios.defaults.baseURL = API_BASE_URL;

export default API_BASE_URL;
