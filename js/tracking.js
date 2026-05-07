// PostHog Click Tracking — 420Blazin.com
// Tracks: /go/ POTV affiliate, Amazon book, cross-site, Continue Reading, merch.
// Uses delegated click listener on document — fires regardless of when elements
// load, no DOMContentLoaded race, no per-element bind. Capture phase ensures
// the event fires before browser navigation.
(function() {
  function safeCapture(name, props) {
    if (typeof window.posthog === 'undefined' || !window.posthog.capture) return;
    try {
      window.posthog.capture(name, props);
    } catch (e) { /* swallow */ }
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

  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!href) return;

    // 1. POTV /go/ affiliate redirects — primary revenue signal
    if (href.indexOf('/go/') !== -1) {
      var slugMatch = href.match(/\/go\/([^?#]+)/);
      safeCapture('potv_outbound_click', Object.assign(baseProps(a), {
        slug: slugMatch ? slugMatch[1] : null
      }));
      return;
    }

    // 2. Amazon book buy clicks
    if (href.indexOf('amazon.com') !== -1) {
      safeCapture('amazon_buy_click', Object.assign(baseProps(a), {
        amazon_url: a.href
      }));
      return;
    }

    // 3. Continue Reading cards (.cr-card) — internal navigation depth
    if (a.classList && a.classList.contains('cr-card')) {
      var tag = a.querySelector('.cr-card-tag');
      var heading = a.querySelector('h3');
      safeCapture('continue_reading_click', Object.assign(baseProps(a), {
        card_title: heading ? heading.textContent.trim() : null,
        card_tag: tag ? tag.textContent.trim() : null
      }));
      return;
    }

    // 4. Cross-site to Senior's Guide
    if (href.indexOf('weedaseniorsguide.com') !== -1) {
      safeCapture('cross_site_click_seniorsguide', baseProps(a));
      return;
    }

    // 5. Cross-site to 365 Days of Weed
    if (href.indexOf('365daysofweed.com') !== -1) {
      safeCapture('cross_site_click_365weed', baseProps(a));
      return;
    }

    // 6. Merch store clicks
    if (href.indexOf('store.420blazin.com') !== -1) {
      var card = a.closest('.merch-card');
      safeCapture('merch_shop_click', Object.assign(baseProps(a), {
        product_name: card && card.querySelector('h3') ? card.querySelector('h3').textContent.trim() : null,
        price: card && card.querySelector('.merch-price') ? card.querySelector('.merch-price').textContent : null
      }));
      return;
    }

    // 7. Festival CTA in nav (separate event for placement-attribution)
    if (a.classList && a.classList.contains('nav-cta')) {
      safeCapture('festival_nav_cta_click', baseProps(a));
      return;
    }
  }, true); // capture phase — fires before navigation
})();
