import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_URL || 'http://localhost:5000';
  const isNgrok = backendUrl.includes('ngrok');

  const proxyConfig = {
    target: backendUrl,
    changeOrigin: true,
    secure: false,
    headers: isNgrok ? { 'ngrok-skip-browser-warning': 'true' } : {},
  };

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      allowedHosts: true,
      proxy: {
        '/api': proxyConfig,
        '/uploads': proxyConfig,
        '/socket.io': {
          target: backendUrl,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      }
    }
  };
});
