'use strict';
/**
 * api/src/lib/postcodes.js
 *
 * Thin wrapper around the free postcodes.io API.
 * No API key needed.
 *
 * geocodePostcode      — single lookup, 3-second timeout.
 * geocodePostcodesBulk — bulk POST (up to 100), 10-second timeout.
 *
 * Both functions swallow all errors and return null / empty Map so callers
 * never need their own try/catch.
 */

const SINGLE_TIMEOUT_MS = 3_000;
const BULK_TIMEOUT_MS   = 10_000;

/**
 * Look up a single postcode.
 * @param {string} postcode  Raw postcode string (spaces OK).
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
async function geocodePostcode(postcode) {
  if (!postcode) return null;
  const encoded = encodeURIComponent(postcode.trim());
  const url     = `https://api.postcodes.io/postcodes/${encoded}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(SINGLE_TIMEOUT_MS),
    });
    if (!res.ok) return null;                        // 404 = invalid postcode
    const body = await res.json();
    if (body.status !== 200 || !body.result?.latitude) return null;
    return {
      lat:           body.result.latitude,
      lng:           body.result.longitude,
      adminDistrict: body.result.admin_district || null,
    };
  } catch {
    return null;                                     // timeout, network error
  }
}

/**
 * Bulk-look up up to 100 postcodes in one request.
 *
 * The result Map is keyed by item.query EXACTLY as returned by postcodes.io
 * (which echoes the string that was sent).  Do not normalise the keys.
 *
 * @param {string[]} postcodes  Array of postcode strings to look up.
 * @returns {Promise<Map<string, {lat:number,lng:number} | null>>}
 */
async function geocodePostcodesBulk(postcodes) {
  const results = new Map();
  if (!postcodes.length) return results;

  try {
    const res = await fetch('https://api.postcodes.io/postcodes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ postcodes }),
      signal:  AbortSignal.timeout(BULK_TIMEOUT_MS),
    });
    if (!res.ok) return results;
    const body = await res.json();
    for (const item of body.result || []) {
      // Key is item.query verbatim — postcodes.io echoes the sent string.
      const key = item.query;
      if (item.result?.latitude) {
        results.set(key, { lat: item.result.latitude, lng: item.result.longitude });
      } else {
        results.set(key, null);                      // invalid / not found
      }
    }
  } catch {
    // timeout or network error — return whatever we have (possibly empty)
  }
  return results;
}

module.exports = { geocodePostcode, geocodePostcodesBulk };
