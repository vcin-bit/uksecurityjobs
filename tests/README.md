# UKSecurityJobs — E2E Test Suite

Simulates a real human going through the full platform flow. Runs in a real browser (Chromium) so you can watch it happen, or headless in the background.

## What it tests

- All 7 marketing site pages load correctly
- API health checks
- Job listings page and filters
- Candidate registration flow
- Employer registration flow
- Job posting
- Email delivery via Mailinator

## Setup (one time only)

You need Python 3 installed. Then:

```bash
cd tests
pip3 install playwright
python3 -m playwright install chromium
```

## Run the tests

**Headless (background — just results):**
```bash
cd tests
python3 e2e_test.py
```

**Headed (watch the browser — recommended):**
```bash
cd tests
python3 e2e_test.py --headed
```

## What you'll see

```
============================================================
  UKSecurityJobs — E2E Test Suite
  Run ID: 123456
  Candidate: dsg.test.candidate.123456@mailinator.com
  Employer:  dsg.test.employer.123456@mailinator.com
============================================================

── Marketing Site ──────────────────────────────────
  PASS  Homepage loads
  PASS  Officers page loads
  PASS  Employers page loads
  PASS  Salary guide loads
  PASS  Blog index loads
  PASS  Early access page loads
  PASS  Door supervisor page loads

── API Health Checks ────────────────────────────────
  PASS  Public jobs API
  PASS  App sign-in page
  PASS  App sign-up page
  PASS  App jobs page
...
```

## Checking test emails

Each run generates a unique email address. To check emails during a run, go to:

**https://mailinator.com** and search for the email prefix shown at the top of the run output.

No account needed — Mailinator is fully public.

## Cleanup

Test accounts are created in Clerk. After testing, delete them at:
**https://dashboard.clerk.com** → Users → search for `dsg.test`

## Running after every deploy

Add this to your deploy process:
```bash
cd tests && python3 e2e_test.py
```

Returns exit code 0 if all pass, 1 if any fail.
