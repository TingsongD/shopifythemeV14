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
            var parsedUrl = new URL(url, window.location.origin);
            if (parsedUrl.origin !== window.location.origin) return false;
            var pathname = parsedUrl.pathname;
            return /\/cart\/(add|update)(\.js)?$/.test(pathname);
        } catch (e) {
            return false;
        }
    }

    // Safe debug logging - only logs when ThemeDebug exists and is enabled
    function debugLog() {
        if (window.ThemeDebug && ThemeDebug.enabled && ThemeDebug.log) {
            ThemeDebug.log.apply(ThemeDebug, arguments);
        }
    }

    function debugWarn() {
        if (window.ThemeDebug && ThemeDebug.enabled && ThemeDebug.warn) {
            ThemeDebug.warn.apply(ThemeDebug, arguments);
        }
    }

    function getRequestUrl(input) {
        if (!input) return '';
        if (typeof input === 'string') return input;
        if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
        return input.url || '';
    }

    function addAttributeToFormData(formData) {
        if (typeof formData.set === 'function') {
            formData.set(ATTRIBUTE_NAME, ATTRIBUTE_VALUE);
        } else {
            formData.append(ATTRIBUTE_NAME, ATTRIBUTE_VALUE);
        }
        return formData;
    }

    function addAttributeToRequestBody(body) {
        if (!body) return body;

        if (typeof FormData !== 'undefined' && body instanceof FormData) {
            return addAttributeToFormData(body);
        }

        if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
            body.set(ATTRIBUTE_NAME, ATTRIBUTE_VALUE);
            return body;
        }

        if (typeof body === 'string') {
            try {
                var data = JSON.parse(body);
                if (data && typeof data === 'object') {
                    data.attributes = data.attributes || {};
                    data.attributes[ATTRIBUTE_KEY] = ATTRIBUTE_VALUE;
                    return JSON.stringify(data);
                }
            } catch (jsonError) {
                if (body.indexOf('=') !== -1 && typeof URLSearchParams !== 'undefined') {
                    try {
                        var params = new URLSearchParams(body);
                        params.set(ATTRIBUTE_NAME, ATTRIBUTE_VALUE);
                        return params.toString();
                    } catch (paramsError) {
                        debugWarn('Sales Pitch URL encoded body update failed:', paramsError);
                    }
                }
            }
        }

        return body;
    }

    // 1. Mark as unmuted and try to save immediately
    function markUnmuted() {
        try {
            debugLog('Sales Pitch: User unmuted video.');
            sessionStorage.setItem(SESSION_KEY, 'true');
            injectFormAttribute();
            startFormObserver();
            installNetworkInterceptorsOnce();
            saveAttributeToCart(); // Try to save immediately
        } catch (e) {
            debugWarn('Sales Pitch Tracking Error:', e);
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
        if (!window.fetch) return;

        fetch(getCartUrl('/update.js'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attributes: { [ATTRIBUTE_KEY]: ATTRIBUTE_VALUE } })
        }).catch(function () { });
    }

    var interceptorsInstalled = false;

    function installNetworkInterceptorsOnce() {
        if (interceptorsInstalled) return;
        interceptorsInstalled = true;

        // Intercept Fetch Requests (For AJAX Carts)
        // Many themes construct their own JSON payload, ignoring form inputs.
        // We install this only after Sales Pitch has been unmuted.
        var originalFetch = window.fetch;
        if (originalFetch) {
            window.fetch = function (input, init) {
                if (sessionStorage.getItem(SESSION_KEY) !== 'true' || !isCartAttributeEndpoint(getRequestUrl(input))) {
                    return originalFetch.apply(this, arguments);
                }

                try {
                    var nextInit = init ? Object.assign({}, init) : {};
                    var nextBody = addAttributeToRequestBody(nextInit.body);

                    if (nextBody !== nextInit.body) {
                        nextInit.body = nextBody;
                        return originalFetch.call(this, input, nextInit);
                    }
                } catch (err) {
                    debugWarn('Sales Pitch fetch intercept error:', err);
                }

                return originalFetch.apply(this, arguments);
            };
        }

        // Intercept XMLHttpRequest (Legacy AJAX Carts)
        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this._salesPitchUrl = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            if (sessionStorage.getItem(SESSION_KEY) === 'true' && isCartAttributeEndpoint(this._salesPitchUrl)) {
                try {
                    body = addAttributeToRequestBody(body);
                } catch (err) {
                    debugWarn('Sales Pitch XHR intercept error:', err);
                }
            }
            return originalSend.call(this, body);
        };
    }

    var formObserverStarted = false;

    function startFormObserver() {
        if (formObserverStarted || typeof MutationObserver === 'undefined' || !document.body) return;
        formObserverStarted = true;

        var timeout;
        var observer = new MutationObserver(function () {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(function () {
                injectFormAttribute();
            }, 500);
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

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
            startFormObserver();
            installNetworkInterceptorsOnce();
        }
    } catch (e) { }
})();
