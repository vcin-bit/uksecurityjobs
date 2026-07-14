'use strict';

// ── Aggregated job ingestion runner ──────────────────────────────────────────
// Fetches UK security-sector jobs from Adzuna and Reed.
// Called daily by the node-cron job in server.js (06:00 UTC).
//
// Required environment variables (set in Render dashboard):
//   ADZUNA_APP_ID  — Adzuna application ID (from developer.adzuna.com)
//   ADZUNA_APP_KEY — Adzuna application key
//   REED_API_KEY   — Reed API key (from reed.co.uk/developers)
//
// Rate limits (as of 2026):
//   Adzuna: ~250 requests/month on the free Developer plan.
//     We make at most 10 requests per run (5 keywords × max 2 pages).
//     At daily runs that is ~300/month — monitor usage in the Adzuna
//     dashboard and consider running every 2 days if you hit the cap.
//   Reed: ~1 000 requests/month on the free plan.
//     We make at most 10 requests per run (5 keywords × max 2 pages).
//     Well within free-tier limits at daily runs.
//
// Dedup: jobs are keyed by (source, external_id) via the
//   jobs_source_external_dedup unique index. Re-running updates
//   existing rows and refreshes last_seen_at.
// Stale cleanup: aggregated jobs not seen for 7+ days are marked 'ended'.

const { supabase } = require('./supabase');

const KEYWORDS = [
  'door supervisor',
  'security guard',
  'SIA licensed',
  'CCTV operator',
  'close protection officer',
];

// Milliseconds between outbound API requests — keeps us well inside rate limits.
const DELAY_MS = 1500;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ── Adzuna ────────────────────────────────────────────────────────────────────
// Docs: https://developer.adzuna.com/activedocs#!/adzuna/search
// Results per page: 50. We cap at 2 pages per keyword (100 results).

async function fetchAdzunaPage(keyword, page) {
  const { ADZUNA_APP_ID, ADZUNA_APP_KEY } = process.env;
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error('Missing ADZUNA_APP_ID or ADZUNA_APP_KEY');
  }

  const params = new URLSearchParams({
    app_id:          ADZUNA_APP_ID,
    app_key:         ADZUNA_APP_KEY,
    results_per_page: '50',
    what_phrase:     keyword,   // phrase search — more precise than what=
    'content-type':  'application/json',
  });

  const url = `https://api.adzuna.com/v1/api/jobs/gb/search/${page}?${params}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Adzuna ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function mapAdzunaJob(job) {
  let rateFrom = null, rateTo = null, rateType = null;
  if (job.salary_min) {
    rateFrom = parseFloat(job.salary_min);
    rateTo   = job.salary_max ? parseFloat(job.salary_max) : rateFrom;
    rateType = 'annual';
  }

  const contractMap = {
    full_time: 'Full Time',
    part_time: 'Part Time',
  };

  return {
    title:             (job.title || '').trim(),
    company_name:      job.company?.display_name || 'Unknown Employer',
    location:          job.location?.display_name || '',
    description:       job.description || '',
    rate_from:         rateFrom,
    rate_to:           rateTo,
    rate_type:         rateType,
    employment_type:   contractMap[job.contract_time] || null,
    licences_required: [],
    status:            'active',
    source:            'adzuna',
    source_url:        job.redirect_url || null,
    external_id:       String(job.id),
    last_seen_at:      new Date().toISOString(),
  };
}

async function ingestAdzuna() {
  let total = 0;

  for (const keyword of KEYWORDS) {
    console.log(`[ingestion] Adzuna: "${keyword}"`);
    try {
      let page = 1;
      const MAX_PAGES = 2;

      while (page <= MAX_PAGES) {
        await sleep(DELAY_MS);
        const data = await fetchAdzunaPage(keyword, page);
        const results = data.results || [];
        if (!results.length) break;

        for (const job of results) {
          const { error } = await supabase
            .from('jobs')
            .upsert(mapAdzunaJob(job), { onConflict: 'source,external_id', ignoreDuplicates: false });
          if (error) console.error(`[ingestion] Adzuna upsert (${job.id}):`, error.message);
          else total++;
        }

        const hasMore = results.length === 50 && page * 50 < (data.count || 0);
        if (!hasMore) break;
        page++;
      }
    } catch (err) {
      console.error(`[ingestion] Adzuna "${keyword}" failed:`, err.message);
    }
  }

  console.log(`[ingestion] Adzuna complete — ${total} upserted`);
}

// ── Reed ──────────────────────────────────────────────────────────────────────
// Docs: https://www.reed.co.uk/developers/jobseeker
// Auth: HTTP Basic — username=API_KEY, password="" (empty string).
// Results per page: up to 100. We cap at 2 pages per keyword (200 results).

async function fetchReedPage(keyword, skip) {
  const { REED_API_KEY } = process.env;
  if (!REED_API_KEY) throw new Error('Missing REED_API_KEY');

  const credentials = Buffer.from(`${REED_API_KEY}:`).toString('base64');
  const params = new URLSearchParams({
    keywords:      keyword,
    resultsToSkip: String(skip),
    resultsToTake: '100',
    locationName:  'United Kingdom',
  });

  const url = `https://www.reed.co.uk/api/1.0/search?${params}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Reed ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function mapReedJob(job) {
  let rateFrom = null, rateTo = null, rateType = null;
  if (job.minimumSalary) {
    rateFrom = parseFloat(job.minimumSalary);
    rateTo   = job.maximumSalary ? parseFloat(job.maximumSalary) : rateFrom;
    rateType = 'annual';
  }

  return {
    title:             (job.jobTitle || '').trim(),
    company_name:      job.employerName || 'Unknown Employer',
    location:          job.locationName || '',
    description:       job.jobDescription || '',
    rate_from:         rateFrom,
    rate_to:           rateTo,
    rate_type:         rateType,
    employment_type:   null, // not reliably present in Reed search results
    licences_required: [],
    status:            'active',
    source:            'reed',
    source_url:        job.jobUrl || null,
    external_id:       String(job.jobId),
    last_seen_at:      new Date().toISOString(),
  };
}

