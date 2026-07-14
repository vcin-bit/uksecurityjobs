'use strict';

// ── Reed Jobseeker API ingestion runner ──────────────────────────────────────
// Fetches UK security-sector jobs from Reed's Jobseeker Search API.
// Called daily by the node-cron job in server.js (07:00 UTC).
//
// Required environment variable (set in Render dashboard):
//   REED_API_KEY — Reed Jobseeker API key (from reed.co.uk/developers)
//
// Authentication: HTTP Basic — username=REED_API_KEY, password="" (empty).
//
// Rate limit: 1,000 requests per day on Reed's free plan.
//   We run 5 keywords × up to 4 pages each = max 20 requests per run.
//   At daily runs that is 20 requests/day — well within the 1,000/day limit.
//   Actual request count is logged on every run for monitoring.
//
// Results: Reed returns up to 100 results per page. 4 pages = 400 results
//   per keyword if available. Total cap per run: 5 × 400 = 2,000 jobs.
//
// Dedup: jobs are keyed by (source='reed', external_id=Reed job ID) via the
//   jobs_source_external_dedup unique index. Re-running upserts — updates
//   existing rows and refreshes last_seen_at. No duplicates.
//
// Stale cleanup: Reed jobs not refreshed in the last 7 days are assumed expired
//   at source and are marked status='ended'.

const { supabase } = require('./supabase');

const KEYWORDS = [
  'door supervisor',
  'security guard',
  'SIA licensed',
  'CCTV operator',
  'close protection officer',
];

const RESULTS_PER_PAGE = 100;
const MAX_PAGES_PER_KEYWORD = 4;

// ── Reed API fetch ────────────────────────────────────────────────────────────

async function fetchReedPage(keyword, skip, requestCounter) {
  const { REED_API_KEY } = process.env;
  if (!REED_API_KEY) throw new Error('Missing REED_API_KEY environment variable');

  // Reed Basic auth: username = API key, password = empty string
  const credentials = Buffer.from(`${REED_API_KEY}:`).toString('base64');

  const params = new URLSearchParams({
    keywords:      keyword,
    resultsToSkip: String(skip),
    resultsToTake: String(RESULTS_PER_PAGE),
    locationName:  'United Kingdom',
  });

  const url = `https://www.reed.co.uk/api/1.0/search?${params}`;
  requestCounter.count++;

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept:        'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Reed API ${res.status}: ${body.slice(0, 300)}`);
  }

  return res.json();
}

// ── Result mapping ────────────────────────────────────────────────────────────

function mapReedJob(job) {
  // Reed search results include salary as annual figures when disclosed.
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
    source_url:        job.jobUrl || null,   // Reed's own listing page
    external_id:       String(job.jobId),
    last_seen_at:      new Date().toISOString(),
  };
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

async function ingestReed(requestCounter) {
  let upserted = 0;
  let errors   = 0;

  for (const keyword of KEYWORDS) {
    console.log(`[ingestion] Reed: querying "${keyword}"`);
    try {
      let skip = 0;
      let page = 0;

      while (page < MAX_PAGES_PER_KEYWORD) {
        const data = await fetchReedPage(keyword, skip, requestCounter);
        const results = data.results || [];

        if (!results.length) break;

        for (const job of results) {
          const { error } = await supabase
            .from('jobs')
            .upsert(mapReedJob(job), { onConflict: 'source,external_id', ignoreDuplicates: false });

          if (error) {
            console.error(`[ingestion] Reed upsert failed (jobId ${job.jobId}):`, error.message);
            errors++;
          } else {
            upserted++;
          }
        }

        skip += results.length;
        const totalResults = data.totalResults || 0;
        const hasMore = results.length === RESULTS_PER_PAGE && skip < totalResults;

        console.log(
          `[ingestion] Reed "${keyword}" page ${page + 1}: ` +
          `${results.length} results (${skip}/${totalResults} total)`
        );

        if (!hasMore) break;
        page++;
      }
    } catch (err) {
      console.error(`[ingestion] Reed keyword "${keyword}" failed:`, err.message);
      errors++;
    }
  }

  return { upserted, errors };
}

// ── Stale job cleanup ─────────────────────────────────────────────────────────
// Reed jobs not refreshed in the last 7 days are assumed expired at source.

async function markStaleJobs() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('source', 'reed')
    .eq('status', 'active')
    .lt('last_seen_at', cutoff)
    .select('id');

  if (error) {
    console.error('[ingestion] markStaleJobs failed:', error.message);
    return 0;
  }

  const count = (data || []).length;
  if (count > 0) console.log(`[ingestion] Marked ${count} stale Reed job(s) as ended`);
  return count;
}

// ── Main runner ───────────────────────────────────────────────────────────────

async function runIngestion() {
  const startedAt = new Date().toISOString();
  console.log(`[ingestion] Run started at ${startedAt}`);

  // Shared counter so total outbound requests are visible in logs.
  const requestCounter = { count: 0 };

  try {
    const { upserted, errors } = await ingestReed(requestCounter);
    const staled = await markStaleJobs();

    console.log(
      `[ingestion] Run complete — ` +
      `${requestCounter.count} Reed API request(s) made, ` +
      `${upserted} job(s) upserted, ` +
      `${staled} marked ended, ` +
      `${errors} error(s)`
    );
  } catch (err) {
    console.error('[ingestion] Unexpected error:', err.message);
  }
}

module.exports = { runIngestion };
