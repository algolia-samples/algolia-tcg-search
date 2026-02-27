import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT) || 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