async function ingestReed() {
  let total = 0;

  for (const keyword of KEYWORDS) {
    console.log(`[ingestion] Reed: "${keyword}"`);
    try {
      let skip = 0;
      const MAX_PAGES = 2;
      let page = 0;

      while (page < MAX_PAGES) {
        await sleep(DELAY_MS);
        const data = await fetchReedPage(keyword, skip);
        const results = data.results || [];
        if (!results.length) break;

        for (const job of results) {
          const { error } = await supabase
            .from('jobs')
            .upsert(mapReedJob(job), { onConflict: 'source,external_id', ignoreDuplicates: false });
          if (error) console.error(`[ingestion] Reed upsert (${job.jobId}):`, error.message);
          else total++;
        }

        skip += results.length;
        const hasMore = results.length === 100 && skip < (data.totalResults || 0);
        if (!hasMore) break;
        page++;
      }
    } catch (err) {
      console.error(`[ingestion] Reed "${keyword}" failed:`, err.message);
    }
  }

  console.log(`[ingestion] Reed complete — ${total} upserted`);
}

// ── Stale job cleanup ─────────────────────────────────────────────────────────
// Aggregated jobs not seen in the last 7 days are assumed expired at source.

async function markStaleJobs() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .neq('source', 'direct')
    .eq('status', 'active')
    .lt('last_seen_at', cutoff)
    .select('id');

  if (error) {
    console.error('[ingestion] Failed to mark stale jobs:', error.message);
    return;
  }
  const count = (data || []).length;
  if (count > 0) console.log(`[ingestion] Marked ${count} stale aggregated job(s) as ended`);
}

// ── Main runner ───────────────────────────────────────────────────────────────

async function runIngestion() {
  console.log(`[ingestion] Run started at ${new Date().toISOString()}`);
  try {
    await ingestAdzuna();
    await ingestReed();
    await markStaleJobs();
  } catch (err) {
    console.error('[ingestion] Unexpected error:', err.message);
  }
  console.log(`[ingestion] Run complete at ${new Date().toISOString()}`);
}

module.exports = { runIngestion };
