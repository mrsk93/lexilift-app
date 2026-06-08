import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.next/**'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Stub 'server-only' in tests: it throws in node context but is a no-op in real Next.js builds
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'src/app/api/**', 'src/components/**'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/migrations/**'],
      thresholds: {
        statements: 41,
        branches: 34,
        functions: 39,
        lines: 42,
      },
    },
  }
})
