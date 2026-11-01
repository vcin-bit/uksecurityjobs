'use strict';
/**
 * api/src/routes/shifts.js
 *
 * Employer-facing shifts API.
 * Mounted in server.js with requireAuth + requireVerifiedEmployer — every
 * route in this file is automatically protected.
 *
 * POST /api/shifts   — create shift, geocode site, alert guards
 * GET  /api/shifts   — list this employer's shifts with response counts
 */

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');

const { supabase, auditLog }          = require('../lib/supabase');
const { geocodePostcode }             = require('../lib/postcodes');
const { londonToUtc }                 = require('./talentPool');
const {
  sendShiftAlert, sendShiftBooked, sendShiftFilledNotice,
  formatShiftRange, formatShiftDay, isOptedOut,
} = require('../lib/email');

// ── Constants ─────────────────────────────────────────────────────────────────

// Exact values stored in sia_licences.licence_type (verified from DB).
const VALID_LICENCE_TYPES = [
  'CCTV Operator',
  'Close Protection',
  'Door Supervisor',
  'Security Guard',
];

const VALID_PAY_TERMS = ['next_day', 'weekly', 'monthly'];
const VALID_RADII     = [5, 10, 15, 20, 30];

// ── Safety switch (Amendment A / B of Prompt 25) ─────────────────────────────
// SHIFT_ALERTS_LIVE must be exactly 'true' in the environment to email real
// guards.  Default is OFF.
//
// When OFF:
//   - candidates_near_shift + licence filter still run (count/distances logged).
//   - shift_responses rows and emails are created ONLY for candidates whose IDs
//     appear in SHIFT_ALERTS_TEST_CANDIDATE_IDS (comma-separated).
//   - Real guards get no response row and no email.
const ALERTS_LIVE   = process.env.SHIFT_ALERTS_LIVE === 'true';
const TEST_CAND_IDS = new Set(
  (process.env.SHIFT_ALERTS_TEST_CANDIDATE_IDS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
);

// ── Licence coverage map (module scope — used in POST and GET /:id) ──────────
// A guard qualifies for a required type if any of their licences is in the set.
// DS and CP officers hold a superset of Security Guard powers; CP covers DS.
const LICENCE_COVERAGE = {
  'Security Guard':   new Set(['Security Guard', 'Door Supervisor', 'Close Protection']),
  'Door Supervisor':  new Set(['Door Supervisor', 'Close Protection']),
  'CCTV Operator':    new Set(['CCTV Operator']),
  'Close Protection': new Set(['Close Protection']),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Add one calendar day to a YYYY-MM-DD string (overnight shift end date).
function nextDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z'); // noon UTC avoids DST ambiguity
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Page URL for "stop shift alerts" — React route, confirm button calls the API.
function stopAlertsPageUrl(token) {
  return `https://app.uksecurityjobs.co.uk/stop-shift-alerts/${token}`;
}

// Apply test-mode filter: when ALERTS_LIVE is off only send to TEST_CAND_IDS.
// Each item in list must have a candidate_id field.
function guardsForEmail(list) {
  if (ALERTS_LIVE) return list;
  return list.filter(g => TEST_CAND_IDS.has(g.candidate_id));
}

// ── POST /api/shifts ──────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      shift_date, shift_start_time, shift_end_time,
      site_postcode,
      licence_types,
      rate_per_hour,
      pay_terms,
      radius_miles = 15,
      notes,
      site_name, site_address, report_to, escalation_contacts, site_tasks,
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!shift_date || !shift_start_time || !shift_end_time) {
      return res.status(422).json({
        error: 'shift_date, shift_start_time and shift_end_time are required',
        code:  'missing_times',
      });
    }
    if (!site_postcode) {
      return res.status(422).json({ error: 'site_postcode is required', code: 'missing_postcode' });
    }
    if (!Array.isArray(licence_types) || licence_types.length === 0) {
      return res.status(422).json({ error: 'licence_types must be a non-empty array', code: 'missing_licence_types' });
    }
    const invalidLicences = licence_types.filter(lt => !VALID_LICENCE_TYPES.includes(lt));
    if (invalidLicences.length > 0) {
      return res.status(422).json({
        error: `Invalid licence_type(s): ${invalidLicences.join(', ')}. Valid values: ${VALID_LICENCE_TYPES.join(', ')}`,
        code:  'invalid_licence_types',
      });
    }
    if (!rate_per_hour || Number(rate_per_hour) <= 0) {
      return res.status(422).json({ error: 'rate_per_hour must be > 0', code: 'invalid_rate' });
    }
    if (!VALID_PAY_TERMS.includes(pay_terms)) {
      return res.status(422).json({
        error: `pay_terms must be one of: ${VALID_PAY_TERMS.join(', ')}`,
        code:  'invalid_pay_terms',
      });
    }
    if (!VALID_RADII.includes(Number(radius_miles))) {
      return res.status(422).json({
        error: `radius_miles must be one of: ${VALID_RADII.join(', ')}`,
        code:  'invalid_radius',
      });
    }

    // ── Convert UK local times to UTC (Amendment B) ───────────────────────────
    // Accepts shift_date="YYYY-MM-DD", shift_start_time="HH:MM",
    //         shift_end_time="HH:MM"
    // If end_time < start_time lexicographically, the shift is overnight:
    // end falls on date + 1.
    const startLocal  = `${shift_date}T${shift_start_time}`;
    const isOvernight = shift_end_time < shift_start_time;
    const endDateStr  = isOvernight ? nextDay(shift_date) : shift_date;
    const endLocal    = `${endDateStr}T${shift_end_time}`;

    const startUtc = londonToUtc(startLocal);
    const endUtc   = londonToUtc(endLocal);

    // ── Reject shift_start in the past (Amendment D) ─────────────────────────
    if (isNaN(startUtc.getTime())) {
      return res.status(422).json({ error: 'Invalid shift_date or shift_start_time', code: 'invalid_times' });
    }
    if (startUtc <= new Date()) {
      return res.status(422).json({ error: 'shift_start must be in the future', code: 'shift_start_past' });
    }
    if (endUtc <= startUtc) {
      return res.status(422).json({ error: 'shift_end must be after shift_start', code: 'shift_end_before_start' });
    }

    // ── Rate limit: 10 shifts per rolling 24 h per employer (Amendment D) ────
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: rlErr } = await supabase
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('employer_id', req.employer.id)
      .gte('created_at', since);

    if (rlErr) throw rlErr;
    if (count >= 10) {
      return res.status(429).json({
        error: 'You can post at most 10 shifts per 24 hours',
        code:  'rate_limit',
      });
    }

    // ── Geocode site postcode — single fetch, returns lat/lng/adminDistrict ───
    const normPostcode = site_postcode.trim().toUpperCase();
    const geo = await geocodePostcode(normPostcode);
    if (!geo) {
      return res.status(422).json({
        error: `Postcode "${normPostcode}" was not found. Please enter a valid UK postcode.`,
        code:  'postcode_not_found',
      });
    }

    // ── Insert shift ──────────────────────────────────────────────────────────
    const { data: shift, error: sErr } = await supabase
      .from('shifts')
      .insert({
        employer_id:         req.employer.id,
        created_by:          req.userId,
        site_postcode:       normPostcode,
        site_town:           geo.adminDistrict,
        site_lat:            geo.lat,
        site_lng:            geo.lng,
        shift_start:         startUtc.toISOString(),
        shift_end:           endUtc.toISOString(),
        licence_types,
        rate_per_hour:       Number(rate_per_hour),
        pay_terms,
        radius_miles:        Number(radius_miles),
        notes:               notes               || null,
        site_name:           site_name           || null,
        site_address:        site_address        || null,
        report_to:           report_to           || null,
        escalation_contacts: escalation_contacts || null,
        site_tasks:          site_tasks          || null,
      })
      .select('id, site_lat, site_lng, radius_miles, site_town, shift_start, shift_end, rate_per_hour, pay_terms, licence_types')
      .single();

    if (sErr) throw sErr;

    // ── Find nearby opted-in guards ───────────────────────────────────────────
    const { data: nearby, error: rpcErr } = await supabase.rpc('candidates_near_shift', {
      shift_lat: shift.site_lat,
      shift_lng: shift.site_lng,
      radius_mi: shift.radius_miles,
    });
    if (rpcErr) throw rpcErr;

    // ── Filter: guard must hold at least one of the required licence types ────
    const nearbyIds = (nearby || []).map(r => r.candidate_id);
    let eligibleGuards = [];

    if (nearbyIds.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: licences } = await supabase
        .from('sia_licences')
        .select('candidate_id, licence_type')
        .in('candidate_id', nearbyIds)
        .eq('verified', true)
        .gte('expiry_date', today);

      const licenceMap = {};
      for (const l of licences || []) {
        if (!licenceMap[l.candidate_id]) licenceMap[l.candidate_id] = new Set();
        licenceMap[l.candidate_id].add(l.licence_type);
      }

      // Coverage rule: use module-scope LICENCE_COVERAGE map (DS/CP cover guarding).
      eligibleGuards = (nearby || []).filter(g => {
        const gl = licenceMap[g.candidate_id];
        if (!gl) return false;
        return licence_types.some(lt => {
          const covers = LICENCE_COVERAGE[lt];
          return covers && [...gl].some(guardLicence => covers.has(guardLicence));
        });
      });
    }

    // ── Safety switch (Amendment A) ───────────────────────────────────────────
    let guardsToAlert;

    if (ALERTS_LIVE) {
      guardsToAlert = eligibleGuards;
    } else {
      // Log real match count and distances for monitoring.
      console.log(
        `[shifts/TEST] ${eligibleGuards.length} real guard(s) in range:`,
        eligibleGuards.length > 0
          ? eligibleGuards.map(g =>
              `${g.candidate_id.slice(0, 8)} ${Number(g.distance_miles || 0).toFixed(1)}mi`
            ).join(', ')
          : 'none'
      );
      // Use only test candidate IDs — regardless of distance or licence.
      guardsToAlert = TEST_CAND_IDS.size > 0
        ? [...TEST_CAND_IDS].map(id => ({ candidate_id: id, distance_miles: null }))
        : [];
      if (guardsToAlert.length === 0) {
        console.log('[shifts/TEST] No test candidate IDs configured — no response rows created.');
      }
    }

    // ── Create shift_responses ────────────────────────────────────────────────
    const responseRows = guardsToAlert.map(g => ({
      shift_id:       shift.id,
      candidate_id:   g.candidate_id,
      token:          crypto.randomUUID(),
      token_expires:  startUtc.toISOString(),   // expires when shift starts
      distance_miles: g.distance_miles != null ? Number(Number(g.distance_miles).toFixed(1)) : null,
      response:       'none',
    }));

    let insertedRows = [];
    if (responseRows.length > 0) {
      const { data: inserted, error: rErr } = await supabase
        .from('shift_responses')
        .insert(responseRows)
        .select('candidate_id, token, distance_miles');

      if (rErr) throw rErr;
      insertedRows = inserted || [];
    }

    // Update shift with alert metadata.
    await supabase
      .from('shifts')
      .update({
        alert_sent_at:    new Date().toISOString(),
        recipients_count: insertedRows.length,
      })
      .eq('id', shift.id);

    // ── Fire-and-forget alert emails ──────────────────────────────────────────
    if (insertedRows.length > 0) {
      const guardIds = insertedRows.map(r => r.candidate_id);
      const tokenMap = Object.fromEntries(insertedRows.map(r => [r.candidate_id, r.token]));
      const distMap  = Object.fromEntries(insertedRows.map(r => [r.candidate_id, r.distance_miles]));
      const shiftRange = formatShiftRange(shift.shift_start, shift.shift_end);

      Promise.all([
        supabase.from('employers').select('company_name').eq('id', req.employer.id).single(),
        supabase.from('candidates').select('id, email').in('id', guardIds),
        supabase.from('personal_details').select('candidate_id, first_name').in('candidate_id', guardIds),
      ]).then(async ([empRes, candRes, pdRes]) => {
        const employerName = empRes.data?.company_name || 'A security company';
        const emailMap     = Object.fromEntries((candRes.data || []).map(c => [c.id, c.email]));
        const nameMap      = Object.fromEntries((pdRes.data  || []).map(p => [p.candidate_id, p.first_name]));

        for (const guardId of guardIds) {
          const toEmail = emailMap[guardId];
          if (!toEmail) continue;

          // Check opt-out (belt-and-braces).
          const optedOut = await isOptedOut(supabase, toEmail);
          if (optedOut) continue;

          // Fetch or create unsubscribe token.
          const { data: unsubRow } = await supabase
            .from('email_optouts')
            .select('token')
            .eq('email', toEmail)
            .maybeSingle();

          let unsubToken = unsubRow?.token;
          if (!unsubToken) {
            unsubToken = crypto.randomUUID();
            await supabase.from('email_optouts').insert({
              email:  toEmail,
              token:  unsubToken,
              source: 'shift_alert',
            });
          }

          const respondUrl   = `https://app.uksecurityjobs.co.uk/shift-response/${tokenMap[guardId]}`;
          const stopUrl      = stopAlertsPageUrl(tokenMap[guardId]);
          const unsubUrl     = `https://app.uksecurityjobs.co.uk/unsubscribe/${unsubToken}`;

          sendShiftAlert({
            toEmail,
            firstName:        nameMap[guardId] || null,
            employerName,
            siteTown:         shift.site_town || normPostcode,
            shiftRange,
            shiftStartUtc:    shift.shift_start,
            shiftEndUtc:      shift.shift_end,
            licenceTypes:     shift.licence_types,
            ratePerHour:      Number(shift.rate_per_hour),
            payTerms:         shift.pay_terms,
            distanceMiles:    distMap[guardId],
            respondUrl,
            stopAlertsPageUrl: stopUrl,
            unsubUrl,
          }).catch(e => console.error('[sendShiftAlert]', e.message));
        }
      }).catch(e => console.error('[shift alert emails]', e.message));
    }

    res.status(201).json({ id: shift.id, recipients_count: insertedRows.length });
  } catch (err) {
    console.error('POST /api/shifts error:', err);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

// ── GET /api/shifts ───────────────────────────────────────────────────────────
// Lists this employer's shifts newest-first with yes/no/none response counts.
router.get('/', async (req, res) => {
  try {
    const { data: shifts, error: sErr } = await supabase
      .from('shifts')
      .select(
        'id, site_town, site_postcode, shift_start, shift_end, ' +
        'licence_types, rate_per_hour, pay_terms, status, ' +
        'recipients_count, alert_sent_at, created_at'
      )
      .eq('employer_id', req.employer.id)
      .order('created_at', { ascending: false });

    if (sErr) throw sErr;

    const shiftIds = (shifts || []).map(s => s.id);
    const counts   = {};

    if (shiftIds.length > 0) {
      const { data: responses } = await supabase
        .from('shift_responses')
        .select('shift_id, response')
        .in('shift_id', shiftIds);

      for (const r of responses || []) {
        if (!counts[r.shift_id]) counts[r.shift_id] = { yes: 0, no: 0, none: 0 };
        counts[r.shift_id][r.response] = (counts[r.shift_id][r.response] || 0) + 1;
      }
    }

    res.json({
      shifts: (shifts || []).map(s => ({
        ...s,
        responses: counts[s.id] || { yes: 0, no: 0, none: 0 },
      })),
    });
  } catch (err) {
    console.error('GET /api/shifts error:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// ── GET /api/shifts/:id ───────────────────────────────────────────────────────
// Shift details + yes-responders (sorted by responded_at). Chosen candidate
// gets extra fields: full name, phone, RTW proof label, licence expiry.
// Never returns email, postcode or location coordinates.
router.get('/:id', async (req, res) => {
  try {
    const { data: shift, error: sErr } = await supabase
      .from('shifts')
      .select(
        'id, employer_id, site_town, site_postcode, shift_start, shift_end, ' +
        'licence_types, rate_per_hour, pay_terms, status, notes, ' +
        'recipients_count, alert_sent_at, created_at, ' +
        'chosen_candidate_id, chosen_at, confirmed_at'
      )
      .eq('id', req.params.id)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!shift || shift.employer_id !== req.employer.id) {
      return res.status(404).json({ error: 'Not found' });
    }

    // All responses for this shift.
    const { data: allResps, error: rErr } = await supabase
      .from('shift_responses')
      .select('candidate_id, response, responded_at, distance_miles')
      .eq('shift_id', shift.id);
    if (rErr) throw rErr;

    // Response counts.
    const counts = { yes: 0, no: 0, none: 0 };
    for (const r of allResps || []) counts[r.response] = (counts[r.response] || 0) + 1;

    // Yes-responders ordered first-to-reply.
    const yesResps = (allResps || [])
      .filter(r => r.response === 'yes')
      .sort((a, b) => new Date(a.responded_at) - new Date(b.responded_at));

    const yesIds = yesResps.map(r => r.candidate_id);
    let yesGuards = [];

    if (yesIds.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const [pdRes, candRes, licRes] = await Promise.all([
        supabase.from('personal_details')
          .select('candidate_id, first_name, last_name, years_experience, right_to_work_proof, phone')
          .in('candidate_id', yesIds),
        supabase.from('candidates')
          .select('id, profile_complete')
          .in('id', yesIds),
        supabase.from('sia_licences')
          .select('candidate_id, licence_type, expiry_date')
          .in('candidate_id', yesIds)
          .eq('verified', true)
          .gte('expiry_date', today),
      ]);

      const pdMap   = Object.fromEntries((pdRes.data   || []).map(p => [p.candidate_id, p]));
      const candMap = Object.fromEntries((candRes.data  || []).map(c => [c.id, c]));
      const licMap  = {};
      for (const l of licRes.data || []) {
        if (!licMap[l.candidate_id]) licMap[l.candidate_id] = [];
        licMap[l.candidate_id].push(l);
      }

      const EXP_LABELS = {
        under_1: 'Under 1 year', '1_to_3': '1–3 years',
        '3_to_5': '3–5 years',   '5_plus':  '5+ years',
      };
      const RTW_LABELS = {
        british_irish_passport: 'British or Irish passport',
        share_code:             'Share code from gov.uk',
      };

      yesGuards = yesResps.map(r => {
        const pd        = pdMap[r.candidate_id]   || {};
        const cand      = candMap[r.candidate_id] || {};
        const lics      = licMap[r.candidate_id]  || [];
        const isChosen  = shift.chosen_candidate_id === r.candidate_id;

        // Guard's licences that cover any of the shift's required types.
        const coveringLics  = lics.filter(l =>
          shift.licence_types.some(lt => {
            const covers = LICENCE_COVERAGE[lt];
            return covers && covers.has(l.licence_type);
          })
        );
        const coveringTypes = [...new Set(coveringLics.map(l => l.licence_type))];
        const firstName     = pd.first_name || '';
        const lastInitial   = pd.last_name ? pd.last_name.trim()[0] + '.' : '';

        const base = {
          candidate_id:      r.candidate_id,
          name:              `${firstName} ${lastInitial}`.trim(),
          covering_licences: coveringTypes,
          years_experience:  EXP_LABELS[pd.years_experience] || null,
          bs7858_ready:      cand.profile_complete === true,
          distance_miles:    r.distance_miles != null ? Number(r.distance_miles) : null,
          responded_at:      r.responded_at,
          is_chosen:         isChosen,
        };

        if (!isChosen) return base;

        // Earliest expiry among the chosen guard's covering licences.
        const licenceExpiry = coveringLics.length > 0
          ? coveringLics.reduce(
              (min, l) => l.expiry_date < min ? l.expiry_date : min,
              coveringLics[0].expiry_date
            )
          : null;

        return {
          ...base,
          full_name:      `${firstName} ${pd.last_name || ''}`.trim(),
          phone:          pd.phone           || null,
          rtw_proof:      RTW_LABELS[pd.right_to_work_proof] || null,
          licence_expiry: licenceExpiry,
        };
      });
    }

    res.json({
      shift: {
        id:                  shift.id,
        site_town:           shift.site_town,
        site_postcode:       shift.site_postcode,
        shift_start:         shift.shift_start,
        shift_end:           shift.shift_end,
        licence_types:       shift.licence_types,
        rate_per_hour:       shift.rate_per_hour,
        pay_terms:           shift.pay_terms,
        status:              shift.status,
        notes:               shift.notes,
        recipients_count:    shift.recipients_count,
        alert_sent_at:       shift.alert_sent_at,
        created_at:          shift.created_at,
        chosen_candidate_id: shift.chosen_candidate_id,
        chosen_at:           shift.chosen_at,
        confirmed_at:        shift.confirmed_at,
      },
      responses:      counts,
      yes_responders: yesGuards,
    });
  } catch (err) {
    console.error('GET /api/shifts/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
});

// ── POST /api/shifts/:id/choose ───────────────────────────────────────────────
// Sets chosen_candidate_id. Candidate must have responded yes. No emails.
router.post('/:id/choose', async (req, res) => {
  try {
    const { candidate_id } = req.body;
    if (!candidate_id) {
      return res.status(400).json({ error: 'candidate_id is required' });
    }

    const { data: shift, error: sErr } = await supabase
      .from('shifts')
      .select('id, employer_id, status')
      .eq('id', req.params.id)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!shift || shift.employer_id !== req.employer.id) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (shift.status !== 'open') {
      return res.status(409).json({ error: 'Shift is not open', code: 'shift_not_open' });
    }

    const { data: resp, error: rErr } = await supabase
      .from('shift_responses')
      .select('id, response')
      .eq('shift_id', shift.id)
      .eq('candidate_id', candidate_id)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!resp || resp.response !== 'yes') {
      return res.status(422).json({ error: 'Candidate has not responded yes', code: 'not_yes' });
    }

    const { error: uErr } = await supabase
      .from('shifts')
      .update({ chosen_candidate_id: candidate_id, chosen_at: new Date().toISOString() })
      .eq('id', shift.id);
    if (uErr) throw uErr;

    await auditLog({
      tableName:   'shifts',
      recordId:    shift.id,
      action:      'UPDATE',
      performedBy: req.userId,
      ipAddress:   req.ip,
      changes:     { event: 'candidate_chosen', candidate_id },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/shifts/:id/choose error:', err);
    res.status(500).json({ error: 'Failed to choose candidate' });
  }
});

// ── POST /api/shifts/:id/confirm ──────────────────────────────────────────────
// Saves site briefing, sets status = 'filled'. Emails booked guard + other
// yes-responders. Requires: someone chosen, shift open, site_address + report_to.
router.post('/:id/confirm', async (req, res) => {
  try {
    const { site_name, site_address, report_to, escalation_contacts, site_tasks } = req.body;

    if (!site_address || !report_to) {
      return res.status(422).json({
        error: 'site_address and report_to are required',
        code:  'missing_fields',
      });
    }

    const { data: shift, error: sErr } = await supabase
      .from('shifts')
      .select(
        'id, employer_id, status, chosen_candidate_id, ' +
        'site_town, shift_start, shift_end, rate_per_hour, pay_terms, licence_types'
      )
      .eq('id', req.params.id)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!shift || shift.employer_id !== req.employer.id) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (shift.status !== 'open') {
      return res.status(409).json({ error: 'Shift is not open', code: 'shift_not_open' });
    }
    if (!shift.chosen_candidate_id) {
      return res.status(409).json({ error: 'No candidate chosen yet', code: 'no_chosen_candidate' });
    }

    const { error: uErr } = await supabase
      .from('shifts')
      .update({
        site_name:           site_name           || null,
        site_address,
        report_to,
        escalation_contacts: escalation_contacts || null,
        site_tasks:          site_tasks          || null,
        status:              'filled',
        confirmed_at:        new Date().toISOString(),
      })
      .eq('id', shift.id);
    if (uErr) throw uErr;

    await auditLog({
      tableName:   'shifts',
      recordId:    shift.id,
      action:      'UPDATE',
      performedBy: req.userId,
      ipAddress:   req.ip,
      changes:     { event: 'shift_confirmed' },
    });

    res.json({ ok: true });

    // ── Fire-and-forget: email booked guard + filled notice to other yes-responders
    ;(async () => {
      try {
        const { data: yesResps } = await supabase
          .from('shift_responses')
          .select('id, candidate_id')
          .eq('shift_id', shift.id)
          .eq('response', 'yes');

        const filtered    = guardsForEmail(yesResps || []);
        const filteredIds = filtered.map(r => r.candidate_id);
        if (filteredIds.length === 0) return;

        const [empRes, candRes, pdRes] = await Promise.all([
          supabase.from('employers').select('company_name').eq('id', req.employer.id).single(),
          supabase.from('candidates').select('id, email').in('id', filteredIds),
          supabase.from('personal_details').select('candidate_id, first_name').in('candidate_id', filteredIds),
        ]);

        const employerName = empRes.data?.company_name || 'A security company';
        const emailMap     = Object.fromEntries((candRes.data || []).map(c => [c.id, c.email]));
        const nameMap      = Object.fromEntries((pdRes.data  || []).map(p => [p.candidate_id, p.first_name]));
        const shiftRange   = formatShiftRange(shift.shift_start, shift.shift_end);
        const shiftDay     = formatShiftDay(shift.shift_start);

        for (const r of filtered) {
          const toEmail = emailMap[r.candidate_id];
          if (!toEmail) continue;
          const optedOut = await isOptedOut(supabase, toEmail);
          if (optedOut) continue;

          if (r.candidate_id === shift.chosen_candidate_id) {
            await sendShiftBooked({
              toEmail,
              firstName:          nameMap[r.candidate_id] || null,
              employerName,
              siteTown:           shift.site_town,
              shiftRange,
              shiftStartUtc:      shift.shift_start,
              shiftEndUtc:        shift.shift_end,
              siteName:           site_name    || null,
              siteAddress:        site_address,
              reportTo:           report_to,
              escalationContacts: escalation_contacts || null,
              siteTasks:          site_tasks   || null,
              ratePerHour:        Number(shift.rate_per_hour),
              payTerms:           shift.pay_terms,
            }).catch(e => console.error('[sendShiftBooked]', e.message));
          } else {
            await sendShiftFilledNotice({
              toEmail,
              firstName:  nameMap[r.candidate_id] || null,
              siteTown:   shift.site_town,
              shiftRange,
              shiftDay,
              filled:     true,
            }).catch(e => console.error('[sendShiftFilledNotice/filled]', e.message));

            await supabase.from('shift_responses')
              .update({ filled_notified_at: new Date().toISOString() })
              .eq('id', r.id);
          }
        }
      } catch (e) {
        console.error('[confirm emails]', e.message);
      }
    })();
  } catch (err) {
    console.error('POST /api/shifts/:id/confirm error:', err);
    res.status(500).json({ error: 'Failed to confirm shift' });
  }
});

// ── POST /api/shifts/:id/cancel ───────────────────────────────────────────────
// Sets status = 'cancelled'. Emails all yes-responders.
router.post('/:id/cancel', async (req, res) => {
  try {
    const { data: shift, error: sErr } = await supabase
      .from('shifts')
      .select('id, employer_id, status, site_town, shift_start, shift_end')
      .eq('id', req.params.id)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!shift || shift.employer_id !== req.employer.id) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (shift.status !== 'open') {
      return res.status(409).json({ error: 'Shift is not open', code: 'shift_not_open' });
    }

    const { error: uErr } = await supabase
      .from('shifts')
      .update({ status: 'cancelled' })
      .eq('id', shift.id);
    if (uErr) throw uErr;

    await auditLog({
      tableName:   'shifts',
      recordId:    shift.id,
      action:      'UPDATE',
      performedBy: req.userId,
      ipAddress:   req.ip,
      changes:     { event: 'shift_cancelled' },
    });

    res.json({ ok: true });

    // ── Fire-and-forget: cancel notice to all yes-responders ─────────────────
    ;(async () => {
      try {
        const { data: yesResps } = await supabase
          .from('shift_responses')
          .select('id, candidate_id')
          .eq('shift_id', shift.id)
          .eq('response', 'yes');

        const filtered    = guardsForEmail(yesResps || []);
        const filteredIds = filtered.map(r => r.candidate_id);
        if (filteredIds.length === 0) return;

        const [candRes, pdRes] = await Promise.all([
          supabase.from('candidates').select('id, email').in('id', filteredIds),
          supabase.from('personal_details').select('candidate_id, first_name').in('candidate_id', filteredIds),
        ]);

        const emailMap   = Object.fromEntries((candRes.data || []).map(c => [c.id, c.email]));
        const nameMap    = Object.fromEntries((pdRes.data  || []).map(p => [p.candidate_id, p.first_name]));
        const shiftRange = formatShiftRange(shift.shift_start, shift.shift_end);
        const shiftDay   = formatShiftDay(shift.shift_start);

        for (const r of filtered) {
          const toEmail = emailMap[r.candidate_id];
          if (!toEmail) continue;
          const optedOut = await isOptedOut(supabase, toEmail);
          if (optedOut) continue;

          await sendShiftFilledNotice({
            toEmail,
            firstName:  nameMap[r.candidate_id] || null,
            siteTown:   shift.site_town,
            shiftRange,
            shiftDay,
            filled:     false,
          }).catch(e => console.error('[sendShiftFilledNotice/cancel]', e.message));

          await supabase.from('shift_responses')
            .update({ filled_notified_at: new Date().toISOString() })
            .eq('id', r.id);
        }
      } catch (e) {
        console.error('[cancel emails]', e.message);
      }
    })();
  } catch (err) {
    console.error('POST /api/shifts/:id/cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel shift' });
  }
});

module.exports = router;
