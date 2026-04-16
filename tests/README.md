# UKSecurityJobs — E2E Test Suite

Automated tests that simulate a human using the platform. Runs against the live site.

## What it tests

- **Marketing site** — all key pages load, no 404s
- **API health** — public endpoints return correct data, protected endpoints reject unauthenticated requests
- **App public pages** — sign-in, sign-up, jobs listing, employer sign-up
- **Candidate flow** — registration form accepts input, unauthenticated users redirected correctly
- **Job listings** — filters work, apply button redirects correctly
- **Admin panel** — accessible
- **Early access form** — validates correctly
- **SEO** — meta descriptions, canonical URLs, FAQ schema, NewsArticle schema
- **Mobile** — no horizontal scroll on 375px viewport

## How to run

```bash
cd tests
npm install
npx playwright install chromium

# Run everything
npm test

# Run just API checks
npm run test:api

# Run just marketing site
npm run test:marketing

# Run in a real browser window so you can watch it
npm run test:headed

# View the HTML report after a run
npm run report
```

## Reading results

- Green = pass
- Red = fail — check the screenshot in /tests/test-results/

## Mailinator

Tests use mailinator.com for throwaway emails. You can view any inbox at:
https://mailinator.com/v4/public/inboxes.jsp?to=EMAILNAME

No signup needed.

## Adding a new test

Add a new `test()` block to `specs/full-flow.spec.js`. Group it inside a `test.describe()` block with a clear name.
