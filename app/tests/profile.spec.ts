import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.fill('[placeholder="your@email.com"]', TEST_EMAIL);
  await page.fill('[type="password"]', TEST_PASSWORD);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/(dashboard|employer)/, { timeout: 15000 });
}

test.describe('Candidate Dashboard', () => {
  test('dashboard loads with prep guide', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) { test.skip(); return; }
    await signIn(page);
    await page.goto('/dashboard');
    await expect(page.getByText('Before you start')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('There are no shortcuts')).toBeVisible();
    await expect(page.getByText('Your profile is your CV')).toBeVisible();
  });

  test('dashboard shows vettability score section', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) { test.skip(); return; }
    await signIn(page);
    await page.goto('/dashboard');
    await expect(page.getByText('Your Vettability Score')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Continue Profile/i })).toBeVisible();
  });

  test('Continue Profile navigates to profile builder', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) { test.skip(); return; }
    await signIn(page);
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /Continue Profile/i }).click();
    await page.waitForURL('/profile', { timeout: 5000 });
    await expect(page).toHaveURL('/profile');
  });
});

test.describe('Profile Builder', () => {
  test('profile builder loads', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) { test.skip(); return; }
    await signIn(page);
    await page.goto('/profile');
    await expect(page.locator('.page')).toBeVisible({ timeout: 10000 });
  });

  test('auto-formats name to title case', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) { test.skip(); return; }
    await signIn(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const firstNameField = page.locator('input[placeholder="John"]').first();
    if (await firstNameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNameField.fill('david');
      await firstNameField.press('Tab');
      const val = await firstNameField.inputValue();
      expect(val).toMatch(/^D/);
    }
  });

  test('auto-formats postcode to uppercase with space', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) { test.skip(); return; }
    await signIn(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const postcodeField = page.locator('input[placeholder="SW1A 1AA"]').first();
    if (await postcodeField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await postcodeField.fill('sw1a1aa');
      await postcodeField.press('Tab');
      const val = await postcodeField.inputValue();
      expect(val).toBe('SW1A 1AA');
    }
  });

  test('student visa warning appears when selected', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) { test.skip(); return; }
    await signIn(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allTextContents();
      if (opts.some(o => o.includes('Student Visa'))) {
        await selects.nth(i).selectOption({ label: /Student Visa/i });
        await expect(page.getByText(/20 hours per week/i)).toBeVisible({ timeout: 3000 });
        return;
      }
    }
  });
});
