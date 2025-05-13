import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'
import dotenv from 'dotenv';
import fs from 'fs'
dotenv.config();

if (!process.env.VITE_PLIM_BACKEND_URL) {
  throw new Error('VITE_PLIM_BACKEND_URL environment variable is not set');
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env': process.env,
  },
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external access
  },
  build: {
    chunkSizeWarningLimit: 1000, // Set the limit to 1000 kB
  },
})
