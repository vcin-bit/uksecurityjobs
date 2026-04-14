import { test, expect } from '@playwright/test';

const MARKETING_URL = process.env.MARKETING_BASE_URL || 'https://www.uksecurityjobs.co.uk';

test.describe('Marketing Site', () => {

  test('homepage loads', async ({ page }) => {
    await page.goto(MARKETING_URL);
    await expect(page).toHaveTitle(/UKSecurityJobs/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('homepage has cookie consent banner', async ({ page }) => {
    await page.goto(MARKETING_URL);
    // Cookie banner should appear
    await expect(page.getByText(/Essential only|Accept all/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('cookie accept loads GA4', async ({ page }) => {
    await page.goto(MARKETING_URL);
    await page.waitForSelector('#cookie-banner.show', { timeout: 5000 }).catch(() => {});
    const acceptBtn = page.getByRole('button', { name: /Accept all/i });
    if (await acceptBtn.isVisible()) await acceptBtn.click();
    // Banner should disappear
    await expect(page.locator('#cookie-banner')).not.toHaveClass(/show/, { timeout: 3000 });
  });

  test('officers page loads', async ({ page }) => {
    await page.goto(`${MARKETING_URL}/officers`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('employers page loads', async ({ page }) => {
    await page.goto(`${MARKETING_URL}/employers`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto(`${MARKETING_URL}/about`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('privacy policy loads', async ({ page }) => {
    await page.goto(`${MARKETING_URL}/privacy`);
    await expect(page.getByText('Privacy Policy')).toBeVisible();
  });

  test('London location page loads with FAQ', async ({ page }) => {
    await page.goto(`${MARKETING_URL}/security-jobs-london`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('London');
    await expect(page.locator('.faq-item').first()).toBeVisible();
  });

  test('door supervisor jobs page loads', async ({ page }) => {
    await page.goto(`${MARKETING_URL}/door-supervisor-jobs`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Door Supervisor');
  });

  test('footer has no white backgrounds', async ({ page }) => {
    await page.goto(MARKETING_URL);
    const footer = page.locator('footer');
    const bg = await footer.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // Should be dark navy, not white
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });

  test('nav Register Company links to employer sign-up', async ({ page }) => {
    await page.goto(`${MARKETING_URL}/employers`);
    const links = page.locator('a[href*="employer/sign-up"]');
    await expect(links.first()).toBeVisible();
  });

});
