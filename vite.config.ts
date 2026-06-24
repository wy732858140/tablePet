import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  root: '.',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  resolve: {
    alias: {
      '@shared': '/src/shared',
      '@renderer': '/src/renderer'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts']
  }
})
