(function ($) {

    'use strict';

    // Debug helper - only logs when debug mode is enabled
    const debugLog = (window.ThemeDebug && ThemeDebug.enabled)
        ? function() { ThemeDebug.log.apply(ThemeDebug, arguments); }
        : function() {};

    class CarouselProducts extends HTMLElement {
        constructor() {
            super();

            debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' CarouselProducts constructor called', {
                element: this,
                id: this.id || 'no-id',
                parentSection: this.closest('[data-section-id]')?.getAttribute('data-section-id')
            });

            this.settings = {
                arrows: true
            };

            setTimeout(() => {
                debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' setTimeout callback - about to call onPageLoaded');
                // Use onPageLoaded instead of onScrollOrUserAction to ensure
                // recommendations load on first product page visit (incognito fix)
                theme.AssetsLoader.onPageLoaded(() => {
                    debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' onPageLoaded callback fired - calling load()');
                    this.load();
                });
            }, 0);
        }

        load() {
            debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' load() called');
            this.$container = $(this);

            var _ = this,
                $recommendations = this.$container.find('.product-recommendations'),
                product_id,
                limit;

            debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' load() - checking recommendations', {
                hasRecommendations: $recommendations.length > 0,
                productId: $recommendations.attr('data-product-id'),
                limit: $recommendations.attr('data-limit')
            });

            debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' About to call loadManually', {
                upload: theme.AssetsLoader.upload,
                loadManuallyOn: theme.AssetsLoader.loadManuallyOn,
                slickProgress: theme.AssetsLoader.progress?.scripts?.plugin_slick
            });

            // Helper function to ensure slick is loaded before proceeding
            var ensureSlickLoaded = function (callback) {
                // If slick is already available, proceed immediately
                if (typeof $.fn.slick === 'function') {
                    debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' Slick already available');
                    callback();
                    return;
                }

                debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' Slick not available - loading directly');

                // Get slick URLs from theme paths (correct property name)
                var slickJsUrl = theme.AssetsLoader.paths?.scripts?.plugin_slick;
                var slickCssUrl = theme.AssetsLoader.paths?.styles?.plugin_slick;

                // Log actual values (not just Object)
                debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' Slick URLs: JS=' + slickJsUrl + ' CSS=' + slickCssUrl);

                // Fallback: if paths are undefined, check if slick is in the page already
                if (!slickJsUrl) {
                    debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' slickJsUrl is undefined! Checking AssetsLoader structure...');
                    debugLog('[CAROUSEL DEBUG] paths:', JSON.stringify(Object.keys(theme.AssetsLoader.paths || {})));
                    debugLog('[CAROUSEL DEBUG] paths.scripts:', JSON.stringify(Object.keys(theme.AssetsLoader.paths?.scripts || {})));
                }

                // Load CSS
                if (slickCssUrl && !document.querySelector('link[href*=\"slick\"]')) {
                    var link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = slickCssUrl;
                    document.head.appendChild(link);
                    debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' Added slick CSS link');
                }

                // Load JS
                if (slickJsUrl && !document.querySelector('script[src*=\"slick\"]')) {
                    debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' Creating script tag for slick');
                    var script = document.createElement('script');
                    script.src = slickJsUrl;
                    script.onload = function () {
                        debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' Slick script loaded directly - calling callback');
                        callback();
                    };
                    script.onerror = function (e) {
                        console.error('[CAROUSEL DEBUG] Failed to load slick script:', e);
                    };
                    document.body.appendChild(script);
                } else if (!slickJsUrl) {
                    // URL is undefined - log the AssetsLoader state
                    console.error('[CAROUSEL DEBUG] Cannot load slick - URL is undefined!');
                } else if (typeof $.fn.slick === 'function') {
                    callback();
                } else {
                    // Script tag exists but slick not ready - wait for it
                    var checkCount = 0;
                    var checkSlick = setInterval(function () {
                        checkCount++;
                        if (typeof $.fn.slick === 'function') {
                            clearInterval(checkSlick);
                            callback();
                        } else if (checkCount > 50) { // 5 second timeout
                            clearInterval(checkSlick);
                            console.error('[CAROUSEL DEBUG] Timeout waiting for slick');
                        }
                    }, 100);
                }
            };

            // Try loadManually first, but verify slick is actually loaded
            theme.AssetsLoader.loadManually([
                ['styles', 'plugin_slick'],
                ['scripts', 'plugin_slick']
            ],
                function () {
                    debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' loadManually callback - checking slick', {
                        slickAvailable: typeof $.fn.slick === 'function',
                        slickProgress: theme.AssetsLoader.progress?.scripts?.plugin_slick
                    });

                    // Ensure slick is actually loaded before proceeding
                    ensureSlickLoaded(function () {
                        debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' Slick confirmed available - proceeding');
                        if ($recommendations.length) {
                            product_id = $recommendations.attr('data-product-id');
                            limit = $recommendations.attr('data-limit');

                            var sectionId = $recommendations.parents('[data-section-id]').attr('data-section-id');
                            debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' Making AJAX request for recommendations', {
                                url: theme.routes.root_url + 'recommendations/products',
                                section_id: sectionId,
                                product_id: product_id,
                                limit: limit
                            });

                            $.ajax({
                                type: 'GET',
                                hasErrorHandler: true,
                                url: theme.routes.root_url + 'recommendations/products',
                                data: {
                                    section_id: sectionId,
                                    product_id: product_id,
                                    limit: limit
                                },
                                success: function (data) {
                                    debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' AJAX success - data received', {
                                        dataLength: data.length,
                                        hasContent: data.indexOf('product-recommendations') > -1
                                    });
                                    data = data.replace(/<carousel-products/g, '<div').replace(/<\/carousel-products/g, '<\/div');

                                    $recommendations.html($(data).find('.product-recommendations').html());

                                    _.initCarousel();

                                    theme.LazyImage.update();
                                    if (theme.MultiCurrency) {
                                        theme.MultiCurrency.update();
                                    }
                                    if (theme.Tooltip) {
                                        theme.Tooltip.init();
                                    }
                                    debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' Recommendations loaded and carousel initialized');
                                },
                                error: function (xhr, status, error) {
                                    debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' AJAX ERROR', {
                                        status: status,
                                        error: error,
                                        responseText: xhr.responseText?.substring(0, 200)
                                    });
                                    if (window.ThemeErrorHandler) {
                                        ThemeErrorHandler.handleAjaxError(xhr, status, error, 'Product recommendations fetch');
                                    }
                                }
                            });
                        } else {
                            debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' No recommendations element - initializing carousel directly');
                            _.initCarousel();
                        }
                    });
                });
        }

        initCarousel() {
            var _ = this;

            this.$slick = this.$container.find('[data-js-carousel-slick]');

            if (this.$slick.length) {
                this.$slider = this.$container.find('[data-js-carousel]');
                this.$collections_ajax = this.$container.find('[data-carousel-ajax] [data-collection]');
                this.$products = this.$container.find('[data-carousel-items]');
                this.$slides = this.$slick.find('> *');
                this.$prev = this.$slider.find('[data-js-carousel-prev]');
                this.$next = this.$slider.find('[data-js-carousel-next]');
                this.$arrows = this.$slider.find('[data-js-carousel-arrow]');
                this.$control = this.$container.find('[data-carousel-control]');

                this.settings.arrows = this.$slider.attr('data-arrows') === 'true' ? true : false;
                this.settings.bullets = this.$slider.attr('data-bullets') === 'true' ? true : false;
                this.settings.count = +this.$slider.attr('data-count');
                this.settings.infinite = this.$slider.attr('data-infinite') === 'true' ? true : false;
                this.settings.autoplay = this.$slider.attr('data-autoplay') === 'true' ? true : false;
                this.settings.speed = +this.$slider.attr('data-speed') || 0;
                this.settings.rows = +this.$slider.attr('data-rows') || 1;

                if (this.settings.arrows) {
                    $window.on('theme.resize.carousel-products', function () {
                        _.arrowsPosition();
                    });
                }

                if (this.$collections_ajax.length) {
                    this.loadProducts(this.$collections_ajax.first());
                } else {
                    this.initSlick();
                }

                this.$control.on('click', 'a', function (e) {
                    var $this = $(this);

                    if (!$this.hasClass('active')) {
                        _.loadProducts($this, true);
                    }

                    e.preventDefault();
                    return false;
                });
            }
        }

        arrowsPosition() {
            var max_height = 0;

            this.$slick.find('.carousel__item img').each(function () {
                max_height = Math.max(max_height, $(this).innerHeight());
            });

            this.$arrows.css({ top: max_height / 2 });
            this.$prev.add(this.$next).css({ 'max-height': max_height });
        }

        initSlick() {
            var _ = this;

            debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' initSlick() called', {
                slickAvailable: typeof $.fn.slick === 'function',
                $slickLength: this.$slick.length
            });

            // Safety check: ensure Slick is loaded before calling
            if (typeof $.fn.slick !== 'function') {
                debugLog('[CAROUSEL DEBUG] ' + Date.now() + ' Slick not ready - waiting 100ms and retrying');
                setTimeout(() => this.initSlick(), 100);
                return;
            }

            this.$slick.one('init', function () {
                if (_.settings.arrows) {
                    _.arrowsPosition();
                }

                $window.trigger('checkImages');

                _.$slider.removeClass('invisible');

                theme.Preloader.unset(_.$slider.parent());
            });

            this.$slick.on('beforeChange', function (event, slick, currentSlide, nextSlide) {
                var check_before = nextSlide - 1,
                    check_after = nextSlide + _.settings.count;

                _._checkProduct(_.$slick.find('[data-slick-index="' + check_before + '"]'));

                for (var i = check_after; i > currentSlide + 1; i--) {
                    _._checkProduct(_.$slick.find('[data-slick-index="' + i + '"]'));
                }
            });

            this.$slick.on('afterChange', function () {
                if (theme.Tooltip) {
                    theme.Tooltip.init();
                }
            });

            this.$slick.one('init', function () {
                _.$slider.addClass('initialized');
            });

            this.$slick.slick({
                rows: this.settings.rows,
                lazyLoad: false,
                arrows: this.settings.arrows,
                prevArrow: this.$prev,
                nextArrow: this.$next,
                dots: this.settings.bullets,
                dotsClass: 'slick-dots d-flex flex-wrap flex-center list-unstyled pt-7',
                adaptiveHeight: true,
                autoplay: this.settings.autoplay,
                autoplaySpeed: this.settings.speed,
                infinite: this.settings.infinite,
                slidesToShow: this.settings.count,
                slidesToScroll: this.settings.count,
                touchMove: false,
                rtl: theme.rtl,
                responsive: [
                    {
                        breakpoint: theme.breakpoints.values.xl,
                        settings: {
                            slidesToShow: 3,
                            slidesToScroll: 3
                        }
                    },
                    {
                        breakpoint: theme.breakpoints.values.md,
                        settings: {
                            slidesToShow: 2,
                            slidesToScroll: 2
                        }
                    },
                    {
                        breakpoint: theme.breakpoints.values.sm,
                        settings: {
                            slidesToShow: 2,
                            slidesToScroll: 2
                        }
                    }
                ]
            });
        }

        loadProducts($button, loader) {
            if (this.xhr) {
                this.xhr.abort();
            }

            var _ = this;

            if (loader) {
                theme.Preloader.set(this.$slider.parent());

                this.$slider.css({
                    'min-height': this.$slider.innerHeight()
                });
            }

            var collection = $button.attr('data-collection');

            this.xhr = $.ajax({
                type: 'GET',
                hasErrorHandler: true,
                url: theme.routes.root_url + 'collections/' + collection,
                cache: false,
                data: {
                    view: 'carousel',
                    max_count: this.$products.attr('data-max-count'),
                    size_of_columns: this.$products.attr('data-products-pre-row'),
                    async_ajax_loading: this.$products.attr('data-async-ajax-loading')
                },
                dataType: 'html',
                success: function (data) {
                    _.$slider.addClass('invisible');

                    if (_.$slick.hasClass('slick-initialized')) {
                        _.$slick.slick('destroy').off();
                    }

                    _.$slick.one('init', function () {
                        _.$slider.removeAttr('style');

                        if (loader) {
                            theme.Preloader.unset(_.$slider.parent());
                        }
                    });

                    _.$products.html(data);

                    _.$slides = _.$slick.find('> *');

                    _.initSlick();

                    theme.LazyImage.update();
                    if (theme.MultiCurrency) {
                        theme.MultiCurrency.update();
                    }
                    if (theme.Tooltip) {
                        theme.Tooltip.init();
                    }

                    _.$control.find('a').removeClass('active');
                    $button.addClass('active');

                    _.xhr = null;
                },
                error: function (xhr, status, error) {
                    if (loader) {
                        theme.Preloader.unset(_.$slider.parent());
                    }
                    _.$slider.removeAttr('style');
                    _.xhr = null;
                    if (window.ThemeErrorHandler) {
                        ThemeErrorHandler.handleAjaxError(xhr, status, error, 'Collection products fetch');
                    }
                }
            });
        }

        _checkProduct($slide, beforeAjax) {
            var _ = this,
                handle = $slide.attr('data-handle');

            if (handle) {
                if (beforeAjax) {
                    beforeAjax($slide);
                }

                $.ajax({
                    type: 'GET',
                    hasErrorHandler: true,
                    url: theme.routes.root_url + 'products/' + handle,
                    data: {
                        view: 'collection'
                    },
                    cache: false,
                    dataType: 'html',
                    success: function (data) {
                        var $data = $(data);

                        $slide.add(_.$slick.find('.slick-cloned[data-handle="' + handle + '"]')).html($data).removeAttr('data-handle');
                        theme.LazyImage.update();
                        $slide.trigger('loaded');
                    },
                    error: function (xhr, status, error) {
                        if (window.ThemeErrorHandler) {
                            ThemeErrorHandler.handleAjaxError(xhr, status, error, 'Product card fetch');
                        }
                    }
                });

                return true;
            } else {
                return false;
            }
        }

        disconnectedCallback() {
            if (this.$slick) {
                this.$slick.slick('destroy').off();
                this.$slick = null;

                $window.unbind('theme.resize.carousel-products');
            }

            this.$control.off();
        }
    }

    theme.AssetsLoader.onPageLoaded(function () {
        customElements.define('carousel-products', CarouselProducts);
    });
})(jQueryTheme);