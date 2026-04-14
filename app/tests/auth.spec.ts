import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

test.describe('Authentication', () => {

  test('sign in page loads correctly', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('Your password')).toBeVisible();
  });

  test('sign up page loads with GDPR checkbox', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.getByText('Create your profile')).toBeVisible();
    await expect(page.getByText('Privacy Policy')).toBeVisible();
    // Button disabled until checkbox ticked
    const btn = page.getByRole('button', { name: /Create My Profile/i });
    await expect(btn).toBeDisabled();
    // Tick consent box
    await page.getByText('I agree to the').click();
    await expect(btn).toBeEnabled();
  });

  test('sign in with test account', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) test.skip();
    await page.goto('/sign-in');
    await page.fill('[placeholder="your@email.com"]', TEST_EMAIL);
    await page.fill('[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();
    // Should redirect to dashboard or employer
    await page.waitForURL(/\/(dashboard|employer)/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/(dashboard|employer)/);
  });

  test('employer sign up page loads', async ({ page }) => {
    await page.goto('/employer/sign-up');
    await expect(page.getByText('Create Employer Account')).toBeVisible();
  });

});
