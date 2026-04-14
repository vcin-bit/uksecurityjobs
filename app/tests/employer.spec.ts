import { test, expect } from '@playwright/test';

test.describe('Employer Pages — Public', () => {

  test('employer sign up page loads', async ({ page }) => {
    await page.goto('/employer/sign-up');
    await expect(page.getByText('Register Your Company')).toBeVisible({ timeout: 8000 });
  });

  test('employer sign up has required fields', async ({ page }) => {
    await page.goto('/employer/sign-up');
    await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

});

test.describe('Jobs Page — Public', () => {

  test('public jobs page loads', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8000 });
  });

  test('job filters are present', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('select').first()).toBeVisible({ timeout: 8000 });
  });

});
