// functions/sitemap-jobs.xml.js
// Cloudflare Pages Function — serves /sitemap-jobs.xml
//
// Returns a dynamic XML sitemap of all currently active direct job pages.
// Googlebot re-fetches sitemaps periodically; because this is server-rendered
// from the live view, it will never list a closed job URL.
//
// Cache-Control: public, max-age=300 (5 min) — fresh enough for daily crawls.

export async function onRequestGet(context) {
  const { env } = context;

  const supaUrl = `${env.SUPABASE_URL}/rest/v1/public_active_jobs?select=id,created_at&order=created_at.desc`;
  let jobs = [];
  try {
    const res = await fetch(supaUrl, {
      headers: {
        'apikey':        env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Accept':        'application/json',
      },
    });
    if (res.ok) {
      jobs = await res.json();
    } else {
      console.error(`[sitemap-jobs.xml] Supabase ${res.status}`);
    }
  } catch (err) {
    console.error(`[sitemap-jobs.xml] fetch error: ${err.message}`);
  }

  const entries = jobs.map(j => {
    const lastmod = new Date(j.created_at).toISOString().split('T')[0];
    return `  <url><loc>https://www.uksecurityjobs.co.uk/vacancies/${j.id}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
