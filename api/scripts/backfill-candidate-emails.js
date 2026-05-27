#!/usr/bin/env node
// One-time backfill: populate blank candidate emails from Clerk.
// Run: cd api && node scripts/backfill-candidate-emails.js
//
// Requires SUPABASE_URL, SUPABASE_SERVICE_KEY, CLERK_SECRET_KEY
// in .env or environment.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { createClerkClient } = require('@clerk/backend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function main() {
  const { data: candidates, error } = await supabase
    .from('candidates')
    .select('id, clerk_user_id, email')
    .or('email.is.null,email.eq.');

  if (error) {
    console.error('Failed to fetch candidates:', error.message);
    process.exit(1);
  }

  console.log(`Found ${candidates.length} candidates with blank email.\n`);

  let updated = 0;
  let failed = 0;

  for (const c of candidates) {
    try {
      const clerkUser = await clerk.users.getUser(c.clerk_user_id);
      const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';

      if (!email) {
        console.log(`  ${c.id}  ${c.clerk_user_id}  email: NONE (Clerk has no email)`);
        failed++;
        continue;
      }

      const { error: updateErr } = await supabase
        .from('candidates')
        .update({ email })
        .eq('id', c.id);

      if (updateErr) {
        console.log(`  ${c.id}  ${c.clerk_user_id}  email: ${email}  UPDATE FAILED: ${updateErr.message}`);
        failed++;
        continue;
      }

      console.log(`  ${c.id}  ${c.clerk_user_id}  email: ${email}  UPDATED`);
      updated++;
    } catch (e) {
      console.log(`  ${c.id}  ${c.clerk_user_id}  CLERK LOOKUP FAILED: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${candidates.length} processed, ${updated} updated, ${failed} failed.`);
}

main();
