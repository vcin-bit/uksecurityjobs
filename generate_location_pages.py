import os

# Output directory = same folder as this script (repo root)
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Cities ───────────────────────────────────────────────────────────────────
# Each entry: city, slug, region, desc, note, sectors
# 'note'    — one unique paragraph about why the market is active (hero body)
# 'sectors' — specific environments/venues that drive security demand (FAQ Q1)
# Duplicate Leicester removed from source data (was deduped at runtime before).

cities = [
    {
        "city": "London",
        "slug": "security-jobs-london",
        "region": "Greater London",
        "desc": "the UK's largest security jobs market",
        "note": "London has the highest concentration of licensed security roles in the UK — from West End entertainment venues and City of London corporate sites to major transport hubs, luxury retail, residential concierge and close protection.",
        "sectors": "West End entertainment venues, City of London corporate sites, major transport hubs, luxury retail, residential concierge, and close protection"
    },
    {
        "city": "Manchester",
        "slug": "security-jobs-manchester",
        "region": "Greater Manchester",
        "desc": "one of the UK's fastest growing security markets",
        "note": "Manchester's thriving night-time economy, major events venues and expanding corporate sector make it one of the most active security recruitment markets outside London.",
        "sectors": "licensed premises and nightlife venues, major concerts and events including the AO Arena, corporate offices, retail centres, and transport hubs"
    },
    {
        "city": "Birmingham",
        "slug": "security-jobs-birmingham",
        "region": "West Midlands",
        "desc": "a major hub for UK security employment",
        "note": "Birmingham's large retail centres, transport infrastructure, events venues and corporate estates generate consistent demand for SIA-licensed security professionals across all licence types.",
        "sectors": "major retail complexes including the Bullring, NEC events and exhibitions, corporate estates, transport infrastructure, and construction sites"
    },
    {
        "city": "Leeds",
        "slug": "security-jobs-leeds",
        "region": "West Yorkshire",
        "desc": "a growing market for licensed security professionals",
        "note": "Leeds is one of the fastest growing cities in the UK, with strong demand for security staff across its city centre, retail parks, financial district and busy night-time economy.",
        "sectors": "financial and legal offices in the city centre, major retail including Trinity Leeds, university campuses, night-time economy venues, and retail parks"
    },
    {
        "city": "Liverpool",
        "slug": "security-jobs-liverpool",
        "region": "Merseyside",
        "desc": "a busy and varied security jobs market",
        "note": "Liverpool's extensive licensed premises, waterfront developments, major events venues and retail sector create strong year-round demand for door supervisors, security guards and CCTV operators.",
        "sectors": "Albert Dock and waterfront venues, licensed premises and nightlife, major concert and events venues, retail centres, and corporate offices"
    },
    {
        "city": "Sheffield",
        "slug": "security-jobs-sheffield",
        "region": "South Yorkshire",
        "desc": "a steady market for SIA-licensed security staff",
        "note": "Sheffield's universities, retail centres, entertainment venues and industrial sites require a broad range of SIA-licensed security professionals throughout the year.",
        "sectors": "university campuses and student accommodation, retail centres including Meadowhall, entertainment and nightlife venues, manufacturing sites, and corporate offices"
    },
    {
        "city": "Bristol",
        "slug": "security-jobs-bristol",
        "region": "South West England",
        "desc": "a growing market for security professionals in the South West",
        "note": "Bristol's expanding corporate sector, vibrant night-time economy and major retail developments make it one of the strongest security recruitment markets in the South West of England.",
        "sectors": "Harbourside and waterfront venues, corporate offices in Temple Quay, major retail, night-time economy, and events"
    },
    {
        "city": "Glasgow",
        "slug": "security-jobs-glasgow",
        "region": "Scotland",
        "desc": "Scotland's largest security jobs market",
        "note": "Glasgow is Scotland's largest city and its biggest security employment market, with strong demand across licensed premises, events, corporate buildings and retail environments throughout the city.",
        "sectors": "licensed premises and nightlife, the OVO Hydro and major events venues, corporate offices, Buchanan Street and city centre retail, and residential developments"
    },
    {
        "city": "Edinburgh",
        "slug": "security-jobs-edinburgh",
        "region": "Scotland",
        "desc": "a specialist security market with strong year-round demand",
        "note": "Edinburgh's world-famous festivals, major hotels, corporate district and historic venues create consistent demand for experienced, professional SIA-licensed security officers throughout the year.",
        "sectors": "Edinburgh Festival and Hogmanay events, major hotels and hospitality venues, historic tourist attractions, corporate offices, and city centre retail"
    },
    {
        "city": "Newcastle",
        "slug": "security-jobs-newcastle",
        "region": "North East England",
        "desc": "the North East's primary security employment hub",
        "note": "Newcastle upon Tyne has one of the busiest night-time economies in the UK, alongside growing corporate and retail sectors creating strong demand for SIA-licensed door supervisors and security guards.",
        "sectors": "Bigg Market and Quayside licensed premises, Utilita Arena events, Eldon Square and city centre retail, construction sites, and corporate offices"
    },
    {
        "city": "Nottingham",
        "slug": "security-jobs-nottingham",
        "region": "East Midlands",
        "desc": "a consistent market for licensed security professionals",
        "note": "Nottingham's large student population, active night-time economy and major retail centres generate reliable demand for SIA-licensed security staff, particularly door supervisors.",
        "sectors": "licensed premises and Hockley quarter nightlife, city centre retail, university campuses, corporate offices, and construction sites"
    },
    {
        "city": "Leicester",
        "slug": "security-jobs-leicester",
        "region": "East Midlands",
        "desc": "a growing security market in the East Midlands",
        "note": "Leicester's diverse retail sector, manufacturing and logistics industry and growing events scene create steady demand for security guards, door supervisors and CCTV operators.",
        "sectors": "major retail and logistics operations, manufacturing facilities, city centre licensed premises, events venues, and corporate offices"
    },
    {
        "city": "Cardiff",
        "slug": "security-jobs-cardiff",
        "region": "Wales",
        "desc": "Wales's largest security employment market",
        "note": "Cardiff is the security recruitment capital of Wales, with strong demand across its city centre, major sports venues, events facilities and expanding corporate district.",
        "sectors": "Principality Stadium and major sports events, Cardiff Bay and city centre retail, corporate offices, licensed premises, and waterfront developments"
    },
    {
        "city": "Southampton",
        "slug": "security-jobs-southampton",
        "region": "Hampshire",
        "desc": "a growing security market on the South Coast",
        "note": "Southampton's port facilities, large retail centres, university campuses and active night-time economy create consistent demand for SIA-licensed security professionals.",
        "sectors": "port and cruise terminal facilities, Westquay and city centre retail, university campuses, night-time economy venues, and waterfront developments"
    },
    {
        "city": "Portsmouth",
        "slug": "security-jobs-portsmouth",
        "region": "Hampshire",
        "desc": "an active security market on the South Coast",
        "note": "Portsmouth's naval heritage, busy retail centres, waterfront developments and active night-time economy support strong demand for licensed security professionals.",
        "sectors": "naval base and defence-adjacent facilities, Gunwharf Quays retail and leisure, waterfront and Historic Dockyard, and licensed premises"
    },
    {
        "city": "Brighton",
        "slug": "security-jobs-brighton",
        "region": "East Sussex",
        "desc": "a busy security market on the South Coast",
        "note": "Brighton's large entertainment and events sector, busy seafront and active night-time economy make it one of the most active security recruitment markets on the South Coast.",
        "sectors": "seafront and pier entertainment, night-time economy and licensed venues, events and festivals, retail, and university campuses"
    },
    {
        "city": "Coventry",
        "slug": "security-jobs-coventry",
        "region": "West Midlands",
        "desc": "a growing security market in the West Midlands",
        "note": "Coventry's growing manufacturing sector, universities, retail centres and regeneration projects are driving increased demand for SIA-licensed security staff.",
        "sectors": "manufacturing and automotive supply chain sites, university campuses, retail centres, regeneration and construction sites, and corporate offices"
    },
    {
        "city": "Reading",
        "slug": "security-jobs-reading",
        "region": "Berkshire",
        "desc": "a strong corporate security market west of London",
        "note": "Reading's large concentration of corporate offices, retail parks and event venues makes it one of the strongest security recruitment markets in the Thames Valley corridor.",
        "sectors": "Thames Valley corporate and technology office parks, Oracle and Broad Street Mall retail, events including Reading Festival, and business district offices"
    },
    {
        "city": "Milton Keynes",
        "slug": "security-jobs-milton-keynes",
        "region": "Buckinghamshire",
        "desc": "a growing security market in the South Midlands",
        "note": "Milton Keynes's large distribution centres, corporate parks, shopping centres and events venues generate strong and consistent demand for SIA-licensed security professionals.",
        "sectors": "large distribution and logistics centres, Stadium MK and events venues, Xscape and major shopping centres, and corporate parks"
    },
    {
        "city": "Derby",
        "slug": "security-jobs-derby",
        "region": "East Midlands",
        "desc": "a steady security employment market in the East Midlands",
        "note": "Derby's manufacturing base, retail sector and growing city centre create reliable demand for security guards, door supervisors and CCTV operators.",
        "sectors": "Rolls-Royce and major manufacturing facilities, Intu Derby and city centre retail, corporate offices, and night-time economy venues"
    },
    {
        "city": "Stoke-on-Trent",
        "slug": "security-jobs-stoke",
        "region": "Staffordshire",
        "desc": "an active security market in the West Midlands region",
        "note": "Stoke-on-Trent's large retail parks, entertainment venues and industrial estates create consistent demand for SIA-licensed security staff.",
        "sectors": "Potteries shopping centre, retail parks, entertainment and nightlife venues, industrial and logistics estates, and city centre premises"
    },
    {
        "city": "Wolverhampton",
        "slug": "security-jobs-wolverhampton",
        "region": "West Midlands",
        "desc": "an active security market in the West Midlands",
        "note": "Wolverhampton's retail sector, entertainment venues and growing city centre regeneration are driving demand for experienced SIA-licensed security professionals.",
        "sectors": "Molineux and events venues, Grand Theatre and arts district, city centre retail, regeneration and construction sites, and commercial properties"
    },
    {
        "city": "Plymouth",
        "slug": "security-jobs-plymouth",
        "region": "Devon",
        "desc": "the South West's second largest security market",
        "note": "Plymouth's naval base, large retail sector, waterfront developments and active night-time economy create steady year-round demand for SIA-licensed security professionals.",
        "sectors": "HMNB Devonport and naval-adjacent facilities, city centre retail, Barbican waterfront venues, and night-time economy licensed premises"
    },
    {
        "city": "Belfast",
        "slug": "security-jobs-belfast",
        "region": "Northern Ireland",
        "desc": "Northern Ireland's largest security employment market",
        "note": "Belfast's growing economy, major retail developments, entertainment sector and corporate district are driving increasing demand for licensed security professionals.",
        "sectors": "Victoria Square and major retail, entertainment and licensed venues, Titanic Quarter corporate offices, hospitality sector, and events"
    },
    {
        "city": "Aberdeen",
        "slug": "security-jobs-aberdeen",
        "region": "Scotland",
        "desc": "a specialist security market driven by the energy sector",
        "note": "Aberdeen's energy industry, major port facilities, growing corporate sector and active city centre create consistent demand for experienced SIA-licensed security professionals.",
        "sectors": "energy sector and oil industry facilities, Aberdeen Harbour and port operations, corporate and technology offices, Union Square retail, and city centre hospitality"
    },
    {
        "city": "Exeter",
        "slug": "security-jobs-exeter",
        "region": "Devon",
        "desc": "a growing security market in the South West",
        "note": "Exeter's university, retail centres, growing business district and active night-time economy support steady demand for SIA-licensed security staff.",
        "sectors": "University of Exeter campus and student venues, High Street and Princesshay retail, business district offices, and night-time economy"
    },
    {
        "city": "Oxford",
        "slug": "security-jobs-oxford",
        "region": "Oxfordshire",
        "desc": "a specialist security market with strong corporate demand",
        "note": "Oxford's world-famous university estates, research facilities, corporate sector and busy city centre create consistent demand for professional, experienced security officers.",
        "sectors": "University of Oxford estates and research facilities, Westgate and city centre retail, corporate and biomedical sector offices, and tourist and heritage sites"
    },
    {
        "city": "Cambridge",
        "slug": "security-jobs-cambridge",
        "region": "Cambridgeshire",
        "desc": "a growing security market driven by tech and academia",
        "note": "Cambridge's university estates, research parks, growing tech sector and city centre venues generate strong demand for SIA-licensed security professionals.",
        "sectors": "University of Cambridge estates and colleges, Cambridge Science Park and tech sector offices, retail, and city centre venues"
    },
    {
        "city": "York",
        "slug": "security-jobs-york",
        "region": "North Yorkshire",
        "desc": "a specialist security market in North Yorkshire",
        "note": "York's major tourist industry, historic venues, retail sector and active night-time economy create year-round demand for experienced, customer-focused security professionals.",
        "sectors": "York Minster and heritage tourist attractions, the Shambles and city centre retail, racecourse events, hospitality venues, and night-time economy"
    },
]

