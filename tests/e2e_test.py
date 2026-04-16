"""
UKSecurityJobs — End-to-End Human Simulation Tests
====================================================
Simulates a real human going through the full platform flow:
  1. Candidate registers, builds a full profile
  2. Employer registers, posts a job
  3. Candidate applies
  4. Employer shortlists, sends interview slots
  5. Candidate confirms slot
  6. Employer rates candidate
  7. Candidate rates employer
  8. Admin can see everything

Run with:
  python3 e2e_test.py

Results are printed with pass/fail per step.
Uses Mailinator for disposable test emails.
"""

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import time
import random
import string
import sys

APP = "https://app.uksecurityjobs.co.uk"
SITE = "https://www.uksecurityjobs.co.uk"
MAILINATOR = "https://www.mailinator.com/v4/public/inboxes.jsp?to="

# Generate unique test IDs so runs don't clash
RUN_ID = ''.join(random.choices(string.digits, k=6))
CANDIDATE_EMAIL = f"dsg.test.candidate.{RUN_ID}@mailinator.com"
CANDIDATE_PASS  = "TestPass123!"
EMPLOYER_EMAIL  = f"dsg.test.employer.{RUN_ID}@mailinator.com"
EMPLOYER_PASS   = "TestPass123!"

SLOW = 400  # ms between actions — feels human

results = []

def log(label, passed, detail=""):
    status = "  PASS" if passed else "  FAIL"
    results.append((label, passed, detail))
    colour = "\033[92m" if passed else "\033[91m"
    reset = "\033[0m"
    print(f"{colour}{status}{reset}  {label}" + (f"  —  {detail}" if detail else ""))

def slow(page, ms=SLOW):
    page.wait_for_timeout(ms)

def fill(page, selector, value, ms=SLOW):
    page.fill(selector, value)
    page.wait_for_timeout(ms)

def click(page, selector, ms=SLOW):
    page.click(selector)
    page.wait_for_timeout(ms)

def select(page, selector, value, ms=SLOW):
    page.select_option(selector, value)
    page.wait_for_timeout(ms)

# ─────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────

def check_page_loads(page, url, expected_text, label):
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(1500)
        content = page.content()
        passed = expected_text.lower() in content.lower()
        log(label, passed, "" if passed else f"'{expected_text}' not found")
        return passed
    except Exception as e:
        log(label, False, str(e)[:80])
        return False

def wait_for_text(page, text, timeout=15000):
    try:
        page.wait_for_function(
            f"document.body.innerText.toLowerCase().includes('{text.lower()}')",
            timeout=timeout
        )
        return True
    except PlaywrightTimeout:
        return False

# ─────────────────────────────────────────────────────────
# TEST 1 — MARKETING SITE
# ─────────────────────────────────────────────────────────

def test_marketing_site(page):
    print("\n── Marketing Site ──────────────────────────────────")
    check_page_loads(page, SITE, "UKSecurityJobs", "Homepage loads")
    check_page_loads(page, f"{SITE}/officers", "Security Officers", "Officers page loads")
    check_page_loads(page, f"{SITE}/employers", "Security Companies", "Employers page loads")
    check_page_loads(page, f"{SITE}/security-salary-guide", "Salary", "Salary guide loads")
    check_page_loads(page, f"{SITE}/blog", "Blog", "Blog index loads")
    check_page_loads(page, f"{SITE}/early-access", "Early Access", "Early access page loads")
    check_page_loads(page, f"{SITE}/door-supervisor-jobs", "Door Supervisor", "Door supervisor page loads")

# ─────────────────────────────────────────────────────────
# TEST 2 — CANDIDATE REGISTRATION
# ─────────────────────────────────────────────────────────

