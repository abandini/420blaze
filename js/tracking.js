// PostHog Click Tracking — 420Blazin.com
// Tracks: Amazon book clicks, weedaseniorsguide cross-links, merch store clicks
document.addEventListener('DOMContentLoaded', function() {
  // Amazon book buy clicks
  document.querySelectorAll('a[href*="amazon.com"]').forEach(function(link) {
    link.addEventListener('click', function() {
      posthog.capture('amazon_buy_click', {
        page: window.location.pathname,
        button_text: this.textContent.trim(),
        amazon_url: this.href,
        source: '420blazin'
      });
    });
  });
  // weedaseniorsguide.com cross-site clicks
  document.querySelectorAll('a[href*="weedaseniorsguide.com"]').forEach(function(link) {
    link.addEventListener('click', function() {
      posthog.capture('book_promo_click', {
        page: window.location.pathname,
        destination: this.href,
        source: '420blazin'
      });
    });
  });
  // Merch store clicks
  document.querySelectorAll('a[href*="store.420blazin.com"]').forEach(function(link) {
    link.addEventListener('click', function() {
      var card = this.closest('.merch-card');
      posthog.capture('merch_shop_click', {
        product_name: card ? card.querySelector('h3').textContent.trim() : 'unknown',
        price: card ? (card.querySelector('.merch-price') || {}).textContent || '' : '',
        product_url: this.href,
        page: window.location.pathname
      });
    });
  });
  // 365daysofweed cross-site clicks
  document.querySelectorAll('a[href*="365daysofweed.com"]').forEach(function(link) {
    link.addEventListener('click', function() {
      posthog.capture('cross_site_click', {
        page: window.location.pathname,
        destination: this.href,
        source: '420blazin'
      });
    });
  });
});