# ── City link grid (shared across all pages) ─────────────────────────────────
CITY_LINKS = '\n'.join(
    f'      <a href="/{c["slug"]}" class="city-link">{c["city"]}</a>'
    for c in cities
)

# ── HTML template ─────────────────────────────────────────────────────────────
# Variables: {city} {slug} {region} {desc} {note} {sectors} {city_links}
#
# Job count: injected client-side via a small inline script that hits the
# public API at page load. The count is NOT baked into the HTML at build time
# (see RECOMMENDATION comment below). The hero shows a neutral CTA by default;
# the script replaces the live-count span once the fetch resolves.
#
# RECOMMENDATION — build-time vs client-side (see tradeoffs in README):
#   Current approach = CLIENT-SIDE FETCH. The span#live-count is empty on
#   first paint and populated after a fetch to /api/jobs/public. Simple, no
#   deploy pipeline needed, always fresh. Downside: count not in HTML source
#   so Google won't see it in the initial crawl (only after JS executes).
#   BUILD-TIME approach: extend this script to query Supabase REST at
#   generation time and bake the count into the HTML. Count is SEO-indexed
#   but only as fresh as the last deploy. Requires a redeploy trigger when
#   jobs are posted/expired. Discuss with David before switching.

TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Security Jobs {city} — SIA Licensed Vacancies | UKSecurityJobs</title>
<meta name="description" content="Find verified security jobs in {city}. Every role requires a valid SIA licence. Register free, build your BS7858-ready profile and apply to verified {region} security employers."/>
<link rel="canonical" href="https://www.uksecurityjobs.co.uk/{slug}"/>
<script type="application/ld+json">{{
  "@context":"https://schema.org",
  "@type":"JobPosting",
  "title":"Security Officer — {city}",
  "description":"SIA-licensed security officer positions in {city}, {region}",
  "hiringOrganization":{{"@type":"Organization","name":"UKSecurityJobs","sameAs":"https://www.uksecurityjobs.co.uk"}},
  "jobLocation":{{"@type":"Place","address":{{"@type":"PostalAddress","addressLocality":"{city}","addressRegion":"{region}","addressCountry":"GB"}}}},
  "employmentType":"FULL_TIME"
}}</script>
<script type="application/ld+json">{{
  "@context":"https://schema.org",
  "@type":"FAQPage",
  "mainEntity":[
    {{"@type":"Question","name":"What security jobs are available in {city}?","acceptedAnswer":{{"@type":"Answer","text":"UKSecurityJobs lists verified security vacancies in {city} across {sectors}. Roles include door supervisor positions, security guard roles, CCTV operator jobs and close protection opportunities. Every role requires a valid SIA licence — there are no unlicensed or unverified positions on the platform."}}}},
    {{"@type":"Question","name":"Do I need an SIA licence to work as a security officer in {city}?","acceptedAnswer":{{"@type":"Answer","text":"Yes. All front-line security roles in the UK require a valid SIA licence issued by the Security Industry Authority. Depending on the role, you will need a Door Supervisor, Security Guard, CCTV Operator or Close Protection licence. UKSecurityJobs verifies every candidate licence before their profile goes live to employers."}}}},
    {{"@type":"Question","name":"What is BS7858 vetting and do I need it for security jobs in {city}?","acceptedAnswer":{{"@type":"Answer","text":"BS7858 is the British Standard for vetting individuals working in security environments. It requires a verified 5-year employment and address history with no unexplained gaps. Most security employers in {city} require BS7858 vetting. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any role."}}}},
    {{"@type":"Question","name":"How do I register for security jobs in {city}?","acceptedAnswer":{{"@type":"Answer","text":"Register free at UKSecurityJobs, complete your BS7858-ready profile including your SIA licence details, employment history, address history and reference contacts. Your licence will be verified within 24 hours. Once verified, you can apply for security vacancies in {city} and across the UK with a single click."}}}}
  ]
}}</script>
<style>
*{{box-sizing:border-box;margin:0;padding:0;}}
:root{{--blue:#1a52a8;--navy:#0b1222;--border:#e2e8f0;--off:#f9fafb;--mid:#4a5568;}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:var(--navy);background:#fff;-webkit-font-smoothing:antialiased;}}
a{{color:var(--blue);text-decoration:none;}}a:hover{{text-decoration:underline;}}
.nav{{background:#fff;border-bottom:1px solid var(--border);height:64px;display:flex;align-items:center;position:sticky;top:0;z-index:100;}}
.nav-inner{{max-width:1160px;margin:0 auto;width:100%;padding:0 2rem;display:flex;align-items:center;justify-content:space-between;}}
.logo{{font-size:1.15rem;font-weight:800;text-decoration:none;}}
.logo .uk{{color:var(--blue);}}.logo .sec{{color:var(--navy);}}.logo .job{{color:var(--blue);}}
.nav-links{{display:flex;align-items:center;gap:1.5rem;}}
.nav-link{{font-size:0.88rem;font-weight:500;color:var(--mid);text-decoration:none;}}
.nav-cta{{background:var(--navy);color:#fff;font-size:0.85rem;font-weight:700;padding:0.55rem 1.25rem;border-radius:8px;text-decoration:none;}}
.nav-cta:hover{{background:#1e293b;text-decoration:none;}}
.hero{{background:var(--navy);padding:4rem 2rem;color:#fff;}}
.hero-inner{{max-width:860px;margin:0 auto;}}
.hero-tag{{display:inline-block;background:rgba(26,82,168,0.4);color:#93c5fd;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;padding:0.3rem 0.875rem;border-radius:999px;margin-bottom:1.25rem;border:1px solid rgba(26,82,168,0.5);}}
.hero h1{{font-size:2.5rem;font-weight:900;line-height:1.12;letter-spacing:-0.03em;margin-bottom:1rem;}}
.hero p{{font-size:1rem;color:#94a3b8;line-height:1.75;max-width:640px;margin-bottom:1.75rem;}}
.live-count{{font-size:0.82rem;color:#93c5fd;margin-top:-1rem;margin-bottom:1.5rem;min-height:1.2em;}}
.hero-btns{{display:flex;flex-wrap:wrap;gap:0.875rem;}}
.btn-primary{{display:inline-block;background:#1a52a8;color:#fff;font-size:0.92rem;font-weight:700;padding:0.8rem 2rem;border-radius:9px;text-decoration:none;}}
.btn-primary:hover{{background:#1641873;text-decoration:none;}}
.btn-secondary{{display:inline-block;background:rgba(255,255,255,0.08);color:#fff;font-size:0.92rem;font-weight:600;padding:0.8rem 2rem;border-radius:9px;text-decoration:none;border:1px solid rgba(255,255,255,0.15);}}
.btn-secondary:hover{{background:rgba(255,255,255,0.14);text-decoration:none;}}
.badges{{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1.5rem;}}
.badge{{font-size:0.72rem;font-weight:600;padding:0.3rem 0.75rem;border-radius:999px;background:rgba(26,82,168,0.3);color:#93c5fd;border:1px solid rgba(26,82,168,0.5);}}
.section{{padding:4rem 2rem;}}
.section-inner{{max-width:1100px;margin:0 auto;}}
.section-inner.narrow{{max-width:800px;}}
.section-tag{{font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:var(--blue);margin-bottom:0.75rem;}}
.section h2{{font-size:1.75rem;font-weight:900;letter-spacing:-0.02em;margin-bottom:1rem;}}
.section p{{font-size:0.93rem;color:var(--mid);line-height:1.8;margin-bottom:0.875rem;}}
.cards{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.25rem;margin-top:2rem;}}
.card{{background:var(--off);border-radius:12px;padding:1.5rem;border:1px solid var(--border);}}
.card-icon{{width:40px;height:40px;background:#eff6ff;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;}}
.card h3{{font-size:0.95rem;font-weight:700;margin-bottom:0.4rem;}}
.card p{{font-size:0.8rem;color:var(--mid);line-height:1.65;margin:0;}}
.card a{{display:inline-block;margin-top:0.75rem;font-size:0.78rem;font-weight:600;color:var(--blue);}}
.links-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.75rem;margin-top:1.5rem;}}
.city-link{{background:var(--off);border:1px solid var(--border);border-radius:8px;padding:0.75rem 1rem;font-size:0.82rem;font-weight:600;color:var(--navy);text-decoration:none;transition:border-color 0.15s;}}
.city-link:hover{{border-color:var(--blue);color:var(--blue);text-decoration:none;}}
.faq{{padding:4rem 2rem;background:var(--off);}}
.faq-inner{{max-width:800px;margin:0 auto;}}
.faq h2{{font-size:1.75rem;font-weight:900;margin-bottom:2rem;letter-spacing:-0.02em;}}
.faq-item{{border-bottom:1px solid var(--border);}}
.faq-item:last-child{{border-bottom:none;}}
.faq-q{{width:100%;background:none;border:none;text-align:left;padding:1.1rem 0;font-size:0.95rem;font-weight:700;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:1rem;font-family:inherit;}}
.faq-q:hover{{color:var(--blue);}}
.faq-icon{{flex-shrink:0;font-size:1.25rem;color:#94a3b8;transition:transform 0.2s;}}
.faq-a{{display:none;padding:0 0 1.1rem;font-size:0.88rem;color:var(--mid);line-height:1.75;}}
.faq-item.open .faq-a{{display:block;}}
.faq-item.open .faq-icon{{transform:rotate(45deg);}}
.cta{{background:var(--navy);padding:4rem 2rem;text-align:center;color:#fff;}}
.cta h2{{font-size:2rem;font-weight:900;margin-bottom:0.75rem;}}
.cta p{{color:#94a3b8;margin-bottom:2rem;font-size:0.95rem;}}
footer{{background:#0b1222;padding:4rem 2rem 2rem;}}
footer *{{box-sizing:border-box;}}
.foot-wrap{{max-width:1160px;margin:0 auto;}}
.foot-top{{display:grid;grid-template-columns:240px 1fr;gap:4rem;padding-bottom:3rem;border-bottom:1px solid #1e293b;margin-bottom:2rem;}}
.foot-brand p{{font-size:0.8rem;color:#475569;line-height:1.75;margin-top:0.75rem;max-width:210px;}}
.foot-logo{{font-size:1.1rem;font-weight:800;text-decoration:none;display:inline-block;}}
.foot-logo .uk{{color:#1a52a8;}}.foot-logo .sec{{color:#fff;}}.foot-logo .job{{color:#1a52a8;}}
footer nav{{background:transparent;border:none;height:auto;position:static;backdrop-filter:none;display:block;}}
.foot-nav{{display:grid;grid-template-columns:repeat(4,1fr);gap:2rem;align-items:start;}}
.foot-col h4{{font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;color:#334155;margin-bottom:0.875rem;display:block;}}
.foot-col a{{display:block;font-size:0.82rem;color:#64748b;margin-bottom:0.5rem;text-decoration:none;transition:color 0.15s;}}
.foot-col a:hover{{color:#fff;}}
.foot-bottom{{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;}}
.foot-copy{{font-size:0.72rem;color:#334155;}}
.foot-legal{{display:flex;gap:1.25rem;}}
.foot-legal a{{font-size:0.72rem;color:#334155;text-decoration:none;}}
.foot-legal a:hover{{color:#94a3b8;}}
@media(max-width:900px){{.hero h1{{font-size:1.85rem;}}.cards{{grid-template-columns:1fr 1fr;}}.foot-top{{grid-template-columns:1fr;gap:2rem;}}.foot-nav{{grid-template-columns:repeat(2,1fr);}}}}
@media(max-width:600px){{.cards{{grid-template-columns:1fr;}}.links-grid{{grid-template-columns:repeat(2,1fr);}}.foot-nav{{grid-template-columns:1fr;}}}}
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
      <a class="nav-cta" href="/employers" style="background:#1a52a8;margin-left:0.5rem;">Company Registration</a>
    </div>
  </div>
</nav>

<section class="hero">
  <div class="hero-inner">
    <span class="hero-tag">SIA Licensed Roles &middot; {region}</span>
    <h1>Security Jobs in {city}</h1>
    <p>UKSecurityJobs lists verified security vacancies in {city} &mdash; {desc}. Every role requires a valid SIA licence. Register once and apply to multiple {city} employers without filling in another application form.</p>
    <p class="live-count" id="live-count"></p>
    <div class="hero-btns">
      <a href="https://app.uksecurityjobs.co.uk/sign-up" class="btn-primary">Register Free &rarr;</a>
      <a href="https://app.uksecurityjobs.co.uk/jobs" class="btn-secondary">View Current Jobs</a>
    </div>
    <div class="badges">
      <span class="badge">SIA Licence Verified</span>
      <span class="badge">BS7858 Ready</span>
      <span class="badge">5-Year History Checked</span>
      <span class="badge">No Time Wasters</span>
    </div>
  </div>
</section>

<section class="section">
  <div class="section-inner">
    <div class="section-tag">Security Jobs in {city}</div>
    <h2>Why Security Work in {city}?</h2>
    <p>{note}</p>
    <p>Every vacancy listed on UKSecurityJobs requires a valid SIA licence. Employers on this platform have been verified before they can post a role &mdash; and every candidate has a complete, BS7858-ready profile including verified employment history, full address history and reference contacts ready to go.</p>
    <div class="cards">
      <div class="card">
        <div class="card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a52a8" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
        <h3>Door Supervisor Jobs {city}</h3>
        <p>Licensed premises, events and retail security roles requiring an SIA Door Supervisor licence.</p>
        <a href="/door-supervisor-jobs">View Door Supervisor roles &rarr;</a>
      </div>
      <div class="card">
        <div class="card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a52a8" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <h3>Security Guard Jobs {city}</h3>
        <p>Static guarding, corporate, retail and construction site roles requiring an SIA Security Guard licence.</p>
        <a href="/security-guard-jobs">View Security Guard roles &rarr;</a>
      </div>
      <div class="card">
        <div class="card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a52a8" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
        <h3>CCTV Operator Jobs {city}</h3>
        <p>Control room and public space surveillance roles requiring an SIA CCTV (PSS) licence.</p>
        <a href="/cctv-jobs">View CCTV Operator roles &rarr;</a>
      </div>
      <div class="card">
        <div class="card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a52a8" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg></div>
        <h3>Close Protection Jobs {city}</h3>
        <p>Personal protection and specialist security roles requiring an SIA Close Protection licence.</p>
        <a href="/close-protection-jobs">View Close Protection roles &rarr;</a>
      </div>
    </div>
  </div>
</section>

<section class="section" style="background:var(--off);">
  <div class="section-inner narrow">
    <div class="section-tag">Other Locations</div>
    <h2>Security Jobs Across the UK</h2>
    <p>UKSecurityJobs covers security vacancies across the entire United Kingdom. Browse verified security jobs in other cities and regions:</p>
    <div class="links-grid">
{city_links}
    </div>
  </div>
</section>

<section class="faq">
  <div class="faq-inner">
    <h2>Security Jobs in {city} &mdash; Frequently Asked Questions</h2>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">What security jobs are available in {city}?<span class="faq-icon">+</span></button>
      <div class="faq-a">UKSecurityJobs lists verified security vacancies in {city} across {sectors}. Roles include door supervisor positions, security guard roles, CCTV operator jobs and close protection opportunities. Every role on this platform requires a valid SIA licence &mdash; there are no unlicensed or unverified positions.</div>
    </div>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">Do I need an SIA licence to work as a security officer in {city}?<span class="faq-icon">+</span></button>
      <div class="faq-a">Yes. All front-line security roles in the UK require a valid SIA licence issued by the Security Industry Authority. Depending on the role, you will need a Door Supervisor, Security Guard, CCTV Operator (PSS) or Close Protection licence. UKSecurityJobs verifies every candidate&apos;s licence against the public SIA register before their profile goes live to employers.</div>
    </div>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">What does BS7858 vetting involve for security jobs in {city}?<span class="faq-icon">+</span></button>
      <div class="faq-a">BS7858 is the British Standard for screening individuals in security environments. It requires a fully verified 5-year employment history with no unexplained gaps, a complete 5-year address history, identity verification and criminal record disclosure. Most security employers in {city} &mdash; including those operating across {sectors} &mdash; require candidates to pass BS7858 vetting before starting work. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any role, giving employers a head start with employment history, addresses and references already collected.</div>
    </div>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">How much do security jobs pay in {city}?<span class="faq-icon">+</span></button>
      <div class="faq-a">Security pay rates in {city} vary by role, employer, shift pattern and experience level. Every job listing on UKSecurityJobs displays the pay rate before you apply &mdash; there are no hidden rates or bait-and-switch listings. For a full breakdown of current rates by licence type and region, see the <a href="/security-salary-guide">UKSecurityJobs Salary Guide</a>.</div>
    </div>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">How do I register for security jobs in {city}?<span class="faq-icon">+</span></button>
      <div class="faq-a">Register free at UKSecurityJobs and complete your profile &mdash; it takes approximately 20 minutes and covers your SIA licence details, employment history, address history and reference contacts. Your SIA licence will be verified within 24 hours. Once verified, you can apply for security vacancies in {city} and anywhere in the UK with a single click, without having to fill in another application form.</div>
    </div>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">Can security companies in {city} post jobs on UKSecurityJobs?<span class="faq-icon">+</span></button>
      <div class="faq-a">Yes. Security companies in {city} and across the UK can register as employers and post verified security vacancies on the platform. All applications come from SIA-licensed, BS7858-ready candidates &mdash; no unsuitable applicants, no unlicensed candidates and no time wasters. <a href="/employers">Register your company here</a>.</div>
    </div>

  </div>
</section>

<section class="cta">
  <h2>Find Your Next Security Role in {city}</h2>
  <p>Register free. SIA licence verified within 24 hours. Apply to verified employers with one click.</p>
  <a href="https://app.uksecurityjobs.co.uk/sign-up" style="display:inline-block;background:#fff;color:var(--navy);font-size:0.95rem;font-weight:700;padding:0.875rem 2.25rem;border-radius:10px;text-decoration:none;">Create My Profile &rarr;</a>
</section>

<footer>
  <div class="foot-wrap">
    <div class="foot-top">
      <div class="foot-brand">
        <a href="/" class="foot-logo"><span class="uk">UK</span><span class="sec">Security</span><span class="job">Jobs</span></a>
        <p>The UK&apos;s only verified security jobs platform. Built by the industry, for the industry.</p>
        <p style="margin-top:0.5rem;font-size:0.75rem;color:#334155;">Digital Software Group Ltd<br>Registered in England &amp; Wales</p>
      </div>
      <nav class="foot-nav">
        <div class="foot-col">
          <h4>Security Officers</h4>
          <a href="/officers">For Security Officers</a>
          <a href="https://app.uksecurityjobs.co.uk/sign-up">Register Free</a>
          <a href="https://app.uksecurityjobs.co.uk/jobs">Security Jobs</a>
          <a href="https://app.uksecurityjobs.co.uk/sign-in">Sign In</a>
        </div>
        <div class="foot-col">
          <h4>Security Companies</h4>
          <a href="/employers">For Employers</a>
          <a href="https://app.uksecurityjobs.co.uk/employer/sign-up">Register a Company</a>
          <a href="https://app.uksecurityjobs.co.uk/sign-in">Employer Sign In</a>
        </div>
        <div class="foot-col">
          <h4>SIA Job Types</h4>
          <a href="/door-supervisor-jobs">Door Supervisor Jobs</a>
          <a href="/cctv-jobs">CCTV Operator Jobs</a>
          <a href="/close-protection-jobs">Close Protection Jobs</a>
          <a href="/security-guard-jobs">Security Guard Jobs</a>
        </div>
        <div class="foot-col">
          <h4>Company</h4>
          <a href="/blog">Blog</a>
          <a href="/about">About</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms &amp; Conditions</a>
          <a href="mailto:support@uksecurityjobs.co.uk">Contact Us</a>
        </div>
      </nav>
    </div>
    <div class="foot-bottom">
      <p class="foot-copy">&copy; 2026 UKSecurityJobs.co.uk &mdash; Digital Software Group Ltd. All rights reserved.</p>
      <div class="foot-legal">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/cookies">Cookies</a>
      </div>
    </div>
  </div>
</footer>

<script>
function toggle(btn) {{
  var item = btn.parentElement;
  item.classList.toggle('open');
}}

// Live job count — fetches from public API and updates the hero span.
// Falls back silently if the API is unavailable.
(function() {{
  var city = '{city}';
  var el = document.getElementById('live-count');
  if (!el) return;
  fetch('https://uksecurityjobs-api.onrender.com/api/jobs/public')
    .then(function(r) {{ return r.json(); }})
    .then(function(data) {{
      var jobs = (data.jobs || []).filter(function(j) {{
        return j.location && j.location.toLowerCase().indexOf(city.toLowerCase()) !== -1;
      }});
      if (jobs.length === 0) {{
        el.textContent = 'No live vacancies in {city} right now \u2014 register to be first when roles are posted.';
      }} else {{
        el.textContent = jobs.length + ' live ' + (jobs.length === 1 ? 'vacancy' : 'vacancies') + ' in {city} right now.';
      }}
    }})
    .catch(function() {{ el.textContent = ''; }});
}})();
</script>

<script src="/footer-extras.js" defer></script>
</body>
</html>'''


# ── Generate pages ────────────────────────────────────────────────────────────
count = 0
for c in cities:
    html = TEMPLATE.format(
        city=c['city'],
        slug=c['slug'],
        region=c['region'],
        desc=c['desc'],
        note=c['note'],
        sectors=c['sectors'],
        city_links=CITY_LINKS,
    )
    fname = os.path.join(OUT_DIR, f"{c['slug']}.html")
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(html)
    count += 1
    print(f"Created: {c['slug']}.html")

print(f"\nTotal: {count} pages generated")
