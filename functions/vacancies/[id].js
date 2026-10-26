// functions/vacancies/[id].js
// Cloudflare Pages Function — serves /vacancies/{uuid}
//
// Flow:
//   Bad UUID format         → 404
//   UUID not in view        → 410 Gone  (job ended, paused, expired, or never direct)
//   Found in view           → 200 full HTML with JobPosting JSON-LD
//
// Required env vars (Pages → Settings → Environment variables):
//   SUPABASE_URL       e.g. https://xxxx.supabase.co
//   SUPABASE_ANON_KEY  the public anon JWT
//
// Cache-Control: public, max-age=300 on all responses (Cloudflare edge caches for 5 min).
// The 410 is also cached so a hammered dead URL doesn't flood Supabase.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SITE    = 'https://www.uksecurityjobs.co.uk';
const APP     = 'https://app.uksecurityjobs.co.uk';

// Google JobPosting field maps
const EMP_TYPE_MAP = {
  'Full Time': 'FULL_TIME',
  'Part Time': 'PART_TIME',
  'Either':    ['FULL_TIME', 'PART_TIME'],
};
const RATE_UNIT_MAP = { hourly: 'HOUR', daily: 'DAY', annual: 'YEAR' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Escape then convert newlines to <br> for body text
function nl2br(s) {
  if (!s) return '';
  return esc(s).replace(/\n/g, '<br>');
}

function formatPay(job) {
  if (!job.rate_from) return null;
  const unit = job.rate_type === 'hourly' ? '/hr'
             : job.rate_type === 'daily'  ? '/day'
             : '/yr';
  const hi = job.rate_to && Number(job.rate_to) !== Number(job.rate_from)
    ? `–£${job.rate_to}` : '';
  return `£${job.rate_from}${hi}${unit}`;
}

function buildSchema(job, id) {
  // validThrough: use expires_at if set, else created_at + 30 days
  const validThrough = job.expires_at
    ? new Date(job.expires_at).toISOString().split('T')[0]
    : new Date(new Date(job.created_at).getTime() + 30 * 86_400_000)
        .toISOString().split('T')[0];

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'JobPosting',
    title:       (job.title || '').trim(),
    description: (job.description || job.title || '').trim(),
    datePosted:  new Date(job.created_at).toISOString().split('T')[0],
    validThrough,
    url: `${SITE}/vacancies/${id}`,
    hiringOrganization: {
      '@type': 'Organization',
      name:    job.company_name || 'Verified Employer',
    },
    jobLocation: {
      '@type':   'Place',
      address: {
        '@type':        'PostalAddress',
        addressCountry: 'GB',
        ...(job.location && { addressLocality: job.location }),
        ...(job.postcode && { postalCode:       job.postcode }),
      },
    },
  };

  if (job.logo_url) schema.hiringOrganization.logo = job.logo_url;

  const empType = EMP_TYPE_MAP[job.employment_type];
  if (empType) schema.employmentType = empType;

  if (job.rate_from) {
    schema.baseSalary = {
      '@type':   'MonetaryAmount',
      currency:  'GBP',
      value: {
        '@type':    'QuantitativeValue',
        minValue:   Number(job.rate_from),
        maxValue:   Number(job.rate_to || job.rate_from),
        unitText:   RATE_UNIT_MAP[job.rate_type] || 'HOUR',
      },
    };
  }

  // Escape </ so an employer-supplied "</script>" can't break out of the
  // JSON-LD block. JSON parsers treat \/ identically to / in string values.
  return JSON.stringify(schema).replace(/<\//g, '<\\/');
}

// ── Page renderers ────────────────────────────────────────────────────────────

function renderJob(job, id) {
  const pay       = formatPay(job);
  const licences  = Array.isArray(job.licences_required) ? job.licences_required : [];
  const shifts    = Array.isArray(job.shift_pattern)     ? job.shift_pattern     : [];
  const canonical = `${SITE}/vacancies/${id}`;
  const applyUrl  = `${APP}/jobs?job=${id}`;
  const company   = job.company_name || 'Verified Employer';
  const metaDesc  = [
    `${job.title} at ${company}`,
    job.location || 'UK',
    pay ? `Pay: ${pay}` : null,
    'Requires a valid SIA licence.',
    'Apply on UKSecurityJobs.',
  ].filter(Boolean).join(' — ');

  function tag(text) {
    return `<span class="hero-tag">${esc(text)}</span>`;
  }
  function detailRow(label, value) {
    if (!value) return '';
    return `<div class="dr"><span class="dl">${esc(label)}</span><span class="dv">${esc(String(value))}</span></div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${esc(job.title)} &mdash; ${esc(company)} | UKSecurityJobs</title>
<meta name="description" content="${esc(metaDesc)}"/>
<meta property="og:type" content="article">
<meta property="og:site_name" content="UKSecurityJobs">
<meta property="og:title" content="${esc(job.title)} &mdash; ${esc(company)}">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${canonical}"/>
<script type="application/ld+json">${buildSchema(job, id)}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
:root{--blue:#1a52a8;--navy:#0b1222;--border:#e2e8f0;--off:#f9fafb;--mid:#4a5568;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:var(--navy);background:#fff;-webkit-font-smoothing:antialiased;}
a{color:var(--blue);text-decoration:none;}a:hover{text-decoration:underline;}
.nav{background:#fff;border-bottom:1px solid var(--border);height:64px;display:flex;align-items:center;position:sticky;top:0;z-index:100;}
.nav-inner{max-width:1160px;margin:0 auto;width:100%;padding:0 2rem;display:flex;align-items:center;justify-content:space-between;}
.logo{font-size:1.15rem;font-weight:800;text-decoration:none;}
.logo .uk{color:var(--blue);}.logo .sec{color:var(--navy);}.logo .job{color:var(--blue);}
.nav-links{display:flex;align-items:center;gap:1.5rem;}
.nav-link{font-size:0.88rem;font-weight:500;color:var(--mid);text-decoration:none;}
.nav-cta{background:var(--navy);color:#fff;font-size:0.85rem;font-weight:700;padding:0.55rem 1.25rem;border-radius:8px;text-decoration:none;}
.hero{background:var(--navy);padding:3rem 2rem;color:#fff;}
.hero-inner{max-width:960px;margin:0 auto;}
.hero-back{font-size:0.8rem;color:#64748b;margin-bottom:1.25rem;display:inline-block;}
.hero-back:hover{color:#93c5fd;}
.hero h1{font-size:2rem;font-weight:900;line-height:1.15;letter-spacing:-0.02em;margin-bottom:0.4rem;}
.hero-company{font-size:1rem;color:#94a3b8;margin-bottom:0.25rem;}
.hero-location{font-size:0.88rem;color:#64748b;margin-bottom:0.75rem;}
.hero-pay{font-size:1.4rem;font-weight:900;color:#fff;margin-bottom:1rem;}
.hero-tags{display:flex;flex-wrap:wrap;gap:0.5rem;}
.hero-tag{display:inline-block;background:rgba(255,255,255,0.08);color:#cbd5e1;font-size:0.75rem;font-weight:600;padding:0.3rem 0.8rem;border-radius:999px;border:1px solid rgba(255,255,255,0.12);}
.layout{max-width:960px;margin:0 auto;padding:2.5rem 2rem;display:grid;grid-template-columns:1fr 280px;gap:2rem;align-items:start;}
.content section{margin-bottom:2rem;}
.content h2{font-size:1.05rem;font-weight:800;margin-bottom:0.75rem;letter-spacing:-0.01em;}
.body-text{font-size:0.92rem;color:var(--mid);line-height:1.85;}
.sidebar{background:var(--off);border:1px solid var(--border);border-radius:14px;padding:1.5rem;position:sticky;top:80px;}
.sidebar-title{font-size:0.92rem;font-weight:800;margin-bottom:1rem;}
.dr{display:flex;justify-content:space-between;align-items:flex-start;padding:0.55rem 0;border-bottom:1px solid var(--border);gap:0.75rem;}
.dr:last-of-type{border-bottom:none;}
.dl{font-size:0.75rem;font-weight:700;color:var(--mid);white-space:nowrap;}
.dv{font-size:0.75rem;color:var(--navy);font-weight:600;text-align:right;}
.apply-btn{display:block;width:100%;background:var(--blue);color:#fff;text-align:center;font-size:0.95rem;font-weight:700;padding:0.875rem;border-radius:10px;text-decoration:none;margin-top:1.25rem;}
.apply-btn:hover{background:#1746a0;text-decoration:none;}
.apply-note{font-size:0.7rem;color:var(--mid);text-align:center;margin-top:0.6rem;line-height:1.5;}
footer{background:#0b1222;padding:2.5rem 2rem;margin-top:1rem;}
.foot-bottom{max-width:1160px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;}
.foot-copy{font-size:0.72rem;color:#475569;}
.foot-links{display:flex;gap:1.5rem;}
.foot-links a{font-size:0.72rem;color:#475569;text-decoration:none;}
.foot-links a:hover{color:#fff;}
.foot-logo .uk{color:var(--blue);}.foot-logo .sec{color:#fff;}.foot-logo .job{color:var(--blue);}
@media(max-width:768px){
  .layout{grid-template-columns:1fr;padding:1.5rem 1.25rem;}
  .sidebar{position:static;}
  .hero h1{font-size:1.5rem;}
  .hero{padding:2rem 1.25rem;}
}
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="logo"><span class="uk">UK</span><span class="sec">Security</span><span class="job">Jobs</span></a>
    <div class="nav-links">
      <a class="nav-link" href="/vacancies">Vacancies</a>
      <a class="nav-link" href="/security-salary-guide">Salary Guide</a>
      <a class="nav-link" href="/blog">Blog</a>
      <a class="nav-cta" href="/officers">Candidate Registration</a>
    </div>
  </div>
</nav>

<section class="hero">
  <div class="hero-inner">
    <a href="/vacancies" class="hero-back">&larr; All vacancies</a>
    <h1>${esc(job.title)}</h1>
    <div class="hero-company">${esc(company)}</div>
    <div class="hero-location">${esc(job.location || '')}${job.postcode ? ' &middot; ' + esc(job.postcode) : ''}</div>
    ${pay ? `<div class="hero-pay">${pay}</div>` : ''}
    <div class="hero-tags">
      ${licences.map(tag).join('')}
      ${shifts.map(tag).join('')}
      ${job.contract_type  ? tag(job.contract_type)  : ''}
      ${job.employment_type ? tag(job.employment_type) : ''}
      ${job.sector          ? tag(job.sector)          : ''}
    </div>
  </div>
</section>

<div class="layout">
  <div class="content">
    ${job.description ? `<section>
      <h2>About this role</h2>
      <div class="body-text">${nl2br(job.description)}</div>
    </section>` : ''}
    ${job.duties ? `<section>
      <h2>Duties and responsibilities</h2>
      <div class="body-text">${nl2br(job.duties)}</div>
    </section>` : ''}
    ${job.benefits ? `<section>
      <h2>Benefits</h2>
      <div class="body-text">${nl2br(job.benefits)}</div>
    </section>` : ''}
    <section>
      <h2>Licence requirements</h2>
      <div class="body-text">A valid SIA licence is required for this role.${licences.length ? ' Accepted licences: <strong>' + esc(licences.join(', ')) + '</strong>.' : ''} Your licence is verified through UKSecurityJobs before your profile is visible to employers.</div>
    </section>
  </div>

  <aside class="sidebar">
    <div class="sidebar-title">Job details</div>
    ${detailRow('Pay', pay)}
    ${detailRow('Contract', job.contract_type)}
    ${detailRow('Hours', job.employment_type)}
    ${detailRow('Sector', job.sector)}
    ${detailRow('Location', job.location)}
    ${detailRow('Postcode', job.postcode)}
    ${licences.length ? detailRow('SIA licence', licences.join(', ')) : ''}
    ${shifts.length   ? detailRow('Shifts',       shifts.join(', '))   : ''}
    <a href="${applyUrl}" class="apply-btn">Apply for this role &rarr;</a>
    <p class="apply-note">Requires a verified UKSecurityJobs profile with an active SIA licence.</p>
  </aside>
</div>

<footer>
  <div class="foot-bottom">
    <a href="/" class="logo foot-logo"><span class="uk">UK</span><span class="sec">Security</span><span class="job">Jobs</span></a>
    <p class="foot-copy">&copy; 2026 UKSecurityJobs.co.uk &mdash; Digital Software Group Ltd.</p>
    <div class="foot-links">
      <a href="/about#contact">Contact Us</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <a href="/blog">Blog</a>
    </div>
  </div>
</footer>
<script src="/footer-extras.js" defer></script>
</body>
</html>`;
}

function render410() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Vacancy Closed | UKSecurityJobs</title>
<meta name="robots" content="noindex"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;}
.box{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:2.5rem 2rem;max-width:440px;text-align:center;}
h1{font-size:1.2rem;font-weight:900;color:#0b1222;margin-bottom:0.75rem;}
p{font-size:0.9rem;color:#4a5568;line-height:1.7;margin-bottom:1.5rem;}
a{display:inline-block;background:#1a52a8;color:#fff;font-size:0.88rem;font-weight:700;padding:0.7rem 1.75rem;border-radius:8px;text-decoration:none;}
</style>
</head>
<body>
<div class="box">
  <h1>This vacancy has closed</h1>
  <p>This role is no longer accepting applications. Browse current security vacancies on UKSecurityJobs.</p>
  <a href="/vacancies">Browse open vacancies &rarr;</a>
</div>
</body>
</html>`;
}

function render404() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Not Found | UKSecurityJobs</title>
<meta name="robots" content="noindex"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;}
.box{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:2.5rem 2rem;max-width:440px;text-align:center;}
h1{font-size:1.2rem;font-weight:900;color:#0b1222;margin-bottom:0.75rem;}
p{font-size:0.9rem;color:#4a5568;line-height:1.7;margin-bottom:1.5rem;}
a{display:inline-block;background:#1a52a8;color:#fff;font-size:0.88rem;font-weight:700;padding:0.7rem 1.75rem;border-radius:8px;text-decoration:none;}
</style>
</head>
<body>
<div class="box">
  <h1>Page not found</h1>
  <p>This vacancy URL doesn&apos;t exist. Browse current security vacancies on UKSecurityJobs.</p>
  <a href="/vacancies">Browse vacancies &rarr;</a>
</div>
</body>
</html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function onRequestGet(context) {
  // Outer catch — surfaces any unhandled exception as a plain-text 500
  // so it is visible in curl rather than being swallowed by CF's error page.
  // TEMPORARY — remove once root cause is confirmed.
  try {
    return await _handle(context);
  } catch (err) {
    return new Response(`UNHANDLED: ${err.stack || err.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function _handle(context) {
  const { params, env } = context;
  const id = params.id;

  // 1. Validate UUID format — anything else is a 404
  if (!UUID_RE.test(id)) {
    return new Response(render404(), {
      status: 404,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  // 2. Fetch from Supabase view (anon key, no auth cookie needed)
  const supaUrl = `${env.SUPABASE_URL}/rest/v1/public_active_jobs?id=eq.${id}&select=*&limit=1`;
  let job;
  try {
    const res = await fetch(supaUrl, {
      headers: {
        'apikey':        env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Accept':        'application/json',
      },
    });
    if (!res.ok) {
      // Log the Supabase error body for debugging but don't expose it
      const body = await res.text().catch(() => '');
      console.error(`[vacancies/${id}] Supabase ${res.status}: ${body.slice(0, 200)}`);
      return new Response('Service unavailable', { status: 502 });
    }
    const rows = await res.json();
    job = rows[0] ?? null;
  } catch (err) {
    console.error(`[vacancies/${id}] fetch error: ${err.message}`);
    return new Response('Service unavailable', { status: 502 });
  }

  // 3. Not in view = ended / paused / expired / aggregated → 410 Gone
  if (!job) {
    return new Response(render410(), {
      status: 410,
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  // 4. Active job — full rendered page
  return new Response(renderJob(job, id), {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
