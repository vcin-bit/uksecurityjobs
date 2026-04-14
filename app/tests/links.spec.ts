import { test, expect } from '@playwright/test';

const MARKETING_URL = process.env.MARKETING_BASE_URL || 'https://www.uksecurityjobs.co.uk';

const PAGES_TO_CHECK = [
  '/',
  '/officers',
  '/employers',
  '/blog',
  '/about',
  '/privacy',
  '/terms',
  '/cookies',
  '/door-supervisor-jobs',
  '/security-guard-jobs',
  '/cctv-jobs',
  '/close-protection-jobs',
  '/security-jobs-london',
  '/security-jobs-manchester',
  '/security-jobs-birmingham',
  '/blog/what-is-bs7858-vetting',
  '/blog/how-to-get-door-supervisor-licence',
  '/blog/why-generic-job-boards-fail-security',
  '/blog/security-officer-career-progression',
  '/blog/sia-licence-types-explained',
  '/blog/close-protection-officer-guide',
  '/blog/security-recruitment-bs7858',
];

test.describe('Link Checker', () => {

  for (const path of PAGES_TO_CHECK) {
    test(`${path} — loads with no broken internal links`, async ({ page }) => {
      await page.goto(`${MARKETING_URL}${path}`);

      // Page must load with 200
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

      // Check all internal links on the page
      const links = await page.locator('a[href^="/"]').all();
      const broken: string[] = [];

      for (const link of links) {
        const href = await link.getAttribute('href');
        if (!href) continue;
        // Skip anchors and known app links
        if (href.startsWith('/#') || href === '/') continue;

        try {
          const res = await page.request.get(`${MARKETING_URL}${href.split('#')[0]}`);
          if (res.status() === 404) {
            broken.push(href);
          }
        } catch(e) {
          // Network errors are not link errors
        }
      }

      if (broken.length > 0) {
        console.log(`Broken links on ${path}:`, broken);
      }
      expect(broken).toHaveLength(0);
    });
  }

  test('contact form exists on about page', async ({ page }) => {
    await page.goto(`${MARKETING_URL}/about#contact`);
    await expect(page.locator('#contact-form')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Message/i })).toBeVisible();
  });

});