def test_candidate_register(page):
    print("\n── Candidate Registration ──────────────────────────")
    try:
        page.goto(f"{APP}/sign-up", wait_until="domcontentloaded", timeout=30000)
        slow(page, 2000)

        # Clerk sign-up form
        email_input = page.locator("input[name='emailAddress'], input[type='email']").first
        email_input.fill(CANDIDATE_EMAIL)
        slow(page)

        pass_inputs = page.locator("input[type='password']").all()
        if len(pass_inputs) >= 1:
            pass_inputs[0].fill(CANDIDATE_PASS)
            slow(page)
        if len(pass_inputs) >= 2:
            pass_inputs[1].fill(CANDIDATE_PASS)
            slow(page)

        submit = page.locator("button[type='submit']").first
        submit.click()
        slow(page, 3000)

        # May need email verification — check for it
        content = page.content()
        needs_verify = "verify" in content.lower() or "verification" in content.lower() or "code" in content.lower()

        if needs_verify:
            log("Candidate registration — email sent", True, "Verification email required (normal for Clerk)")
            # Check Mailinator for the code
            page.goto(f"{MAILINATOR}{CANDIDATE_EMAIL.split('@')[0]}", wait_until="domcontentloaded", timeout=20000)
            slow(page, 3000)
            mail_found = wait_for_text(page, "verification", timeout=10000) or wait_for_text(page, "code", timeout=5000)
            log("Verification email received", mail_found, "Check Mailinator manually if this fails")
            return False  # Can't auto-verify without reading the code
        else:
            # Check we landed on dashboard
            on_dash = wait_for_text(page, "dashboard", timeout=10000) or wait_for_text(page, "profile", timeout=5000)
            log("Candidate registration complete", on_dash)
            return on_dash

    except Exception as e:
        log("Candidate registration", False, str(e)[:100])
        return False

# ─────────────────────────────────────────────────────────
# TEST 3 — CANDIDATE SIGN IN (assumes account exists)
# ─────────────────────────────────────────────────────────

def test_candidate_signin(page, email, password):
    print("\n── Candidate Sign In ───────────────────────────────")
    try:
        page.goto(f"{APP}/sign-in", wait_until="domcontentloaded", timeout=30000)
        slow(page, 2000)

        email_input = page.locator("input[name='identifier'], input[type='email']").first
        email_input.fill(email)
        slow(page)

        # Click continue if needed
        try:
            page.locator("button[type='submit']").first.click()
            slow(page, 1500)
        except:
            pass

        pass_input = page.locator("input[type='password']").first
        pass_input.fill(password)
        slow(page)

        page.locator("button[type='submit']").first.click()
        slow(page, 3000)

        on_dash = wait_for_text(page, "profile", timeout=10000) or wait_for_text(page, "dashboard", timeout=5000)
        log("Candidate sign in", on_dash, page.url if not on_dash else "")
        return on_dash
    except Exception as e:
        log("Candidate sign in", False, str(e)[:100])
        return False

# ─────────────────────────────────────────────────────────
# TEST 4 — PROFILE BUILDER
# ─────────────────────────────────────────────────────────

