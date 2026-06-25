import vue from '@vitejs/plugin-vue'
import { defineConfig, type UserConfig } from 'vite'
import type { InlineConfig } from 'vitest'

type ViteConfigWithVitest = UserConfig & {
  test?: InlineConfig
}

const config = {
  plugins: [vue()],
  root: '.',
  base: './',
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
} satisfies ViteConfigWithVitest

export default defineConfig(config)
