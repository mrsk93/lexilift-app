import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/foundation.spec.ts'],
  use: { baseURL: process.env.APP_URL ?? 'http://localhost:3000' },
  webServer: process.env.CI
    ? undefined
    : { command: 'npm run dev', port: 3000, reuseExistingServer: true },
})