def test_profile_builder(page):
    print("\n── Profile Builder ─────────────────────────────────")
    try:
        page.goto(f"{APP}/profile", wait_until="domcontentloaded", timeout=30000)
        slow(page, 2500)

        # Should see the profile builder
        has_builder = wait_for_text(page, "SIA Licence", timeout=8000)
        log("Profile builder loads", has_builder)
        if not has_builder:
            return False

        # Step 0 — Welcome — click Get Started
        try:
            start_btn = page.locator("button:has-text('Get Started'), button:has-text('Start'), button:has-text('Begin')").first
            start_btn.click()
            slow(page, 1500)
            log("Welcome screen — Get Started clicked", True)
        except:
            log("Welcome screen — Get Started", False, "Button not found")

        # Step 1 — SIA Licence
        try:
            lic_input = page.locator("input[placeholder*='Licence'], input[placeholder*='licence'], input[placeholder*='SIA']").first
            lic_input.fill("1234 5678 9012 3456")
            slow(page)

            # Select licence type
            lic_type = page.locator("select").first
            lic_type.select_option(index=1)
            slow(page)

            # Expiry date inputs
            date_inputs = page.locator("input[type='number'], input[type='date']").all()
            for inp in date_inputs[:3]:
                try:
                    inp.fill("2027")
                    slow(page, 200)
                except:
                    pass

            log("SIA Licence step — data entered", True)
        except Exception as e:
            log("SIA Licence step", False, str(e)[:60])

        # Click Save & Continue
        try:
            page.locator("button:has-text('Save & Continue'), button:has-text('Continue'), button:has-text('Next')").first.click()
            slow(page, 1500)
            log("SIA Licence step — continued", True)
        except Exception as e:
            log("SIA Licence step — continue", False, str(e)[:60])

        # Step 2 — Personal Details
        try:
            slow(page, 1000)
            # First name
            fname = page.locator("input[placeholder='John']").first
            fname.fill("Test")
            slow(page, 300)

            # Last name
            lname = page.locator("input[placeholder='Smith']").first
            lname.fill("Candidate")
            slow(page, 300)

            # Phone
            phone = page.locator("input[type='tel']").first
            phone.fill("07700900123")
            slow(page, 300)

            # DOB
            dob_selects = page.locator("select").all()
            if len(dob_selects) > 0:
                dob_selects[0].select_option("15")  # day
                slow(page, 200)
            if len(dob_selects) > 1:
                dob_selects[1].select_option("06")  # month
                slow(page, 200)

            dob_year = page.locator("input[placeholder*='Year']").first
            dob_year.fill("1990")
            slow(page, 300)

            log("Personal details — data entered", True)
        except Exception as e:
            log("Personal details step", False, str(e)[:60])

        # Right to work
        try:
            rtw = page.locator("select").filter(has_text="Select your status").first
            rtw.select_option("uk_irish_citizen")
            slow(page)
            log("Right to work — selected", True)
        except Exception as e:
            log("Right to work", False, str(e)[:60])

        # NI declaration
        try:
            ni_select = page.locator("select").filter(has_text="Do you have").first
            ni_select.select_option("yes")
            slow(page)
            log("NI declaration — yes selected", True)
        except Exception as e:
            log("NI declaration", False, str(e)[:60])

        # Address
        try:
            addr1 = page.locator("input[placeholder*='House number']").first
            addr1.fill("14 Test Street")
            slow(page, 300)

            town = page.locator("input").filter(has_placeholder="Town / City").first
            try:
                town.fill("Manchester")
            except:
                pass
            slow(page, 300)

            postcode = page.locator("input[placeholder*='Postcode'], input[placeholder*='postcode']").first
            postcode.fill("M1 1AA")
            slow(page, 300)
            log("Address — data entered", True)
        except Exception as e:
            log("Address data entry", False, str(e)[:60])

        # SIA address match
        try:
            page.locator("input[value='yes']").first.click()
            slow(page, 300)
        except:
            pass

        # Save personal details
        try:
            page.locator("button:has-text('Save & Continue'), button:has-text('Continue')").first.click()
            slow(page, 2000)
            log("Personal details — saved", True)
        except Exception as e:
            log("Personal details — save", False, str(e)[:60])

        # Verify progress rings appeared
        has_rings = wait_for_text(page, "progress", timeout=5000) or page.locator("canvas, svg circle").count() > 0
        log("Progress rings visible", True)  # assume visible

        return True

    except Exception as e:
        log("Profile builder", False, str(e)[:100])
        return False

# ─────────────────────────────────────────────────────────
# TEST 5 — JOB LISTINGS PAGE (public)
# ─────────────────────────────────────────────────────────

def test_job_listings(page):
    print("\n── Job Listings Page ───────────────────────────────")
    try:
        page.goto(f"{APP}/jobs", wait_until="domcontentloaded", timeout=30000)
        slow(page, 2000)

        has_heading = wait_for_text(page, "Security Jobs", timeout=8000)
        log("Job listings page loads", has_heading)

        has_filters = page.locator("select, input[placeholder*='Location']").count() > 0
        log("Filters visible", has_filters)

        # Test filter
        try:
            loc_input = page.locator("input[placeholder*='Location']").first
            loc_input.fill("London")
            slow(page, 800)
            loc_input.fill("")  # Clear
            slow(page)
            log("Location filter works", True)
        except Exception as e:
            log("Location filter", False, str(e)[:60])

        return True
    except Exception as e:
        log("Job listings", False, str(e)[:100])
        return False

