/**
 * functions/security-jobs-birmingham.js
 *
 * Serves /security-jobs-birmingham with live West Midlands security jobs
 * injected into the static HTML shell via HTMLRewriter.
 *
 * Job source: public_active_jobs view, filtered by West Midlands postcodes
 * (B, CV, DY, WS, WV — covers Birmingham, Solihull, Coventry, Wolverhampton,
 * Walsall and Dudley). Cards link to /vacancies/{id}.
 *
 * Resilient: on Supabase error, serves the shell with the default empty-state
 * block already in the HTML. Never returns 5xx.
 */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPay(job) {
  if (!job.rate_from && !job.rate_to) return null;
  const fmt = n => {
    const v = parseFloat(n);
    return '\u00a3' + (Number.isInteger(v) ? v : v.toFixed(2));
  };
  const suffix =
    job.rate_type === 'hourly' ? '/hr' :
    job.rate_type === 'daily'  ? '/day' :
    job.rate_type === 'annual' ? '/yr' : '';
  if (job.rate_from && job.rate_to && String(job.rate_from) !== String(job.rate_to)) {
    return fmt(job.rate_from) + '\u2013' + fmt(job.rate_to) + suffix;
  }
  return fmt(job.rate_from || job.rate_to) + suffix;
}

function renderJobCards(jobs) {
  if (!jobs.length) {
    return '<p class="jobs-empty">No live West Midlands roles right now. ' +
      '<a href="/officers">Register free</a> and employers looking for ' +
      'officers in the area can find you.</p>';
  }

  const cards = jobs.map(job => {
    const pay     = formatPay(job);
    const licence = Array.isArray(job.licences_required) && job.licences_required[0]
      ? job.licences_required[0] : null;

    return `<article class="jc">
  <div class="jc-head">
    <h3 class="jc-title"><a href="/vacancies/${esc(job.id)}">${esc(job.title)}</a></h3>
    <div class="jc-employer">${esc(job.company_name)}</div>
  </div>
  <div class="jc-meta">
    <span class="jc-loc">${esc(job.location)}</span>
    ${pay     ? `<span class="jc-tag jc-tag--rate">${esc(pay)}</span>` : ''}
    ${job.employment_type ? `<span class="jc-tag">${esc(job.employment_type)}</span>` : ''}
    ${licence ? `<span class="jc-tag">${esc(licence)}</span>` : ''}
  </div>
  <a class="jc-apply" href="/vacancies/${esc(job.id)}">View job &rarr;</a>
</article>`;
  }).join('\n');

  return `<div class="jc-grid">\n${cards}\n</div>`;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  // ── 1. Fetch live West Midlands jobs ─────────────────────────────────────
  let jobs = [];
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    try {
      const url = new URL(`${env.SUPABASE_URL}/rest/v1/public_active_jobs`);
      // URLSearchParams encodes % → %25; PostgREST decodes %25 → % for ILIKE
      url.searchParams.set(
        'or',
        '(postcode.ilike.B%,postcode.ilike.CV%,postcode.ilike.DY%,postcode.ilike.WS%,postcode.ilike.WV%)'
      );
      url.searchParams.set(
        'select',
        'id,title,company_name,location,postcode,rate_from,rate_to,rate_type,employment_type,licences_required'
      );
      url.searchParams.set('order', 'created_at.desc');

      const res = await fetch(url.toString(), {
        headers: {
          apikey:        env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          Accept:        'application/json',
        },
      });

      if (res.ok) {
        jobs = await res.json();
      } else {
        console.error('[birmingham] Supabase', res.status, await res.text());
      }
    } catch (err) {
      console.error('[birmingham] Supabase fetch failed:', err.message);
    }
  } else {
    console.error('[birmingham] SUPABASE_URL or SUPABASE_ANON_KEY not set');
  }

  // ── 2. Fetch the static HTML shell ───────────────────────────────────────
  const shell = await env.ASSETS.fetch(request);

  // ── 3. Inject job cards via HTMLRewriter ─────────────────────────────────
  const rewritten = new HTMLRewriter()
    .on('#jobs-inject', {
      element(el) {
        el.setInnerContent(renderJobCards(jobs), { html: true });
      },
    })
    .transform(shell);

  return new Response(rewritten.body, {
    status: 200,
    headers: {
      'Content-Type':  'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
