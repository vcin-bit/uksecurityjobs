import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

test.describe('Authentication', () => {

  test('sign in page loads correctly', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByText('Sign in to your UK Security Jobs account')).toBeVisible();
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('Your password')).toBeVisible();
  });

  test('sign up page loads with GDPR consent box', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.getByText('Create your profile')).toBeVisible();
    // Button disabled until consent box ticked
    const btn = page.getByRole('button', { name: /Create My Profile/i });
    await expect(btn).toBeDisabled();
    // Tick consent box by clicking it
    await page.locator('[style*="f0f9ff"]').click();
    await expect(btn).toBeEnabled();
  });

  test('sign in with test account redirects to dashboard', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) test.skip();
    await page.goto('/sign-in');
    await page.fill('[placeholder="your@email.com"]', TEST_EMAIL);
    await page.fill('[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL(/\/(dashboard|employer)/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/(dashboard|employer)/);
  });

  test('employer sign up page loads', async ({ page }) => {
    await page.goto('/employer/sign-up');
    await expect(page.getByText('Register your company')).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByText('Reset your password')).toBeVisible();
  });

});
