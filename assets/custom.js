// Google Ads conversion tracking on add-to-cart (dynamic value per variant)
(function() {
  var SEND_TO = 'AW-398236673/sNHZCOjbuMsbEIG48r0B';

  function getCurrency() {
    if (window.Shopify && Shopify.currency && Shopify.currency.active) return Shopify.currency.active;
    if (window.theme && theme.shopCurrency) return theme.shopCurrency;
    return 'USD';
  }

  function fireConversion(value) {
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', {
        send_to: SEND_TO,
        value: value,
        currency: getCurrency(),
        event_callback: function() {}
      });
    }
  }

  if (typeof window.gtag_report_conversion !== 'function') {
    window.gtag_report_conversion = function(url, value) {
      var callback = function() {
        if (typeof url !== 'undefined') {
          window.location = url;
        }
      };
      if (typeof gtag === 'function') {
        gtag('event', 'conversion', {
          send_to: SEND_TO,
          value: value,
          currency: getCurrency(),
          event_callback: callback
        });
      }
      return false;
    };
  }

  function fetchVariantPriceCents(variantId) {
    var root = (window.theme && theme.routes && theme.routes.root_url) || '';
    var base = root.replace(/\/$/, '');
    var url = base + '/variants/' + variantId + '.js';
    return fetch(url)
      .then(function(response) {
        return response.ok ? response.json() : Promise.reject(response);
      })
      .then(function(payload) {
        return payload && payload.variant && typeof payload.variant.price === 'number'
          ? payload.variant.price
          : null;
      })
      .catch(function(error) {
        // Log error for debugging (respects debug mode)
        if (window.ThemeDebug && ThemeDebug.enabled) {
          ThemeDebug.warn('Variant fetch failed:', error);
        }
        // Report to error handler if available
        if (window.ThemeErrorHandler) {
          ThemeErrorHandler.handleFetchError(error, 'Variant price fetch');
        }
        return null;  // Still gracefully degrade
      });
  }

  document.addEventListener('theme:cart::added', function(event) {
    var detail = event && event.detail;
    var variantId = detail && detail.data && detail.data.id;
    var quantity = detail && detail.data && Number(detail.data.quantity) ? Number(detail.data.quantity) : 1;

    if (!variantId) return;

    fetchVariantPriceCents(variantId).then(function(priceCents) {
      if (typeof priceCents === 'number') {
        var value = (priceCents * quantity) / 100;
        fireConversion(value);
      }
    });
  });
})();

// Scroll to reviews on badge click
document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(e) {
    if (e.target.closest('.jdgm-prev-badge')) {
      e.preventDefault();
      var reviewsHeader = document.querySelector('.kl_reviews__carousel__header');
      if (reviewsHeader) {
        reviewsHeader.scrollIntoView({ behavior: 'smooth' });
      } else {
         console.warn('.kl_reviews__carousel__header element not found.');
      }
    }
  });
});
