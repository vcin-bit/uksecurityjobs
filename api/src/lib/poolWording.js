// DRAFT — increment POOL_WORDING_VERSION whenever consent copy changes.
// The API returns this version on GET /me/discoverability.
// PUT /me/discoverability validates it; returns 409 on mismatch so the
// client can reload and re-present the updated copy before opt-in.

const POOL_WORDING_VERSION = 'v1-draft-2026-09';

const POOL_CONSENT_COPY =
  'By turning this on, verified security employers using the UKSecurityJobs ' +
  'talent pool can see your profile. You can turn this off at any time and ' +
  'your profile will no longer be visible to new employers. Existing talent ' +
  'pool memberships are not automatically removed — contact ' +
  'admin@uksecurityjobs.co.uk if you need those removed.';

const POOL_MODE_LABELS = {
  all:      'All employers using the talent pool (see list)',
  selected: 'Only employers I choose',
};

module.exports = { POOL_WORDING_VERSION, POOL_CONSENT_COPY, POOL_MODE_LABELS };
