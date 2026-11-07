import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    // Extra host names for the dev server, comma-separated: DEV_HOSTS=.example.net npm run dev
    allowedHosts: process.env.DEV_HOSTS?.split(','),
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      input: { main: 'index.html', studio: 'studio.html' },
    },
  },
});
