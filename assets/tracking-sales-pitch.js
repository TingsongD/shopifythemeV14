/**
 * Tracking script for Sales Pitch Video Unmute
 * Tracks if user unmuted the floating video and saves as Cart Attribute.
 * Supports:
 * 1. Standard Forms (Hidden Input)
 * 2. AJAX/Fetch Carts (Request Interception)
 * 3. Immediate Session Saving
 */
(function () {
    var SESSION_KEY = 'has_unmuted_sales_pitch';
    var ATTRIBUTE_NAME = 'attributes[Sales_Pitch_Unmuted]';
    var ATTRIBUTE_KEY = 'Sales_Pitch_Unmuted';
    var ATTRIBUTE_VALUE = 'Yes';

    function getCartUrl(suffix) {
        var cartUrl = (window.theme && theme.routes && theme.routes.cart_url) || '/cart';
        return cartUrl.replace(/\/$/, '') + suffix;
    }

    function isCartAttributeEndpoint(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            var pathname = new URL(url, window.location.origin).pathname;
            return /\/cart\/(add|update)(\.js)?$/.test(pathname);
        } catch (e) {
            return url.indexOf('/cart/add') !== -1 || url.indexOf('/cart/update') !== -1;
        }
    }

    // Safe debug logging - only logs when ThemeDebug exists and is enabled
    var debugLog = (window.ThemeDebug && ThemeDebug.enabled)
        ? function() { ThemeDebug.log.apply(ThemeDebug, arguments); }
        : function() {};

    // 1. Mark as unmuted and try to save immediately
    function markUnmuted() {
        try {
            debugLog('Sales Pitch: User unmuted video.');
            sessionStorage.setItem(SESSION_KEY, 'true');
            injectFormAttribute();
            saveAttributeToCart(); // Try to save immediately
        } catch (e) {
            console.warn('Sales Pitch Tracking Error: ', e);
        }
    }

    // 2. Inject Hidden Input (For Standard Forms)
    function injectFormAttribute() {
        var forms = document.querySelectorAll('form[action]');
        forms.forEach(function (form) {
            if (!isCartAttributeEndpoint(form.getAttribute('action'))) return;
            if (!form.querySelector('input[name="' + ATTRIBUTE_NAME + '"]')) {
                var input = document.createElement('input');
                input.type = 'hidden';
                input.name = ATTRIBUTE_NAME;
                input.value = ATTRIBUTE_VALUE;
                form.appendChild(input);
            }
        });
    }

    // 3. Save Attribute via AJAX immediately (Persists if cart exists)
    function saveAttributeToCart() {
        fetch(getCartUrl('/update.js'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attributes: { [ATTRIBUTE_KEY]: ATTRIBUTE_VALUE } })
        }).catch(function () { });
    }

    // 4. Intercept Fetch Requests (For AJAX Carts)
    // Many themes construct their own JSON payload, ignoring form inputs.
    // We intercept the call to /cart/add.js and inject our attribute.
    var originalFetch = window.fetch;
    window.fetch = function (input, init) {
        // Only intervene if we have unmuted and it's a cart add request
        if (sessionStorage.getItem(SESSION_KEY) === 'true') {
            var url = input;
            if (input instanceof Request) {
                url = input.url;
            }

            if (isCartAttributeEndpoint(url)) {
                try {
                    // Clone init or create it
                    init = init || {};
                    var body = init.body;

                    if (body && typeof body === 'string') {
                        // It's likely JSON
                        try {
                            var data = JSON.parse(body);

                            // If it's a standard Shopify API payload
                            if (data) {
                                // Ensure attributes object exists
                                data.attributes = data.attributes || {};
                                // Set our attribute
                                data.attributes[ATTRIBUTE_KEY] = ATTRIBUTE_VALUE;

                                // Serialize back to string
                                init.body = JSON.stringify(data);
                            }
                        } catch (e) {
                            // Not JSON or parse error, ignore
                        }
                    } else if (body instanceof FormData) {
                        // It's FormData
                        body.append(ATTRIBUTE_NAME, ATTRIBUTE_VALUE);
                    }
                } catch (err) {
                    console.warn('Sales Pitch Intercept Error:', err);
                }
            }
        }
        return originalFetch.apply(this, arguments);
    };

    // 5. Intercept XMLHttpRequest (Legacy AJAX Carts)
    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        if (sessionStorage.getItem(SESSION_KEY) === 'true' && isCartAttributeEndpoint(this._url)) {
            try {
                if (typeof body === 'string') {
                    try {
                        var data = JSON.parse(body);
                        data.attributes = data.attributes || {};
                        data.attributes[ATTRIBUTE_KEY] = ATTRIBUTE_VALUE;
                        body = JSON.stringify(data);
                    } catch (e) {
                        // Attempt to append to query string format if not JSON? usually XHR is JSON or FormData
                    }
                }
            } catch (e) { }
        }
        return originalSend.apply(this, [body]);
    };

    // Listen for unmute clicks globally
    document.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('[data-floating-video-mute]')) {
            markUnmuted();
        }
    });

    // Initialize on load if already unmuted
    try {
        if (sessionStorage.getItem(SESSION_KEY) === 'true') {
            injectFormAttribute();
            // Observer for dynamic forms
            var timeout;
            var observer = new MutationObserver(function (mutations) {
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(function () {
                    injectFormAttribute();
                }, 500);
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    } catch (e) { }
})();
