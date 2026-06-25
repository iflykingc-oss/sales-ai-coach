import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'packages/web/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'api/__tests__/**/*.test.ts',
      'packages/web/src/**/*.test.{ts,tsx}',
    ],
    setupFiles: ['packages/web/src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'packages/ai-service/'],
    },
  },
});
