import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@preload': resolve(__dirname, 'src/preload'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/renderer/**/*.test.tsx'],
    setupFiles: ['./src/test-setup-renderer.ts'],
  },
})
