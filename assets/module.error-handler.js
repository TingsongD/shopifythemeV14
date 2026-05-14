/**
 * ThemeErrorHandler - Standardized AJAX Error Handling for Shopify Theme
 * 
 * This module provides consistent error handling across all AJAX operations:
 * - Cart operations (add, change, remove)
 * - Product data fetching
 * - Search and filtering
 * - Third-party API calls
 * 
 * Usage:
 *   ThemeErrorHandler.handleAjaxError(xhr, status, error, 'Cart fetch');
 *   ThemeErrorHandler.handleFetchError(error, 'Product variant fetch');
 *   ThemeErrorHandler.showUserNotification('Unable to add item to cart');
 */
(function() {
  'use strict';

  // Error messages for common HTTP status codes
  var ERROR_MESSAGES = {
    400: 'Invalid request. Please try again.',
    401: 'Please log in to continue.',
    403: 'Access denied.',
    404: 'The requested resource was not found.',
    408: 'Request timed out. Please try again.',
    422: 'Unable to process this request.',
    429: 'Too many requests. Please wait a moment.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable.',
    503: 'Service temporarily unavailable. Please try again.',
    504: 'Request timed out. Please check your connection.',
    timeout: 'Request timed out. Please check your connection.',
    abort: 'Request was cancelled.',
    parsererror: 'Error processing server response.',
    network: 'Network error. Please check your connection.',
    default: 'An error occurred. Please try again.'
  };

  // Cart-specific error messages
  var CART_ERROR_MESSAGES = {
    'product_not_available': 'This product is no longer available.',
    'variant_not_available': 'This variant is no longer available.',
    'quantity_exceeds_inventory': 'Not enough items in stock.',
    'cart_error': 'Unable to update cart. Please try again.'
  };

  window.ThemeErrorHandler = {
    /**
     * Handle jQuery AJAX errors
     * @param {Object} xhr - jQuery XMLHttpRequest object
     * @param {string} status - Error status ('timeout', 'error', 'abort', 'parsererror')
     * @param {string} error - Error message from server
     * @param {string} context - Description of what operation failed
     */
    handleAjaxError: function(xhr, status, error, context) {
      var statusCode = xhr ? xhr.status : null;
      var message = this.getErrorMessage(statusCode, status, error);
      
      // Log for debugging (respects ThemeDebug.enabled)
      if (window.ThemeDebug) {
        ThemeDebug.error('AJAX Error:', {
          context: context,
          status: status,
          statusCode: statusCode,
          error: error,
          responseText: xhr ? xhr.responseText : null
        });
      }

      // Show user notification if available
      this.showUserNotification(message, 'error');
      this.emitMonitoringEvent('ajax_error', {
        context: context,
        status: status,
        statusCode: statusCode,
        message: message,
        error: error
      });

      // Return error details for chaining
      return {
        context: context,
        status: status,
        statusCode: statusCode,
        message: message,
        error: error
      };
    },

    /**
     * Handle fetch API errors
     * @param {Error} error - JavaScript Error object
     * @param {string} context - Description of what operation failed
     * @param {Response} response - Optional fetch Response object
     */
    handleFetchError: function(error, context, response) {
      var statusCode = response ? response.status : null;
      var message = this.getErrorMessage(statusCode, null, error.message);
      
      // Log for debugging
      if (window.ThemeDebug) {
        ThemeDebug.error('Fetch Error:', {
          context: context,
          statusCode: statusCode,
          error: error.message,
          stack: error.stack
        });
      }

      // Show user notification
      this.showUserNotification(message, 'error');
      this.emitMonitoringEvent('fetch_error', {
        context: context,
        statusCode: statusCode,
        message: message,
        error: error ? error.message : null
      });

      // Return error details
      return {
        context: context,
        statusCode: statusCode,
        message: message,
        error: error
      };
    },

    /**
     * Handle cart-specific errors with better messages
     * @param {Object} responseData - Cart API response data
     * @param {string} context - Description of cart operation
     */
    handleCartError: function(responseData, context) {
      var message = CART_ERROR_MESSAGES.cart_error;
      
      // Parse Shopify cart error responses
      if (responseData && responseData.description) {
        message = responseData.description;
      } else if (responseData && responseData.message) {
        message = responseData.message;
      }

      if (window.ThemeDebug) {
        ThemeDebug.error('Cart Error:', {
          context: context,
          response: responseData
        });
      }

      this.showUserNotification(message, 'error');
      this.emitMonitoringEvent('cart_error', {
        context: context,
        message: message,
        response: responseData
      });

      return {
        context: context,
        message: message,
        response: responseData
      };
    },

    /**
     * Get user-friendly error message based on status
     * @param {number} statusCode - HTTP status code
     * @param {string} status - Error status string
     * @param {string} error - Raw error message
     * @returns {string} User-friendly error message
     */
    getErrorMessage: function(statusCode, status, error) {
      // Check for specific status codes first
      if (statusCode && ERROR_MESSAGES[statusCode]) {
        return ERROR_MESSAGES[statusCode];
      }

      // Check for status string (timeout, abort, etc.)
      if (status && ERROR_MESSAGES[status]) {
        return ERROR_MESSAGES[status];
      }

      // Check for network errors
      if (error && (error.indexOf('network') > -1 || error.indexOf('Network') > -1)) {
        return ERROR_MESSAGES.network;
      }

      return ERROR_MESSAGES.default;
    },

    /**
     * Show notification to user
     * Uses theme's notification system if available, falls back to console
     * @param {string} message - Message to display
     * @param {string} type - Notification type ('error', 'warning', 'success', 'info')
     */
    showUserNotification: function(message, type) {
      type = type || 'error';

      // Try theme's notification system first
      if (window.theme && window.theme.Notification) {
        window.theme.Notification.show({
          type: type,
          message: message
        });
        return;
      }

      // Try toast notification if available
      if (window.theme && window.theme.Toast) {
        window.theme.Toast.show(message, type);
        return;
      }

      // Try alert notification if available
      if (window.theme && window.theme.Alert) {
        window.theme.Alert[type](message);
        return;
      }

      // Fallback: log to console (always log errors)
      if (type === 'error' && window.console) {
        console.error('[Theme Notification]', message);
      }
    },

    /**
     * Retry a failed operation with exponential backoff
     * @param {Function} operation - Function that returns a Promise
     * @param {number} maxRetries - Maximum number of retry attempts
     * @param {number} delay - Initial delay in milliseconds
     * @returns {Promise} Promise that resolves with operation result or rejects after max retries
     */
    retryWithBackoff: function(operation, maxRetries, delay) {
      maxRetries = maxRetries || 3;
      delay = delay || 1000;
      
      var self = this;
      
      return new Promise(function(resolve, reject) {
        var attempt = function(retriesLeft, currentDelay) {
          operation()
            .then(resolve)
            .catch(function(error) {
              if (retriesLeft <= 0) {
                reject(error);
                return;
              }

              if (window.ThemeDebug) {
                ThemeDebug.warn('Retry attempt. Retries left:', retriesLeft, 'Delay:', currentDelay);
              }

              setTimeout(function() {
                attempt(retriesLeft - 1, currentDelay * 2);
              }, currentDelay);
            });
        };

        attempt(maxRetries, delay);
      });
    },

    /**
     * Wrap fetch call with error handling
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @param {string} context - Description of the operation
     * @returns {Promise} Promise with enhanced error handling
     */
    fetchWithErrorHandling: function(url, options, context) {
      var self = this;
      
      return fetch(url, options)
        .then(function(response) {
          if (!response.ok) {
            var error = new Error('HTTP ' + response.status);
            self.handleFetchError(error, context, response);
            throw error;
          }
          return response;
        })
        .catch(function(error) {
          self.handleFetchError(error, context);
          throw error;
        });
    },

    /**
     * Mark AJAX request as having custom error handler
     * Used with global ajaxError handler to avoid double-handling
     * @param {Object} settings - jQuery AJAX settings object
     * @returns {Object} Modified settings with hasErrorHandler flag
     */
    markAsHandled: function(settings) {
      settings.hasErrorHandler = true;
      return settings;
    },

    /**
     * Emit lightweight monitoring events without binding the theme to a vendor SDK.
     * @param {string} name - Event name
     * @param {Object} detail - Event detail
     * @returns {Object} Event detail
     */
    emitMonitoringEvent: function(name, detail) {
      detail = detail || {};
      detail.name = name;
      detail.source = 'theme';
      detail.timestamp = new Date().toISOString();

      if (window.dataLayer && Array.isArray(window.dataLayer)) {
        window.dataLayer.push({
          event: 'theme_ux_monitor',
          theme_event: name,
          theme_event_detail: detail
        });
      }

      try {
        window.dispatchEvent(new CustomEvent('theme:ux-monitor', {
          detail: detail
        }));
      } catch (error) {
        if (document.createEvent) {
          var event = document.createEvent('CustomEvent');
          event.initCustomEvent('theme:ux-monitor', false, false, detail);
          window.dispatchEvent(event);
        }
      }

      if (window.ThemeDebug && ThemeDebug.enabled) {
        ThemeDebug.warn('UX monitor event:', detail);
      }

      return detail;
    }
  };

  // Freeze the object to prevent modifications
  if (Object.freeze) {
    Object.freeze(window.ThemeErrorHandler);
  }

  function normalizeError(error) {
    if (!error) {
      return null;
    }

    return {
      message: error.message || String(error),
      stack: error.stack || null
    };
  }

  window.addEventListener('error', function(event) {
    if (!window.ThemeErrorHandler || !window.ThemeErrorHandler.emitMonitoringEvent) {
      return;
    }

    window.ThemeErrorHandler.emitMonitoringEvent('browser_error', {
      message: event.message,
      sourceUrl: event.filename,
      line: event.lineno,
      column: event.colno,
      error: normalizeError(event.error)
    });
  });

  window.addEventListener('unhandledrejection', function(event) {
    if (!window.ThemeErrorHandler || !window.ThemeErrorHandler.emitMonitoringEvent) {
      return;
    }

    window.ThemeErrorHandler.emitMonitoringEvent('unhandled_rejection', {
      error: normalizeError(event.reason)
    });
  });

  function closest(element, selector) {
    if (!element || !element.closest) {
      return null;
    }

    return element.closest(selector);
  }

  function getPath() {
    return window.location ? window.location.pathname : '';
  }

  function emitInteraction(name, detail) {
    if (!window.ThemeErrorHandler || !window.ThemeErrorHandler.emitMonitoringEvent) {
      return;
    }

    detail = detail || {};
    detail.path = getPath();
    window.ThemeErrorHandler.emitMonitoringEvent(name, detail);
  }

  function initCommerceInteractionMonitoring() {
    if (window.__themeCommerceInteractionMonitoring) {
      return;
    }

    window.__themeCommerceInteractionMonitoring = true;

    document.addEventListener('click', function(event) {
      var target = event.target;
      var addToCart = closest(target, '[data-js-product-button-add-to-cart], .js-product-button-add-to-cart');
      var checkout = closest(target, 'button[name="checkout"], input[name="checkout"]');
      var viewCart = closest(target, 'a[href]');

      if (addToCart) {
        emitInteraction('commerce_add_to_cart_click', {
          context: closest(addToCart, '.popup-quick-view') ? 'quick_view' : 'product_or_collection',
          disabled: !!addToCart.disabled || addToCart.getAttribute('aria-disabled') === 'true',
          buttonStatus: addToCart.getAttribute('data-button-status') || null
        });
      }

      if (checkout) {
        emitInteraction('commerce_checkout_click', {
          context: closest(checkout, '.popup-cart') ? 'popup_cart' : 'cart_or_product',
          disabled: !!checkout.disabled || checkout.getAttribute('aria-disabled') === 'true'
        });
      }

      if (viewCart) {
        var href = viewCart.getAttribute('href') || '';
        var cartUrl = (window.theme && theme.routes && theme.routes.cart_url) || '/cart';

        if (href === cartUrl || href.replace(/\/$/, '') === cartUrl.replace(/\/$/, '')) {
          emitInteraction('commerce_view_cart_click', {
            context: closest(viewCart, '.popup-cart') ? 'popup_cart' : 'site_navigation'
          });
        }
      }
    }, true);

    document.addEventListener('submit', function(event) {
      var form = event.target;

      if (!form || !form.querySelector) {
        return;
      }

      if (form.querySelector('[name="checkout"]')) {
        emitInteraction('commerce_checkout_submit', {
          action: form.getAttribute('action') || null,
          context: closest(form, '.popup-cart') ? 'popup_cart' : 'cart_or_product'
        });
      } else if (form.querySelector('[name="add"]') || /\/cart\/add/.test(form.getAttribute('action') || '')) {
        emitInteraction('commerce_add_to_cart_submit', {
          action: form.getAttribute('action') || null,
          context: closest(form, '.popup-quick-view') ? 'quick_view' : 'product_or_collection'
        });
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommerceInteractionMonitoring);
  } else {
    initCommerceInteractionMonitoring();
  }

})();
