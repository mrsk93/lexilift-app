import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    exclude: ['**/node_modules/**', '**/e2e/**/*.spec.ts', '**/.next/**'],
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
        // Global aggregate floor. The codebase still has many untested
        // routes/UI components; the global numbers track current totals
        // so they only fail CI on a real overall regression.
        statements: 41,
        branches: 34,
        functions: 39,
        lines: 42,
        // Per-glob aggregate thresholds for the well-tested adapter/LLM
        // surface. These files all sit at ~100% today; the thresholds
        // catch regressions on this code even when the global numbers
        // (dominated by untested routes) would not.
        'src/lib/llm/adapters/**': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/lib/llm/embeddings.ts': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'src/lib/adapters/reranker/**': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
      },
    },
  }
})
