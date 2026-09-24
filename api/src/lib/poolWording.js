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

// Phase 2b: invite accept consent.
// TODO (Phase 3): replace email-removal note with in-app "Leave pool" once
// talent_pool_members rows exist.
const POOL_INVITE_WORDING_VERSION = 'v1-invite-2026-09';

const POOL_INVITE_CONSENT_COPY =
  'By accepting, you consent to this employer retaining your profile in their ' +
  'talent pool for consideration for future security roles. You can ask to be ' +
  'removed at any time by contacting admin@uksecurityjobs.co.uk.';

// DRAFT — accept confirmation shown to candidate after they accept an invite.
// Served from GET /me/invites/:token as accept_confirmation (employer name substituted).
// TODO: update when the call-booking flow is live.
const POOL_ACCEPT_CONFIRMATION_TEMPLATE =
  'Thanks — {employer_name} will be in touch to arrange a short video call ' +
  'to discuss your availability for upcoming roles.';

// DRAFT — body paragraph used in the invite notification email.
// Employer and candidate names are HTML-escaped by sendPoolInvite before insertion.
const POOL_INVITE_EMAIL_PARA =
  'has found your profile on UKSecurityJobs and would like to invite you ' +
  'to discuss future security roles that match your licence and availability.';

// DRAFT — intro sentence used in shift callout emails.
// Employer name prepended by sendPoolCallout before this is inserted.
const POOL_CALLOUT_EMAIL_INTRO =
  'has a shift available that matches your licence and wants to know if you are interested.';

// DRAFT — shown on the candidate dashboard when their pool membership is paused
// due to licence expiry. Displayed by PoolMemberCard in the React app.
const POOL_MEMBER_PAUSED_LICENCE =
  'Paused — your SIA licence has expired. Renew and verify it to become active again.';

module.exports = {
  POOL_WORDING_VERSION,
  POOL_CONSENT_COPY,
  POOL_MODE_LABELS,
  POOL_INVITE_WORDING_VERSION,
  POOL_INVITE_CONSENT_COPY,
  POOL_ACCEPT_CONFIRMATION_TEMPLATE,
  POOL_INVITE_EMAIL_PARA,
  POOL_CALLOUT_EMAIL_INTRO,
  POOL_MEMBER_PAUSED_LICENCE,
};
