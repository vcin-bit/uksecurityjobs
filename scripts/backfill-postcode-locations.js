#!/usr/bin/env node
/**
 * scripts/backfill-postcode-locations.js
 *
 * Finds personal_details rows that have a postcode but no lat/lng and
 * geocodes them via the postcodes.io BULK endpoint (100 per batch).
 *
 * Dry-run by default — shows counts and a sample of what would be updated.
 * Pass --send to apply.
 *
 * Usage:
 *   node scripts/backfill-postcode-locations.js         # dry run
 *   node scripts/backfill-postcode-locations.js --send  # apply
 */

'use strict';

const path = require('path');

require(path.join(__dirname, '../api/node_modules/dotenv')).config({
  path: path.join(__dirname, '../api/.env'),
});

const { createClient } = require(
  path.join(__dirname, '../api/node_modules/@supabase/supabase-js')
);
const { geocodePostcodesBulk } = require(
  path.join(__dirname, '../api/src/lib/postcodes')
);

const SEND_LIVE  = process.argv.includes('--send');
const BATCH_SIZE = 100;   // postcodes.io hard limit per bulk request

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log(`\nbackfill-postcode-locations — ${SEND_LIVE ? 'LIVE' : 'DRY RUN'}\n`);

  // 1. All rows with a postcode but no lat yet.
  const { data: rows, error } = await supabase
    .from('personal_details')
    .select('id, candidate_id, postcode')
    .not('postcode', 'is', null)
    .neq('postcode', '')
    .is('postcode_lat', null);

  if (error) { console.error('Query failed:', error.message); process.exit(1); }
  if (!rows || rows.length === 0) { console.log('Nothing to backfill.'); return; }

  console.log(`Rows needing geocoding: ${rows.length}`);

  // 2. Build normMap keyed by the exact string we will send to postcodes.io.
  //    Trim outer whitespace and uppercase — internal spaces preserved so
  //    item.query echoes back the same string (Amendment A/B: no space-strip).
  const normMap = new Map();   // sentPostcode → [row, ...]
  for (const row of rows) {
    const sent = row.postcode.trim().toUpperCase();
    if (!normMap.has(sent)) normMap.set(sent, []);
    normMap.get(sent).push(row);
  }
  const uniquePostcodes = [...normMap.keys()];
  console.log(`Unique postcodes: ${uniquePostcodes.length}`);

  if (!SEND_LIVE) {
    console.log(`\nSample (first 5):`);
    uniquePostcodes.slice(0, 5).forEach(p => console.log(`  "${p}"`));
    console.log(`\nDRY RUN — pass --send to apply.`);
    return;
  }

  // 3. Batch through postcodes.io.
  let updated = 0, invalid = 0, failed = 0;

  for (let i = 0; i < uniquePostcodes.length; i += BATCH_SIZE) {
    const batch    = uniquePostcodes.slice(i, i + BATCH_SIZE);
    const coordMap = await geocodePostcodesBulk(batch);
    const now      = new Date().toISOString();

    for (const sent of batch) {
      // Look up by the exact string sent — coordMap is keyed by item.query
      // which postcodes.io echoes back verbatim.
      const coords      = coordMap.get(sent);
      const affectedRows = normMap.get(sent) || [];

      if (coords === undefined) {
        // postcodes.io didn't include this postcode in the response at all
        console.warn(`  MISSING in response: "${sent}" (${affectedRows.length} row(s))`);
        failed += affectedRows.length;
        continue;
      }

      if (!coords) {
        console.warn(`  INVALID: "${sent}" (${affectedRows.length} row(s))`);
        invalid += affectedRows.length;
        continue;
      }

      for (const row of affectedRows) {
        const { error: upErr } = await supabase
          .from('personal_details')
          .update({
            postcode_lat:        coords.lat,
            postcode_lng:        coords.lng,
            postcode_located_at: now,
          })
          .eq('id', row.id);

        if (upErr) {
          console.error(`  FAILED ${row.id.slice(0, 8)}:`, upErr.message);
          failed++;
        } else {
          updated++;
        }
      }
    }

    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const total    = Math.ceil(uniquePostcodes.length / BATCH_SIZE);
    console.log(`  Batch ${batchNum}/${total}: done`);
  }

  console.log(`\nDone — updated: ${updated}, invalid postcodes: ${invalid}, failed: ${failed}`);

  // Amendment B: warn if nothing was updated but there were rows to process.
  if (updated === 0 && rows.length > 0) {
    console.warn('\n⚠  WARNING: 0 rows updated despite having rows to process.');
    console.warn('   Check SUPABASE_SERVICE_KEY, network access to postcodes.io,');
    console.warn('   and that migration 0033 has been applied.');
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