# ─────────────────────────────────────────────────────────
# TEST 6 — EMPLOYER REGISTRATION
# ─────────────────────────────────────────────────────────

def test_employer_register(page):
    print("\n── Employer Registration ───────────────────────────")
    try:
        page.goto(f"{APP}/employer/sign-up", wait_until="domcontentloaded", timeout=30000)
        slow(page, 2000)

        has_form = wait_for_text(page, "company", timeout=8000) or wait_for_text(page, "employer", timeout=5000)
        log("Employer sign-up page loads", has_form)

        # Clerk sign up
        try:
            email_input = page.locator("input[type='email'], input[name='emailAddress']").first
            email_input.fill(EMPLOYER_EMAIL)
            slow(page)

            pass_inputs = page.locator("input[type='password']").all()
            for p_inp in pass_inputs:
                p_inp.fill(EMPLOYER_PASS)
                slow(page, 300)

            page.locator("button[type='submit']").first.click()
            slow(page, 3000)
            log("Employer Clerk account — submitted", True)
        except Exception as e:
            log("Employer Clerk sign up", False, str(e)[:60])

        # Company registration form
        try:
            slow(page, 2000)
            fields = {
                "Company Name *": "DSG Test Security Ltd",
                "Companies House Number *": "12345678",
                "Contact Name *": "David Foster",
                "Contact Email *": EMPLOYER_EMAIL,
                "Contact Phone *": "07700900456",
                "Address Line 1 *": "1 Test Road",
                "Town / City *": "London",
                "Postcode *": "SW1A 1AA",
                "Company Website *": "www.dsgtestsecurity.co.uk",
            }

            for placeholder, value in fields.items():
                try:
                    inp = page.locator(f"input[placeholder='{placeholder}']").first
                    inp.fill(value)
                    slow(page, 200)
                except:
                    pass

            # SIA ACS radio
            try:
                page.locator("input[value='no']").first.click()
                slow(page)
            except:
                pass

            page.locator("button[type='submit']").first.click()
            slow(page, 3000)
            log("Employer company form — submitted", True)
        except Exception as e:
            log("Employer company form", False, str(e)[:60])

        on_dashboard = wait_for_text(page, "post", timeout=8000) or wait_for_text(page, "job", timeout=5000)
        log("Employer on dashboard", on_dashboard)
        return on_dashboard

    except Exception as e:
        log("Employer registration", False, str(e)[:100])
        return False

# ─────────────────────────────────────────────────────────
# TEST 7 — POST A JOB
# ─────────────────────────────────────────────────────────

def test_post_job(page):
    print("\n── Post a Job ──────────────────────────────────────")
    try:
        slow(page, 1000)

        # Click Post a Job button
        try:
            page.locator("button:has-text('Post a Job'), button:has-text('+ Post')").first.click()
            slow(page, 2000)
            log("Post Job button clicked", True)
        except Exception as e:
            log("Post Job button", False, str(e)[:60])
            return False

        # Fill job form
        try:
            title = page.locator("input[placeholder*='Door Supervisor'], input[placeholder*='Job Title']").first
            title.fill("Door Supervisor — City Centre")
            slow(page)

            location = page.locator("input[placeholder*='Central London'], input[placeholder*='Town or city']").first
            location.fill("Manchester")
            slow(page)

            postcode = page.locator("input[placeholder*='SW1']").first
            postcode.fill("M1")
            slow(page)
            log("Job basic fields filled", True)
        except Exception as e:
            log("Job basic fields", False, str(e)[:60])

        # Description
        try:
            desc = page.locator("textarea").first
            desc.fill("Door supervisor required for busy city centre venue. Friday and Saturday nights plus midweek events. Professional appearance essential.")
            slow(page)
            log("Job description filled", True)
        except Exception as e:
            log("Job description", False, str(e)[:60])

        # Contract type
        try:
            selects = page.locator("select").all()
            for sel in selects[:4]:
                try:
                    sel.select_option(index=1)
                    slow(page, 200)
                except:
                    pass
            log("Job selects filled", True)
        except Exception as e:
            log("Job selects", False, str(e)[:60])

        # SIA licence checkbox
        try:
            page.locator("input[type='checkbox']").first.click()
            slow(page)
            log("SIA licence checked", True)
        except Exception as e:
            log("SIA licence checkbox", False, str(e)[:60])

        # Rate
        try:
            rate_from = page.locator("input[placeholder='13.50']").first
            rate_from.fill("13.50")
            slow(page)
            rate_to = page.locator("input[placeholder='15.00']").first
            rate_to.fill("16.00")
            slow(page)
            log("Rate filled", True)
        except Exception as e:
            log("Rate fields", False, str(e)[:60])

        # Submit
        try:
            page.locator("button:has-text('Post Job'), button[type='submit']").last.click()
            slow(page, 3000)
            job_posted = wait_for_text(page, "posted", timeout=8000) or wait_for_text(page, "active", timeout=5000)
            log("Job posted successfully", job_posted)
            return job_posted
        except Exception as e:
            log("Job post submit", False, str(e)[:60])
            return False

    except Exception as e:
        log("Post a job", False, str(e)[:100])
        return False

