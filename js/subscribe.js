// Email capture — posts to the Worker /subscribe endpoint (stores in Cloudflare D1).
// Used by the .email-capture blocks across the site. No third-party ESP.
(function () {
  window.blazinSubscribe = function (e, source) {
    e.preventDefault();
    var form = e.target;
    var wrap = form.parentElement;
    var msg = wrap.querySelector('.ec-msg');
    var email = (form.email && form.email.value || '').trim();
    var hp = form.hp ? form.hp.value : '';
    var btn = form.querySelector('button');
    if (!email) return false;
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = '…';

    fetch('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, source: source || 'site', hp: hp })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok) {
          msg.textContent = "Almost there — check your inbox for a confirmation link. 🌿";
          msg.style.color = '#eafff0';
          form.style.display = 'none';
          try { if (window.posthog) posthog.capture('newsletter_signup', { source: source || 'site' }); } catch (_) {}
        } else {
          msg.textContent = (d && d.error === 'invalid-email')
            ? "That email doesn't look right — mind checking it?"
            : "Hmm, that didn't go through. Try again in a sec.";
          msg.style.color = '#ffe0e0';
          btn.disabled = false;
          btn.textContent = orig;
        }
      })
      .catch(function () {
        msg.textContent = 'Network hiccup — try again in a sec.';
        msg.style.color = '#ffe0e0';
        btn.disabled = false;
        btn.textContent = orig;
      });
    return false;
  };
})();
