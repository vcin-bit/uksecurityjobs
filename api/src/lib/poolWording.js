// Increment POOL_WORDING_VERSION whenever opt-in consent copy changes.
// The API returns this version on GET /me/discoverability.
// PUT /me/discoverability validates it; returns 409 on mismatch so the
// client can reload and re-present the updated copy before opt-in.

const POOL_WORDING_VERSION = 'v2-2026-09';

const POOL_CONSENT_COPY =
  'Security companies using the UKSecurityJobs talent pool will be able to see your ' +
  'profile and invite you to join their bench of trusted officers. That means work ' +
  'can come to you, including short-notice and ad hoc shifts as well as permanent roles.\n\n' +
  'Only companies using this feature can see you, and you can see exactly who they ' +
  'are. You choose whether that\'s all of them or only the ones you pick, and you ' +
  'can change your mind or switch this off at any time.\n\n' +
  'Your name, town, licence details, availability and profile are shown. Your phone ' +
  'number and email are only shared if you accept an invitation.';

const POOL_MODE_LABELS = {
  all:      'All employers using the talent pool (see list)',
  selected: 'Only employers I choose',
};

// Increment POOL_INVITE_WORDING_VERSION whenever invite consent copy changes.
// Open invites will show wording_version_mismatch on accept until the candidate
// reloads — acceptable pre-launch.
const POOL_INVITE_WORDING_VERSION = 'v2-invite-2026-09';

// {Employer} is substituted server-side with the employer's company name.
const POOL_INVITE_CONSENT_COPY =
  'A talent pool is a company\'s own bench of trusted officers. Being on it means ' +
  'they\'ll contact you directly when work comes up, including short-notice and ad ' +
  'hoc shifts as well as permanent roles.\n\n' +
  'If you accept, {Employer} will be able to see your phone number and email so they ' +
  'can get in touch, and will usually arrange a short call with you before ' +
  'confirming you on their bench.\n\n' +
  'Accepting doesn\'t commit you to any work. You\'re always free to say no to a ' +
  'shift, and you can leave the pool at any time from your dashboard.';

// {employer_name} is substituted server-side in GET /me/invites/:token.
const POOL_ACCEPT_CONFIRMATION_TEMPLATE =
  '{employer_name} will be in touch shortly to arrange a short call. ' +
  'After that they\'ll confirm whether you\'ve joined their bench.';

// Employer name is prepended by sendPoolInvite before this is inserted.
const POOL_INVITE_EMAIL_PARA =
  'found your profile on UKSecurityJobs and would like to add you to their talent ' +
  'pool — their own bench of trusted officers.\n\n' +
  'Being on it means they\'ll contact you directly when work comes up, including ' +
  'short-notice and ad hoc shifts as well as permanent roles.';

// Employer name is prepended by sendPoolCallout before this is inserted.
const POOL_CALLOUT_EMAIL_INTRO =
  'has a shift available and wants to know if you can cover it.';

// Body text shown on the candidate dashboard when their pool membership is paused
// due to licence expiry. The heading ("Paused — your SIA licence has expired") is
// rendered separately by PoolMemberCard in the React app.
const POOL_MEMBER_PAUSED_LICENCE =
  'You won\'t receive shift callouts until it\'s renewed. Add your new licence to ' +
  'your profile and we\'ll verify it, then your membership reactivates automatically.';

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
