import { test, expect } from '@playwright/test'

test('landing page renders and links to login', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /smart AI assistant/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /log in/i })).toBeVisible()
})

test('login page renders', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel(/email/i)).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})

test('unauthenticated dashboard access redirects to /login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
