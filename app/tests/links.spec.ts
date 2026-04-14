import { test, expect } from '@playwright/test';

const MARKETING_URL = process.env.MARKETING_BASE_URL || 'https://www.uksecurityjobs.co.uk';

const KEY_PAGES = [
  '/',
  '/officers',
  '/employers',
  '/blog',
  '/about',
  '/privacy',
  '/terms',
  '/door-supervisor-jobs',
  '/security-jobs-london',
  '/blog/what-is-bs7858-vetting',
  '/vacancies',
];

test.describe('Page Load Checker', () => {

  test('all key pages return 200', async ({ request }) => {
    const failed: string[] = [];
    for (const path of KEY_PAGES) {
      try {
        const res = await request.get(`${MARKETING_URL}${path}`);
        if (res.status() === 404) failed.push(`${path} — 404`);
      } catch(e) {
        failed.push(`${path} — network error`);
      }
    }
    if (failed.length > 0) console.log('Failed pages:', failed);
    expect(failed).toHaveLength(0);
  });

});
