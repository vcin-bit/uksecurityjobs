#!/usr/bin/env node
/**
 * build-location-jobs.js
 *
 * Fetches live jobs from /api/jobs/public and injects location-filtered
 * job cards into a target HTML file between <!-- JOBS:START --> and
 * <!-- JOBS:END --> markers. Idempotent: re-running replaces existing
 * content between the markers, never appends.
 *
 * Usage:
 *   node scripts/build-location-jobs.js --city "London" \
 *     --file security-jobs-london.html
 *
 * Options:
 *   --city   City name to filter against (matches location or postcode)
 *   --file   Path to the target HTML file (relative to repo root)
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const API_URL = 'https://uksecurityjobs-api.onrender.com/api/jobs/public';

// London postcode prefixes — covers all Greater London postcode areas
const LONDON_POSTCODE_RE = /^(E|EC|N|NW|SE|SW|W|WC)\d/i;

const MARKER_START = '<!-- JOBS:START -->';
const MARKER_END   = '<!-- JOBS:END -->';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  const city = get('--city');
  const file = get('--file');
  if (!city || !file) {
    console.error('Usage: node scripts/build-location-jobs.js --city "London" --file security-jobs-london.html');
    process.exit(1);
  }
  return { city, file };
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('Invalid JSON: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

function matchesCity(job, city) {
  const lc = city.toLowerCase();
  const locMatch = job.location && job.location.toLowerCase().includes(lc);
  const pcMatch  = city.toLowerCase() === 'london'
    ? (job.postcode && LONDON_POSTCODE_RE.test(job.postcode.trim()))
    : false;
  return locMatch || pcMatch;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRate(job) {
  if (!job.rate_from && !job.rate_to) return null;
  const type = job.rate_type === 'hourly' ? '/hr' : job.rate_type === 'annual' ? '/yr' : '';
  if (job.rate_from && job.rate_to) {
    return `&pound;${job.rate_from}&ndash;&pound;${job.rate_to}${type}`;
  }
  return `&pound;${job.rate_from || job.rate_to}${type}`;
}


const NOINDEX_TAG  = '<meta name="robots" content="noindex,follow"/>';
const CANONICAL_RE = /(<link rel="canonical"[^\n]*\/>\n)/;
const SITEMAP_PATH = path.resolve(process.cwd(), 'sitemap.xml');
const BASE_URL     = 'https://www.uksecurityjobs.co.uk/';
const ENTRY_TPL    = (slug) =>
  `  <url><loc>${BASE_URL}${slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;

function updateRobots(filePath, indexable) {
  let html = fs.readFileSync(filePath, 'utf8');
  const hasTag = html.includes(NOINDEX_TAG);
  if (!indexable && !hasTag) {
    html = html.replace(CANONICAL_RE, `$1${NOINDEX_TAG}\n`);
  } else if (indexable && hasTag) {
    html = html.replace(NOINDEX_TAG + '\n', '');
  }
  fs.writeFileSync(filePath, html, 'utf8');
}

function updateSitemap(slug, indexable) {
  if (!fs.existsSync(SITEMAP_PATH)) return;
  let xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  // Remove existing entry for this slug (idempotent)
  xml = xml.replace(
    new RegExp('\\n  <url><loc>' + BASE_URL.replace(/\./g, '\\.') + slug + '<\\/loc>[^\\n]*<\\/url>'),
    ''
  );
  if (indexable) {
    xml = xml.replace('\n</urlset>', '\n' + ENTRY_TPL(slug) + '\n</urlset>');
  }
  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
}

function renderCards(jobs) {
  if (jobs.length === 0) {
    return `<p class="jobs-empty">No live vacancies in this area right now &mdash; <a href="https://app.uksecurityjobs.co.uk/sign-up">register to be first when roles are posted</a>.</p>`;
  }

  const cards = jobs.map(job => {
    const rate     = formatRate(job);
    const empType  = job.employment_type ? `<span class="jc-tag">${esc(job.employment_type)}</span>` : '';
    const rateTag  = rate ? `<span class="jc-tag jc-tag--rate">${rate}</span>` : '';
    const employer = job.employers && job.employers.company_name
      ? esc(job.employers.company_name)
      : esc(job.company_name);
    const acs = job.employers && job.employers.sia_acs
      ? `<span class="jc-acs" title="SIA Approved Contractor">ACS</span>` : '';

    return `<article class="jc">
  <div class="jc-head">
    <h3 class="jc-title">${esc(job.title)}</h3>
    <div class="jc-employer">${employer}${acs}</div>
  </div>
  <div class="jc-meta">
    <span class="jc-loc">${esc(job.location)}</span>
    ${empType}${rateTag}
  </div>
  ${job.source === 'reed' ? '<p class="jc-via">Listed via Reed</p>' : ''}
  <a class="jc-apply" href="https://app.uksecurityjobs.co.uk/sign-up">Register to apply &rarr;</a>
</article>`;
  }).join('\n');

  return `<div class="jc-grid">
${cards}
</div>`;
}

async function main() {
  const { city, file } = parseArgs();
  const filePath = path.resolve(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(filePath, 'utf8');

  if (!html.includes(MARKER_START) || !html.includes(MARKER_END)) {
    console.error(`Markers not found in ${file}. Add <!-- JOBS:START --><!-- JOBS:END --> first.`);
    process.exit(1);
  }

  console.log(`Fetching jobs from ${API_URL}...`);
  const { jobs: allJobs } = await fetchJson(API_URL);
  const filtered = allJobs.filter(j => matchesCity(j, city));
  console.log(`Total active: ${allJobs.length} | Matched "${city}": ${filtered.length}`);

  const inner = '\n' + renderCards(filtered) + '\n';
  const updated = html.replace(
    new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`),
    MARKER_START + inner + MARKER_END
  );

  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`Written: ${file}`);

  const slug = path.basename(file, '.html');
  const indexable = filtered.length >= 1;
  updateRobots(filePath, indexable);
  updateSitemap(slug, indexable);
  console.log(`robots: ${indexable ? 'index' : 'noindex'} | sitemap: ${indexable ? 'added' : 'removed'}`);

  // Print the injected block for inspection
  const match = updated.match(new RegExp(`${MARKER_START}([\\s\\S]*?)${MARKER_END}`));
  if (match) {
    console.log('\n--- Injected block ---');
    console.log(match[1]);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
