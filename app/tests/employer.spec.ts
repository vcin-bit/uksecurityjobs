import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.fill('[placeholder="your@email.com"]', TEST_EMAIL);
  await page.fill('[type="password"]', TEST_PASSWORD);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/(dashboard|employer)/, { timeout: 10000 });
}

test.describe('Employer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) test.skip();
    await signIn(page);
    await page.goto('/employer');
  });

  test('employer dashboard loads', async ({ page }) => {
    await expect(page.locator('.dashboard')).toBeVisible({ timeout: 8000 });
  });

  test('post a job button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Post a Job/i })).toBeVisible({ timeout: 8000 });
  });

  test('right to work notice is visible', async ({ page }) => {
    await expect(page.getByText(/Right to Work/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('employer registration form has all required fields', async ({ page }) => {
    await page.goto('/employer/sign-up');
    await expect(page.getByText('Register Your Company')).toBeVisible();
    await expect(page.locator('input[placeholder*="Securitas"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="12345678"]')).toBeVisible();
  });
});

test.describe('Jobs Page', () => {
  test('public jobs page loads', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.getByText('Security Jobs')).toBeVisible({ timeout: 8000 });
  });

  test('job filters are present', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('select').first()).toBeVisible({ timeout: 8000 });
  });
});
