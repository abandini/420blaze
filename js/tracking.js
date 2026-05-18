// PostHog Click Tracking — 420Blazin.com
// Tracks: /go/ POTV affiliate, Amazon book, cross-site, Continue Reading, merch.
//
// Pattern: delegated click listener on document (capture phase) →
// preventDefault → posthog.capture with callback → navigate inside callback
// → 600ms failsafe so navigation happens even if PostHog hangs.
//
// Why this matters: `send_instantly: true` ONLY bypasses PostHog's batching,
// it does NOT switch the transport to sendBeacon. A normal /go/ click triggers
// a 302 redirect that cancels the in-flight XHR before it lands at PostHog.
// The only reliable fix is to wait for capture-confirm before navigating.
(function() {
  function safeCapture(name, props, cb) {
    if (typeof window.posthog === 'undefined' || !window.posthog.capture) {
      if (cb) cb();
      return;
    }
    try {
      window.posthog.capture(name, props, { send_instantly: true, callback: cb });
    } catch (e) {
      if (cb) cb();
    }
  }

  function getUTM() {
    var p = new URLSearchParams(window.location.search);
    var utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function(k) {
      var v = p.get(k);
      if (v) utm[k] = v;
    });
    return utm;
  }

  function baseProps(a) {
    return Object.assign({
      page: window.location.pathname,
      page_url: window.location.href,
      element_text: (a.textContent || '').trim().slice(0, 120),
      destination: a.href || null,
      source: '420blazin'
    }, getUTM());
  }

  // Only intercept-and-defer clicks that would navigate the CURRENT tab.
  // ctrl/cmd/shift/alt-clicks, middle-clicks, and target="_blank" links
  // open in a new tab — the current tab keeps running so there's no race.
  function isCurrentTabNavigation(e, a) {
    if (e.button !== 0) return false;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return false;
    var target = a.getAttribute('target') || '';
    if (target === '_blank') return false;
    return true;
  }

  function captureAndGo(name, props, a, e) {
    if (!isCurrentTabNavigation(e, a)) {
      safeCapture(name, props);
      return;
    }
    e.preventDefault();
    var navigated = false;
    var go = function() {
      if (navigated) return;
      navigated = true;
      window.location.href = a.href;
    };
    safeCapture(name, props, go);
    setTimeout(go, 600);
  }

  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!href) return;

    // 1. POTV /go/ affiliate redirects — primary revenue signal
    if (href.indexOf('/go/') !== -1) {
      var slugMatch = href.match(/\/go\/([^?#]+)/);
      captureAndGo('potv_outbound_click', Object.assign(baseProps(a), {
        slug: slugMatch ? slugMatch[1] : null
      }), a, e);
      return;
    }

    // 2. Amazon book buy clicks
    if (href.indexOf('amazon.com') !== -1) {
      captureAndGo('amazon_buy_click', Object.assign(baseProps(a), {
        amazon_url: a.href
      }), a, e);
      return;
    }

    // 3. Continue Reading cards (.cr-card) — internal navigation depth
    if (a.classList && a.classList.contains('cr-card')) {
      var tag = a.querySelector('.cr-card-tag');
      var heading = a.querySelector('h3');
      captureAndGo('continue_reading_click', Object.assign(baseProps(a), {
        card_title: heading ? heading.textContent.trim() : null,
        card_tag: tag ? tag.textContent.trim() : null
      }), a, e);
      return;
    }

    // 4. Cross-site to Senior's Guide
    if (href.indexOf('weedaseniorsguide.com') !== -1) {
      captureAndGo('cross_site_click_seniorsguide', baseProps(a), a, e);
      return;
    }

    // 5. Cross-site to 365 Days of Weed
    if (href.indexOf('365daysofweed.com') !== -1) {
      captureAndGo('cross_site_click_365weed', baseProps(a), a, e);
      return;
    }

    // 6. Merch store clicks
    if (href.indexOf('store.420blazin.com') !== -1) {
      var card = a.closest('.merch-card');
      captureAndGo('merch_shop_click', Object.assign(baseProps(a), {
        product_name: card && card.querySelector('h3') ? card.querySelector('h3').textContent.trim() : null,
        price: card && card.querySelector('.merch-price') ? card.querySelector('.merch-price').textContent : null
      }), a, e);
      return;
    }

    // 7. Festival CTA in nav (separate event for placement-attribution)
    if (a.classList && a.classList.contains('nav-cta')) {
      captureAndGo('festival_nav_cta_click', baseProps(a), a, e);
      return;
    }
  }, true);
})();
