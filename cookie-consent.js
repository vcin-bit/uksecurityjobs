/* ============================================================
   UKSecurityJobs — shared cookie consent
   Single source of truth. Include on every public page with:
     <script src="/cookie-consent.js" defer></script>
   Do NOT include on admin.html or sign-in pages.

   - Injects the consent banner and its styles.
   - Google Analytics (G-23Z2MEN8N5) loads ONLY after "Accept".
   - Choice stored in localStorage key 'cookie_consent'.
   - window.openCookieSettings() re-opens the banner so users
     can change their choice (wire a footer link to it).
   ============================================================ */
(function () {
  var GA_ID = 'G-23Z2MEN8N5';
  var STORE_KEY = 'cookie_consent';

  // ---- styles (matches the existing site banner) ----
  var css = ''
    + '#cookie-banner{position:fixed;bottom:0;left:0;right:0;z-index:9999;'
    + 'background:#0b1222;border-top:1px solid #1e293b;padding:1.25rem 2rem;'
    + 'display:flex;align-items:center;justify-content:space-between;'
    + 'flex-wrap:wrap;gap:1rem;transform:translateY(100%);'
    + 'transition:transform 0.3s ease;font-family:-apple-system,BlinkMacSystemFont,'
    + "'Segoe UI','Helvetica Neue',Arial,sans-serif;}"
    + '#cookie-banner.show{transform:translateY(0);}'
    + '#cookie-banner p{font-size:0.82rem;color:#94a3b8;line-height:1.65;'
    + 'margin:0;max-width:700px;}'
    + '#cookie-banner p a{color:#93c5fd;text-decoration:none;font-weight:600;}'
    + '#cookie-banner p a:hover{text-decoration:underline;}'
    + '.cookie-btns{display:flex;gap:0.75rem;flex-shrink:0;}'
    + '.cookie-accept{background:#1a52a8;color:#fff;border:none;border-radius:7px;'
    + 'padding:0.6rem 1.5rem;font-size:0.85rem;font-weight:700;cursor:pointer;'
    + 'font-family:inherit;white-space:nowrap;}'
    + '.cookie-reject{background:transparent;color:#94a3b8;border:1px solid #334155;'
    + 'border-radius:7px;padding:0.6rem 1.5rem;font-size:0.85rem;font-weight:700;'
    + 'cursor:pointer;font-family:inherit;white-space:nowrap;}'
    + '.cookie-reject:hover{color:#cbd5e1;border-color:#475569;}'
    + '@media(max-width:600px){#cookie-banner{padding:1rem 1.25rem;}'
    + '.cookie-btns{width:100%;}.cookie-accept,.cookie-reject{flex:1;text-align:center;}}';

  // ---- banner markup ----
  var bannerHTML = ''
    + '<div id="cookie-banner" role="dialog" aria-label="Cookie consent">'
    + '<p>We use essential cookies to keep the site working, and Google '
    + 'Analytics to understand how it is used. Analytics cookies are set '
    + 'only with your consent. <a href="/cookies">Cookie Policy</a> &middot; '
    + '<a href="/privacy">Privacy Policy</a></p>'
    + '<div class="cookie-btns">'
    + '<button type="button" class="cookie-reject" id="cookie-reject-btn">Reject</button>'
    + '<button type="button" class="cookie-accept" id="cookie-accept-btn">Accept</button>'
    + '</div></div>';

  // ---- GA4 loader: runs only on consent ----
  function loadGA() {
    if (window._gaLoaded) return;
    window._gaLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    s.async = true;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  function show() {
    var b = document.getElementById('cookie-banner');
    if (b) b.classList.add('show');
  }
  function hide() {
    var b = document.getElementById('cookie-banner');
    if (b) b.classList.remove('show');
  }

  function accept() {
    try { localStorage.setItem(STORE_KEY, 'accepted'); } catch (e) {}
    hide();
    loadGA();
  }
  function reject() {
    try { localStorage.setItem(STORE_KEY, 'rejected'); } catch (e) {}
    hide();
  }

  // Re-open the banner so the user can change their choice.
  window.openCookieSettings = function () {
    show();
  };

  function init() {
    // styles
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // banner
    var wrap = document.createElement('div');
    wrap.innerHTML = bannerHTML;
    document.body.appendChild(wrap.firstChild);

    document.getElementById('cookie-accept-btn').addEventListener('click', accept);
    document.getElementById('cookie-reject-btn').addEventListener('click', reject);

    // apply any stored choice
    var consent = null;
    try { consent = localStorage.getItem(STORE_KEY); } catch (e) {}

    if (consent === 'accepted') {
      loadGA();
    } else if (consent === 'rejected') {
      // do nothing — GA stays off
    } else {
      // no choice yet — show the banner shortly after load
      setTimeout(show, 800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
