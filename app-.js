(function e(t, n, r) { function s(o, u) { if (!n[o]) { if (!t[o]) { var a = typeof require == "function" && require; if (!u && a) return a(o, !0); if (i) return i(o, !0); var f = new Error("Cannot find module '" + o + "'"); throw f.code = "MODULE_NOT_FOUND", f } var l = n[o] = { exports: {} }; t[o][0].call(l.exports, function (e) { var n = t[o][1][e]; return s(n ? n : e) }, l, l.exports, e, t, n, r) } return n[o].exports } var i = typeof require == "function" && require; for (var o = 0; o < r.length; o++)s(r[o]); return s })({
  1: [function (require, module, exports) {
    /*! npm.im/object-fit-images 3.2.4 */
    'use strict';

    var OFI = 'bfred-it:object-fit-images';
    var propRegex = /(object-fit|object-position)\s*:\s*([-.\w\s%]+)/g;
    var testImg = typeof Image === 'undefined' ? { style: { 'object-position': 1 } } : new Image();
    var supportsObjectFit = 'object-fit' in testImg.style;
    var supportsObjectPosition = 'object-position' in testImg.style;
    var supportsOFI = 'background-size' in testImg.style;
    var supportsCurrentSrc = typeof testImg.currentSrc === 'string';
    var nativeGetAttribute = testImg.getAttribute;
    var nativeSetAttribute = testImg.setAttribute;
    var autoModeEnabled = false;

    function createPlaceholder(w, h) {
      return ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h + "'%3E%3C/svg%3E");
    }

    function polyfillCurrentSrc(el) {
      if (el.srcset && !supportsCurrentSrc && window.picturefill) {
        var pf = window.picturefill._;
        // parse srcset with picturefill where currentSrc isn't available
        if (!el[pf.ns] || !el[pf.ns].evaled) {
          // force synchronous srcset parsing
          pf.fillImg(el, { reselect: true });
        }

        if (!el[pf.ns].curSrc) {
          // force picturefill to parse srcset
          el[pf.ns].supported = false;
          pf.fillImg(el, { reselect: true });
        }

        // retrieve parsed currentSrc, if any
        el.currentSrc = el[pf.ns].curSrc || el.src;
      }
    }

    function getStyle(el) {
      var style = getComputedStyle(el).fontFamily;
      var parsed;
      var props = {};
      while ((parsed = propRegex.exec(style)) !== null) {
        props[parsed[1]] = parsed[2];
      }
      return props;
    }

    function setPlaceholder(img, width, height) {
      // Default: fill width, no height
      var placeholder = createPlaceholder(width || 1, height || 0);

      // Only set placeholder if it's different
      if (nativeGetAttribute.call(img, 'src') !== placeholder) {
        nativeSetAttribute.call(img, 'src', placeholder);
      }
    }

    function onImageReady(img, callback) {
      // naturalWidth is only available when the image headers are loaded,
      // this loop will poll it every 100ms.
      if (img.naturalWidth) {
        callback(img);
      } else {
        setTimeout(onImageReady, 100, img, callback);
      }
    }

    function fixOne(el) {
      var style = getStyle(el);
      var ofi = el[OFI];
      style['object-fit'] = style['object-fit'] || 'fill'; // default value

      // Avoid running where unnecessary, unless OFI had already done its deed
      if (!ofi.img) {
        // fill is the default behavior so no action is necessary
        if (style['object-fit'] === 'fill') {
          return;
        }

        // Where object-fit is supported and object-position isn't (Safari < 10)
        if (
          !ofi.skipTest && // unless user wants to apply regardless of browser support
          supportsObjectFit && // if browser already supports object-fit
          !style['object-position'] // unless object-position is used
        ) {
          return;
        }
      }

      // keep a clone in memory while resetting the original to a blank
      if (!ofi.img) {
        ofi.img = new Image(el.width, el.height);
        ofi.img.srcset = nativeGetAttribute.call(el, "data-ofi-srcset") || el.srcset;
        ofi.img.src = nativeGetAttribute.call(el, "data-ofi-src") || el.src;

        // preserve for any future cloneNode calls
        // https://github.com/bfred-it/object-fit-images/issues/53
        nativeSetAttribute.call(el, "data-ofi-src", el.src);
        if (el.srcset) {
          nativeSetAttribute.call(el, "data-ofi-srcset", el.srcset);
        }

        setPlaceholder(el, el.naturalWidth || el.width, el.naturalHeight || el.height);

        // remove srcset because it overrides src
        if (el.srcset) {
          el.srcset = '';
        }
        try {
          keepSrcUsable(el);
        } catch (err) {
          if (window.console) {
            console.warn('https://bit.ly/ofi-old-browser');
          }
        }
      }

      polyfillCurrentSrc(ofi.img);

      el.style.backgroundImage = "url(\"" + ((ofi.img.currentSrc || ofi.img.src).replace(/"/g, '\\"')) + "\")";
      el.style.backgroundPosition = style['object-position'] || 'center';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundOrigin = 'content-box';

      if (/scale-down/.test(style['object-fit'])) {
        onImageReady(ofi.img, function () {
          if (ofi.img.naturalWidth > el.width || ofi.img.naturalHeight > el.height) {
            el.style.backgroundSize = 'contain';
          } else {
            el.style.backgroundSize = 'auto';
          }
        });
      } else {
        el.style.backgroundSize = style['object-fit'].replace('none', 'auto').replace('fill', '100% 100%');
      }

      onImageReady(ofi.img, function (img) {
        setPlaceholder(el, img.naturalWidth, img.naturalHeight);
      });
    }

    function keepSrcUsable(el) {
      var descriptors = {
        get: function get(prop) {
          return el[OFI].img[prop ? prop : 'src'];
        },
        set: function set(value, prop) {
          el[OFI].img[prop ? prop : 'src'] = value;
          nativeSetAttribute.call(el, ("data-ofi-" + prop), value); // preserve for any future cloneNode
          fixOne(el);
          return value;
        }
      };
      Object.defineProperty(el, 'src', descriptors);
      Object.defineProperty(el, 'currentSrc', {
        get: function () { return descriptors.get('currentSrc'); }
      });
      Object.defineProperty(el, 'srcset', {
        get: function () { return descriptors.get('srcset'); },
        set: function (ss) { return descriptors.set(ss, 'srcset'); }
      });
    }

    function hijackAttributes() {
      function getOfiImageMaybe(el, name) {
        return el[OFI] && el[OFI].img && (name === 'src' || name === 'srcset') ? el[OFI].img : el;
      }
      if (!supportsObjectPosition) {
        HTMLImageElement.prototype.getAttribute = function (name) {
          return nativeGetAttribute.call(getOfiImageMaybe(this, name), name);
        };

        HTMLImageElement.prototype.setAttribute = function (name, value) {
          return nativeSetAttribute.call(getOfiImageMaybe(this, name), name, String(value));
        };
      }
    }

    function fix(imgs, opts) {
      var startAutoMode = !autoModeEnabled && !imgs;
      opts = opts || {};
      imgs = imgs || 'img';

      if ((supportsObjectPosition && !opts.skipTest) || !supportsOFI) {
        return false;
      }

      // use imgs as a selector or just select all images
      if (imgs === 'img') {
        imgs = document.getElementsByTagName('img');
      } else if (typeof imgs === 'string') {
        imgs = document.querySelectorAll(imgs);
      } else if (!('length' in imgs)) {
        imgs = [imgs];
      }

      // apply fix to all
      for (var i = 0; i < imgs.length; i++) {
        imgs[i][OFI] = imgs[i][OFI] || {
          skipTest: opts.skipTest
        };
        fixOne(imgs[i]);
      }

      if (startAutoMode) {
        document.body.addEventListener('load', function (e) {
          if (e.target.tagName === 'IMG') {
            fix(e.target, {
              skipTest: opts.skipTest
            });
          }
        }, true);
        autoModeEnabled = true;
        imgs = 'img'; // reset to a generic selector for watchMQ
      }

      // if requested, watch media queries for object-fit change
      if (opts.watchMQ) {
        window.addEventListener('resize', fix.bind(null, imgs, {
          skipTest: opts.skipTest
        }));
      }
    }

    fix.supportsObjectFit = supportsObjectFit;
    fix.supportsObjectPosition = supportsObjectPosition;

    hijackAttributes();

    module.exports = fix;

  }, {}], 2: [function (require, module, exports) {
    // Common js
    require('./components/common/navbar');
    require('./components/common/search');
    require('./components/common/popper');
    require('./components/common/polyfills');

    var App = {

      toggleMenu: function ($menu) {
        if (!$menu.hasClass('opened')) {
          $menu.addClass('opened');
        } else {
          $menu.removeClass('opened');
        }
      },

      // Fix to 100% width
      resizeArticleContent: function ($iframe) {
        var paddingTop = ($iframe.outerHeight() / $iframe.outerWidth()) * 100 || 56.25;

        var iframeCSS = {
          position: 'absolute',
          top: '0',
          left: '0',
          bottom: '0',
          right: '0',
          width: '100%',
          height: '100%'
        };

        $iframe.wrap('<div class="article__iframe-wrapper" style="padding-top: ' + paddingTop + '%;"></div>');
        $iframe.css(iframeCSS);
      }
    };

    (function ($) {

      $('.counter').each(function () {
        $(this).prop('Counter', 0).animate({
          Counter: $(this).text()
        }, {
          duration: 1000,
          easing: 'swing',
          step: function (now) {
            $(this).text(Math.ceil(now));
          }
        });
      });

      $('button[data-toggle="collapse"]').on('click', function () {
        var $menu = $('#site-navigation');
        App.toggleMenu($menu);
      });

      $('a[data-value]').on('click', function () {
        var domain = $(this).data('value');
        var title = $(this).text();
        $('#selected-domain').attr('data-value', domain).text(title);
      });

      App.resizeArticleContent($('.article iframe'));

    })(jQuery);

  }, { "./components/common/navbar": 3, "./components/common/polyfills": 4, "./components/common/popper": 5, "./components/common/search": 6 }], 3: [function (require, module, exports) {
    jQuery(document).ready(function ($) {
      checkScreenSize();
      $(window).resize(checkScreenSize);

      $('.subnav-toggle').on('click', function () {
        var parent = $(this).parent();

        if (parent.hasClass('active-hover')) {
          parent.removeClass('active-hover');
          $(this).removeClass('rotate');
        }
        else {
          parent.addClass('active-hover');
          $(this).addClass('rotate');
        }
      });

      // Toggle subnav visibility on hover when screen size is above navbar collapse width
      function checkScreenSize() {
        var isMobile = $('#mobile-indicator').is(':visible');

        var mouseEnterHandler = function () {
          $(this).addClass('active-hover');
        };

        var mouseLeaveHandler = function () {
          $(this).removeClass('active-hover');
        };

        navbarLink = $('#main-navbar li');

        if (isMobile === false) {
          navbarLink.bind({ mouseenter: mouseEnterHandler, mouseleave: mouseLeaveHandler });
        }
        else {
          navbarLink.unbind('mouseenter').unbind('mouseleave');
        }
      }
    });


  }, {}], 4: [function (require, module, exports) {
    var objectFitImages = require('object-fit-images');

    jQuery(document).ready(function () {
      // Polyfill object-fit
      objectFitImages();
    });
  }, { "object-fit-images": 1 }], 5: [function (require, module, exports) {
    (function ($) {
      $('.btn[data-trigger="popper"]').on('click', function () {
        $('.popper').toggleClass('open');
      });
    }(jQuery));

  }, {}], 6: [function (require, module, exports) {
    jQuery(document).ready(function ($) {

      search = function (domain, q) {
        var wordpressIndicator = $('#wordpress-indicator').is(':visible');

        // Handle search differently when in wordpress
        if (wordpressIndicator) {
          if (domain == "/posts") {
            window.location.href = '/' + locale + '/?s=' + encodeURI(q);
          }
          else {
            window.location.href = '/data/' + locale_ckan + domain + '?q=' + encodeURI(q) + '&sort=title+asc';
          }
        }
        else {
          window.location.href = '/' + jQuery('html').attr('lang') + '/?s=' + encodeURI(q);
        }
      };

      getLocale = function () {
        return jQuery('html').attr('lang');
      };

      $('#search').on('click', function () {
        var q = $('#q').val();
        var domain = $('#selected-domain').data('value');
        search(domain, q);
      });

      $(document).keypress(function (e) {
        if (e.which == 13) {
          if ($('#q').is(":focus")) {
            var q = $('#q').val();
            var domain = $('#selected-domain').data('value');
            search(domain, q);
          }
          else if ($('#navbar-search-q').is(':focus')) {
            var q = $('#navbar-search-q').val();
            search('/posts', q);
          }
        }
      });

      $('.navbar-search-btn').on('click', function (e) {
        e.stopPropagation();

        $(this).hide();
        var container = $('.navbar-search-form');
        container.css('display', 'table');

        $(document).on('click', function (e) {
          if (!container.is(e.target) && container.has(e.target).length === 0) {
            container.hide();
            $('.navbar-search-btn').show();

            $(document).off('click');
          }
        });
      });

      $('.navbar-search-submit-btn').on('click', function (e) {
        e.preventDefault();
        var q = $('#navbar-search-q').val();
        search('/posts', q);
      });
    });
  }, {}]
}, {}, [2]);
