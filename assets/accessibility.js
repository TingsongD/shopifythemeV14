(function() {
  'use strict';

  var focusableSelector = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  var cssEscape = window.CSS && window.CSS.escape
    ? window.CSS.escape
    : function(value) {
      return String(value).replace(/["\\]/g, '\\$&');
    };

  function textContent(node) {
    return (node && node.textContent ? node.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function hasAccessibleName(element) {
    if (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.getAttribute('title')) {
      return true;
    }

    if (element.id && document.querySelector('label[for="' + cssEscape(element.id) + '"]')) {
      return true;
    }

    var parentLabel = element.closest('label');
    return Boolean(parentLabel && textContent(parentLabel));
  }

  function hasNamedImage(element) {
    return Boolean(Array.prototype.slice.call(element.querySelectorAll('img[alt]')).find(function(image) {
      return image.getAttribute('alt').trim();
    }));
  }

  function readableName(element) {
    var placeholder = element.getAttribute('placeholder');
    if (placeholder) return placeholder;

    var name = element.getAttribute('name') || element.id || element.getAttribute('type') || 'field';
    return name
      .replace(/^contact\[/, '')
      .replace(/^customer\[/, '')
      .replace(/\]$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, function(letter) { return letter.toUpperCase(); });
  }

  function ensureNamedFields(root) {
    var fields = [];
    if (root.matches && root.matches('input:not([type="hidden"]), select, textarea')) {
      fields.push(root);
    }
    root.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(function(field) {
      fields.push(field);
    });
    fields.forEach(function(field) {
      if (!hasAccessibleName(field)) {
        field.setAttribute('aria-label', readableName(field));
      }
    });
  }

  function ensureFormErrorSemantics(root) {
    root.querySelectorAll('.note--error, .errors, .form-error').forEach(function(error, index) {
      if (!error.id) {
        error.id = 'FormError-' + index + '-' + Math.random().toString(36).slice(2, 8);
      }
      error.setAttribute('role', 'alert');
      error.setAttribute('aria-live', 'assertive');

      var form = error.closest('form');
      if (!form) return;

      form.querySelectorAll('.input-error, .input--error').forEach(function(field) {
        field.setAttribute('aria-invalid', 'true');
        var describedBy = field.getAttribute('aria-describedby');
        if (!describedBy) {
          field.setAttribute('aria-describedby', error.id);
        } else if (describedBy.split(/\s+/).indexOf(error.id) === -1) {
          field.setAttribute('aria-describedby', describedBy + ' ' + error.id);
        }
      });
    });
  }

  function fallbackInteractiveName(element) {
    var popupName = element.getAttribute('data-js-popup-button');
    if (popupName) {
      return 'Open ' + popupName.replace(/[-_]+/g, ' ');
    }

    if (element.classList.contains('button-quick-view')) return 'Quick view';
    if (element.className && String(element.className).indexOf('social-media__') !== -1) {
      return String(element.className).split(/\s+/).find(function(name) {
        return name.indexOf('social-media__') === 0;
      }).replace('social-media__', '').replace(/[-_]+/g, ' ');
    }

    var href = element.getAttribute('href');
    if (href) {
      var clean = href.split('?')[0].split('#')[0].replace(/\/$/, '').split('/').pop();
      if (clean) return clean.replace(/[-_]+/g, ' ');
    }

    return 'Open link';
  }

  function ensureInteractiveNames(root) {
    var controls = [];
    if (root.matches && root.matches('a, button, [role="button"]')) {
      controls.push(root);
    }
    root.querySelectorAll('a, button, [role="button"]').forEach(function(control) {
      controls.push(control);
    });

    controls.forEach(function(control) {
      if (hasAccessibleName(control) || textContent(control) || hasNamedImage(control)) return;
      control.setAttribute('aria-label', fallbackInteractiveName(control));
    });
  }

  function nameDialog(dialog) {
    var heading = dialog.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      if (!heading.id) {
        heading.id = 'PopupTitle-' + (dialog.getAttribute('data-js-popup-name') || 'dialog');
      }
      dialog.setAttribute('aria-labelledby', heading.id);
      return;
    }

    var name = dialog.getAttribute('data-js-popup-name') || 'dialog';
    dialog.setAttribute('aria-label', name.replace(/[-_]+/g, ' ') + ' dialog');
  }

  function ensurePopupSemantics(root) {
    root.querySelectorAll('.popup__bg').forEach(function(background) {
      background.setAttribute('aria-hidden', 'true');
    });

    root.querySelectorAll('.popup__body[data-js-popup-name]').forEach(function(dialog) {
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('tabindex', '-1');
      nameDialog(dialog);
    });

    root.querySelectorAll('[data-js-popup-close]').forEach(function(closeControl) {
      if (!closeControl.matches('button, a, input, textarea, select')) {
        closeControl.setAttribute('role', 'button');
        closeControl.setAttribute('tabindex', '0');
      }
      if (!hasAccessibleName(closeControl)) {
        closeControl.setAttribute('aria-label', 'Close dialog');
      }
    });
  }

  function visiblePopupDialog() {
    var dialogs = Array.prototype.slice.call(document.querySelectorAll('.popup__body[role="dialog"]'));
    return dialogs.find(function(dialog) {
      return dialog.offsetParent !== null && !dialog.classList.contains('d-none') && !dialog.classList.contains('d-none-important');
    });
  }

  function focusFirstControl(dialog) {
    var first = Array.prototype.slice.call(dialog.querySelectorAll(focusableSelector)).find(function(element) {
      return element.offsetParent !== null;
    });
    (first || dialog).focus({ preventScroll: true });
  }

  function trapFocus(event) {
    if (event.key !== 'Tab') return;

    var dialog = visiblePopupDialog();
    if (!dialog) return;

    var focusable = Array.prototype.slice.call(dialog.querySelectorAll(focusableSelector)).filter(function(element) {
      return element.offsetParent !== null;
    });

    if (!focusable.length) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleKeyboardActivation(event) {
    var control = event.target.closest('[role="button"][data-js-popup-close], [role="button"][data-control]');
    if (!control) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      control.click();
    }
  }

  function handleEscape(event) {
    if (event.key !== 'Escape') return;
    var dialog = visiblePopupDialog();
    if (!dialog) return;
    var close = dialog.querySelector('[data-js-popup-close]');
    if (close) close.click();
  }

  function init() {
    ensureNamedFields(document);
    ensureInteractiveNames(document);
    ensureFormErrorSemantics(document);
    ensurePopupSemantics(document);

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          ensureNamedFields(node);
          ensureInteractiveNames(node);
          ensureFormErrorSemantics(node);
          ensurePopupSemantics(node);
        });

        if (mutation.type === 'attributes') {
          var dialog = visiblePopupDialog();
          if (dialog && !dialog.contains(document.activeElement)) {
            focusFirstControl(dialog);
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden']
    });

    document.addEventListener('keydown', trapFocus);
    document.addEventListener('keydown', handleKeyboardActivation);
    document.addEventListener('keydown', handleEscape);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
