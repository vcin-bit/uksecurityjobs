# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow.spec.js >> API health >> Public jobs endpoint returns data
- Location: specs/full-flow.spec.js:134:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 403
```

# Test source

```ts
  36  |   // Try by placeholder
  37  |   await page.fill(`input[placeholder*="${label}" i]`, value).catch(() => {});
  38  | }
  39  | 
  40  | async function waitForNav(page) {
  41  |   await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  42  | }
  43  | 
  44  | // ── SUITE 1: Marketing site smoke tests ──────────────────────────────────────
  45  | 
  46  | test.describe('Marketing site', () => {
  47  | 
  48  |   test('Homepage loads and has correct H1', async ({ page }) => {
  49  |     await page.goto(MARKETING_URL);
  50  |     await waitForNav(page);
  51  |     const h1 = await page.locator('h1').first().textContent();
  52  |     expect(h1).toBeTruthy();
  53  |     console.log('Homepage H1:', h1);
  54  |   });
  55  | 
  56  |   test('Officers page loads', async ({ page }) => {
  57  |     await page.goto(`${MARKETING_URL}/officers`);
  58  |     await expect(page).not.toHaveTitle(/404|Not Found/i);
  59  |   });
  60  | 
  61  |   test('Employers page loads', async ({ page }) => {
  62  |     await page.goto(`${MARKETING_URL}/employers`);
  63  |     await expect(page).not.toHaveTitle(/404|Not Found/i);
  64  |   });
  65  | 
  66  |   test('Early access page loads and has form', async ({ page }) => {
  67  |     await page.goto(`${MARKETING_URL}/early-access`);
  68  |     await waitForNav(page);
  69  |     const emailInput = page.locator('input[type="email"]').first();
  70  |     await expect(emailInput).toBeVisible({ timeout: 10000 });
  71  |   });
  72  | 
  73  |   test('Blog loads', async ({ page }) => {
  74  |     await page.goto(`${MARKETING_URL}/blog`);
  75  |     await expect(page).not.toHaveTitle(/404|Not Found/i);
  76  |   });
  77  | 
  78  |   test('Salary guide loads', async ({ page }) => {
  79  |     await page.goto(`${MARKETING_URL}/security-salary-guide`);
  80  |     await expect(page).not.toHaveTitle(/404|Not Found/i);
  81  |   });
  82  | 
  83  |   test('Vacancies page loads', async ({ page }) => {
  84  |     await page.goto(`${MARKETING_URL}/vacancies`);
  85  |     await expect(page).not.toHaveTitle(/404|Not Found/i);
  86  |   });
  87  | 
  88  |   test('Sitemap is accessible', async ({ page }) => {
  89  |     const res = await page.request.get(`${MARKETING_URL}/sitemap.xml`);
  90  |     expect(res.status()).toBe(200);
  91  |   });
  92  | 
  93  | });
  94  | 
  95  | // ── SUITE 2: App — Public pages ───────────────────────────────────────────────
  96  | 
  97  | test.describe('App public pages', () => {
  98  | 
  99  |   test('Sign-in page loads', async ({ page }) => {
  100 |     await page.goto(`${APP_URL}/sign-in`);
  101 |     await waitForNav(page);
  102 |     const emailInput = page.locator('input[type="email"], input[name="identifier"], input[autocomplete="email"]').first();
  103 |     await expect(emailInput).toBeVisible({ timeout: 15000 });
  104 |   });
  105 | 
  106 |   test('Sign-up page loads', async ({ page }) => {
  107 |     await page.goto(`${APP_URL}/sign-up`);
  108 |     await waitForNav(page);
  109 |     const emailInput = page.locator('input[type="email"], input[name="email_address"]').first();
  110 |     await expect(emailInput).toBeVisible({ timeout: 15000 });
  111 |   });
  112 | 
  113 |   test('Jobs listing page loads', async ({ page }) => {
  114 |     await page.goto(`${APP_URL}/jobs`);
  115 |     await waitForNav(page);
  116 |     const body = await page.textContent('body');
  117 |     expect(body).toContain('SIA');
  118 |   });
  119 | 
  120 |   test('Employer sign-up page loads', async ({ page }) => {
  121 |     await page.goto(`${APP_URL}/employer/sign-up`);
  122 |     await waitForNav(page);
  123 |     await expect(page).not.toHaveTitle(/404|Not Found/i);
  124 |   });
  125 | 
  126 | });
  127 | 
  128 | // ── SUITE 3: API health checks ────────────────────────────────────────────────
  129 | 
  130 | test.describe('API health', () => {
  131 | 
  132 |   const API = 'https://uksecurityjobs-api.onrender.com';
  133 | 
  134 |   test('Public jobs endpoint returns data', async ({ request }) => {
  135 |     const res = await request.get(`${API}/api/jobs/public`);
> 136 |     expect(res.status()).toBe(200);
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  137 |     const body = await res.json();
  138 |     expect(body).toHaveProperty('jobs');
  139 |     expect(Array.isArray(body.jobs)).toBe(true);
  140 |     console.log(`Jobs returned: ${body.jobs.length}`);
  141 |   });
  142 | 
  143 |   test('Protected route returns 401 without token', async ({ request }) => {
  144 |     const res = await request.get(`${API}/api/candidates/me`);
  145 |     expect([401, 403]).toContain(res.status());
  146 |   });
  147 | 
  148 |   test('Employer jobs endpoint protected', async ({ request }) => {
  149 |     const res = await request.get(`${API}/api/employers/jobs`);
  150 |     expect([401, 403]).toContain(res.status());
  151 |   });
  152 | 
  153 |   test('Apply endpoint protected', async ({ request }) => {
  154 |     const res = await request.post(`${API}/api/jobs/apply`, {
  155 |       data: { job_id: 'test' }
  156 |     });
  157 |     expect([401, 403]).toContain(res.status());
  158 |   });
  159 | 
  160 | });
  161 | 
  162 | // ── SUITE 4: Candidate registration flow ─────────────────────────────────────
  163 | 
  164 | test.describe('Candidate registration', () => {
  165 | 
  166 |   test('Can reach sign-up and see email field', async ({ page }) => {
  167 |     await page.goto(`${APP_URL}/sign-up`);
  168 |     await waitForNav(page);
  169 | 
  170 |     // Clerk renders the form — wait for it
  171 |     const emailField = page.locator('input[name="email_address"], input[type="email"]').first();
  172 |     await expect(emailField).toBeVisible({ timeout: 20000 });
  173 |     console.log('Sign-up email field visible');
  174 |   });
  175 | 
  176 |   test('Sign-up form accepts input without errors', async ({ page }) => {
  177 |     await page.goto(`${APP_URL}/sign-up`);
  178 |     await waitForNav(page);
  179 | 
  180 |     const emailField = page.locator('input[name="email_address"], input[type="email"]').first();
  181 |     await expect(emailField).toBeVisible({ timeout: 20000 });
  182 |     await emailField.fill(CANDIDATE_EMAIL);
  183 | 
  184 |     const passField = page.locator('input[type="password"]').first();
  185 |     if (await passField.count()) {
  186 |       await passField.fill(CANDIDATE_PASSWORD);
  187 |     }
  188 | 
  189 |     // Check no immediate error
  190 |     const errorMsg = page.locator('[data-localization-key*="error"], .cl-formFieldError');
  191 |     await page.waitForTimeout(1000);
  192 |     const hasError = await errorMsg.count();
  193 |     console.log(`Error messages shown: ${hasError}`);
  194 |     // We don't submit — just verify the form accepts input cleanly
  195 |   });
  196 | 
  197 | });
  198 | 
  199 | // ── SUITE 5: Profile builder steps ───────────────────────────────────────────
  200 | 
  201 | test.describe('Profile builder UI', () => {
  202 | 
  203 |   test('Dashboard redirects unauthenticated users to sign-in', async ({ page }) => {
  204 |     await page.goto(`${APP_URL}/dashboard`);
  205 |     await waitForNav(page);
  206 |     // Should redirect to sign-in
  207 |     await expect(page).toHaveURL(/sign-in/);
  208 |   });
  209 | 
  210 |   test('Profile route protected', async ({ page }) => {
  211 |     await page.goto(`${APP_URL}/profile`);
  212 |     await waitForNav(page);
  213 |     await expect(page).toHaveURL(/sign-in/);
  214 |   });
  215 | 
  216 |   test('Employer route protected', async ({ page }) => {
  217 |     await page.goto(`${APP_URL}/employer`);
  218 |     await waitForNav(page);
  219 |     await expect(page).toHaveURL(/sign-in/);
  220 |   });
  221 | 
  222 | });
  223 | 
  224 | // ── SUITE 6: Job listings interactions ───────────────────────────────────────
  225 | 
  226 | test.describe('Job listings', () => {
  227 | 
  228 |   test('Filter by licence type works', async ({ page }) => {
  229 |     await page.goto(`${APP_URL}/jobs`);
  230 |     await waitForNav(page);
  231 | 
  232 |     const licenceFilter = page.locator('select').first();
  233 |     if (await licenceFilter.count()) {
  234 |       await licenceFilter.selectOption({ label: 'Door Supervisor' });
  235 |       await page.waitForTimeout(500);
  236 |       const body = await page.textContent('body');
```