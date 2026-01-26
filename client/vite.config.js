import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('react-confetti')) {
              return 'confetti';
            }
            if (id.includes('socket.io-client')) {
              return 'socket-io';
            }
          }
        },
      },
    },
  },
});