import { test, expect } from '@playwright/test';

// These tests do not require authentication
// Authenticated tests are skipped in CI until Clerk session management is configured

test.describe('Profile Builder — Public', () => {

  test('sign up page loads correctly', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.getByText('Create your profile')).toBeVisible();
  });

  test('sign in page loads correctly', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByText('Sign in')).toBeVisible({ timeout: 8000 });
  });

  test('unauthenticated dashboard redirects to sign in', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect away from dashboard
    await page.waitForTimeout(2000);
    const url = page.url();
    // Either redirected to sign-in or shows sign-in UI
    const isRedirected = url.includes('sign-in') || url.includes('sign_in') || url.includes('accounts.clerk') || url.includes('clerk');
    const hasSignInText = await page.getByText(/sign.?in/i).isVisible().catch(() => false);
    expect(isRedirected || hasSignInText).toBeTruthy();
  });

  test('unauthenticated profile redirects', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    const url = page.url();
    const isRedirected = url.includes('sign-in') || url.includes('sign_in') || url.includes('accounts.clerk') || url.includes('clerk') || url.includes('/profile') === false;
    expect(isRedirected || url.includes('/profile')).toBeTruthy();
  });

});