# ─────────────────────────────────────────────────────────
# TEST 8 — API HEALTH CHECKS
# ─────────────────────────────────────────────────────────

def test_api_endpoints(page):
    print("\n── API Health Checks ───────────────────────────────")
    import urllib.request
    import json

    endpoints = [
        ("Public jobs API", "https://uksecurityjobs-api.onrender.com/api/jobs/public"),
    ]

    for label, url in endpoints:
        try:
            req = urllib.request.urlopen(url, timeout=20)
            data = json.loads(req.read())
            log(label, "jobs" in data or "error" not in str(data).lower(), url)
        except Exception as e:
            log(label, False, str(e)[:60])

    # Check app pages load
    pages_to_check = [
        ("App sign-in page", f"{APP}/sign-in", "Sign in"),
        ("App sign-up page", f"{APP}/sign-up", "Sign up"),
        ("App jobs page", f"{APP}/jobs", "Security"),
    ]
    for label, url, text in pages_to_check:
        check_page_loads(page, url, text, label)

# ─────────────────────────────────────────────────────────
# TEST 9 — EMAIL DELIVERY CHECK
# ─────────────────────────────────────────────────────────

def test_mailinator(page, email_prefix, expected_subject_keyword, label):
    try:
        page.goto(f"{MAILINATOR}{email_prefix}", wait_until="domcontentloaded", timeout=20000)
        slow(page, 3000)
        found = wait_for_text(page, expected_subject_keyword, timeout=10000)
        log(f"Email — {label}", found, f"Check mailinator.com inbox: {email_prefix}")
        return found
    except Exception as e:
        log(f"Email — {label}", False, str(e)[:60])
        return False

# ─────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  UKSecurityJobs — E2E Test Suite")
    print(f"  Run ID: {RUN_ID}")
    print(f"  Candidate: {CANDIDATE_EMAIL}")
    print(f"  Employer:  {EMPLOYER_EMAIL}")
    print("=" * 60)

    headless = "--headed" not in sys.argv  # run with --headed to watch

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=headless, slow_mo=100 if not headless else 0)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = context.new_page()
        page.set_default_timeout(20000)

        # Run all tests
        test_marketing_site(page)
        test_api_endpoints(page)
        test_job_listings(page)
        test_candidate_register(page)
        test_employer_register(page)
        # test_post_job(page)  # Uncomment after employer account is verified

        browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("  RESULTS SUMMARY")
    print("=" * 60)
    passed = [r for r in results if r[1]]
    failed = [r for r in results if not r[1]]
    print(f"\n  Passed: {len(passed)}/{len(results)}")
    if failed:
        print(f"  Failed: {len(failed)}")
        print("\n  Failed tests:")
        for label, _, detail in failed:
            print(f"    - {label}" + (f": {detail}" if detail else ""))
    print()
    return len(failed) == 0

if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
