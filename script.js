/*
 * CG Performance | site behaviour
 * Vanilla JavaScript, no dependencies.
 *
 * Everything here degrades gracefully. With JavaScript disabled the page still
 * reads correctly, the navigation links still work, the FAQ still opens and the
 * enquiry form still submits to /api/enquiry as a normal form post.
 */
(function () {
  'use strict';

  var CONFIG = window.CG_CONFIG || { services: {}, paymentLinks: {}, endpoints: {} };
  var SERVICES = CONFIG.services || {};

  var gbp = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  function money(pence) {
    return gbp.format(pence / 100);
  }

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* ------------------------------------------------------------------
   * Current year in the footer
   * ------------------------------------------------------------------ */
  $$('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------
   * Mobile navigation
   * ------------------------------------------------------------------ */
  var navToggle = $('#nav-toggle');
  var siteNav = $('#site-nav');

  function closeNav() {
    if (!siteNav || !navToggle) return;
    siteNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var open = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    siteNav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && siteNav.classList.contains('is-open')) {
        closeNav();
        navToggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeNav();
    });
  }

  /* ------------------------------------------------------------------
   * Price integrity check
   * The prices in the markup are the ones search engines and non JavaScript
   * visitors read. This compares them against services.js so the two cannot
   * quietly drift apart. It only ever warns in the console.
   * ------------------------------------------------------------------ */
  $$('[data-price]').forEach(function (el) {
    var parts = el.getAttribute('data-price').split('.');
    var service = SERVICES[parts[0]];
    if (!service) {
      console.warn('[CG] Unknown service ID in data-price:', parts[0]);
      return;
    }
    var expected = money(service[parts[1]]);
    var shown = el.textContent.replace(/\s/g, '');
    if (shown !== expected.replace(/\s/g, '')) {
      console.warn('[CG] Price mismatch for ' + el.getAttribute('data-price') +
        '. Markup shows "' + el.textContent + '", services.js says "' + expected + '".');
    }
  });

  /* ------------------------------------------------------------------
   * Enquiry helpers
   * ------------------------------------------------------------------ */
  var enquiryForm = $('#enquiry-form');
  var serviceSelect = $('#f-service');

  function goToEnquiry(serviceId) {
    var target = document.getElementById('enquire');
    if (!target) return;

    if (serviceId && serviceSelect && SERVICES[serviceId]) {
      var wanted = SERVICES[serviceId].enquiryValue;
      $$('option', serviceSelect).forEach(function (option) {
        if (option.value === wanted || option.textContent.trim() === wanted) {
          serviceSelect.value = option.value || option.textContent.trim();
        }
      });
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    var focusTarget = serviceSelect && serviceSelect.value ? $('#f-name') : serviceSelect;
    if (focusTarget) {
      window.setTimeout(function () {
        focusTarget.focus({ preventScroll: true });
      }, 400);
    }
  }

  $$('[data-enquire]').forEach(function (el) {
    el.addEventListener('click', function (event) {
      event.preventDefault();
      goToEnquiry(el.getAttribute('data-enquire'));
    });
  });

  /* ------------------------------------------------------------------
   * Virtual Coaching selector
   * ------------------------------------------------------------------ */
  var virtualButton = $('#virtual-checkout');
  var virtualTotal = $('#virtual-total');
  var virtualRadios = $$('input[name="virtual-plan"]');
  var selectedVirtual = null;

  function updateVirtual() {
    var checked = virtualRadios.filter(function (radio) { return radio.checked; })[0];

    if (!checked) {
      selectedVirtual = null;
      if (virtualTotal) virtualTotal.textContent = 'Select an option to see the monthly total.';
      if (virtualButton) {
        virtualButton.disabled = true;
        virtualButton.textContent = 'Set Up Direct Debit';
        virtualButton.setAttribute('aria-label', 'Select the number of Virtual Coaching sessions per month before setting up a Direct Debit');
      }
      return;
    }

    var id = checked.value;
    var service = SERVICES[id];
    if (!service) return;

    selectedVirtual = id;
    if (virtualTotal) {
      virtualTotal.textContent = service.sessions + ' sessions per month at ' +
        money(service.perSession) + ' per session. Monthly total ' + money(service.amount) + '.';
    }
    if (virtualButton) {
      virtualButton.disabled = false;
      virtualButton.textContent = 'Set Up Direct Debit';
      virtualButton.setAttribute('aria-label',
        'Set up a Direct Debit for ' + service.sessions + ' Virtual Coaching sessions per month at ' +
        money(service.amount) + ' per month');
    }
  }

  virtualRadios.forEach(function (radio) {
    radio.addEventListener('change', updateVirtual);
  });
  updateVirtual();

  /* ------------------------------------------------------------------
   * Recurring Direct Debit checkout
   * The browser sends nothing but a service ID. Prices, Stripe Price IDs and
   * the billing date are resolved on the server.
   * ------------------------------------------------------------------ */
  function setBusy(button, busy, label) {
    if (busy) {
      button.dataset.originalLabel = button.dataset.originalLabel || button.textContent;
      button.textContent = label || 'Opening secure checkout';
      button.classList.add('is-busy');
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalLabel || 'Set Up Direct Debit';
      button.classList.remove('is-busy');
      button.disabled = false;
    }
  }

  function showButtonError(button, message) {
    var existing = button.parentNode.querySelector('.field-error');
    if (existing) existing.remove();
    var note = document.createElement('span');
    note.className = 'field-error';
    note.setAttribute('role', 'alert');
    note.textContent = message;
    button.parentNode.appendChild(note);
  }

  $$('[data-checkout]').forEach(function (button) {
    button.addEventListener('click', function () {
      var id = button.getAttribute('data-checkout');
      if (id === 'virtual-selected') id = selectedVirtual;

      if (!id || !SERVICES[id] || SERVICES[id].type !== 'subscription') {
        showButtonError(button, 'Please select an option before continuing.');
        return;
      }

      var stale = button.parentNode.querySelector('.field-error');
      if (stale) stale.remove();

      setBusy(button, true);

      fetch(CONFIG.endpoints.checkout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ serviceId: id }),
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.url) {
            window.location.assign(result.data.url);
            return;
          }
          setBusy(button, false);
          showButtonError(button, (result.data && result.data.message) ||
            'Checkout is not available at the moment. Please use the enquiry form and I will arrange it directly.');
        })
        .catch(function () {
          setBusy(button, false);
          showButtonError(button,
            'Checkout could not be opened. Please check your connection or use the enquiry form.');
        });
    });
  });

  /* ------------------------------------------------------------------
   * One time purchases through Stripe Payment Links
   * If a link has not been configured the button becomes an enquiry route
   * rather than a broken purchase button.
   * ------------------------------------------------------------------ */
  $$('[data-purchase]').forEach(function (button) {
    var id = button.getAttribute('data-purchase');
    var link = (CONFIG.paymentLinks || {})[id];

    if (!link) {
      button.textContent = 'Enquire to Purchase';
      button.classList.remove('btn-solid');
      button.classList.add('btn-outline');
      button.addEventListener('click', function () { goToEnquiry(id); });
      var sibling = button.parentNode.querySelector('[data-enquire="' + id + '"]');
      if (sibling) sibling.remove();
      return;
    }

    button.addEventListener('click', function () {
      window.location.assign(link);
    });
  });

  /* ------------------------------------------------------------------
   * Enquiry form
   * ------------------------------------------------------------------ */
  if (enquiryForm) {
    var status = $('#enquiry-status');
    var submitButton = $('#enquiry-submit');

    function fieldError(input, show) {
      var describedBy = input.getAttribute('aria-describedby');
      var note = describedBy ? document.getElementById(describedBy) : null;
      if (note) note.hidden = !show;
      input.classList.toggle('has-error', show);
      input.setAttribute('aria-invalid', show ? 'true' : 'false');
    }

    function validate() {
      var firstInvalid = null;

      $$('[required]', enquiryForm).forEach(function (input) {
        var valid = input.type === 'checkbox' ? input.checked : input.value.trim() !== '';
        if (valid && input.type === 'email') {
          valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
        }
        fieldError(input, !valid);
        if (!valid && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        if (status) {
          status.className = 'form-status is-error';
          status.textContent = 'Please complete the highlighted fields.';
        }
        return false;
      }
      return true;
    }

    $$('[required]', enquiryForm).forEach(function (input) {
      input.addEventListener('input', function () {
        if (input.classList.contains('has-error')) fieldError(input, false);
      });
      input.addEventListener('change', function () {
        if (input.classList.contains('has-error')) fieldError(input, false);
      });
    });

    enquiryForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!validate()) return;

      var payload = {};
      new FormData(enquiryForm).forEach(function (value, key) {
        payload[key] = value;
      });

      submitButton.disabled = true;
      submitButton.classList.add('is-busy');
      submitButton.textContent = 'Sending';
      if (status) {
        status.className = 'form-status';
        status.textContent = '';
      }

      fetch(CONFIG.endpoints.enquiry, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok) {
            window.location.assign('/enquiry-success');
            return;
          }
          throw new Error((result.data && result.data.message) || 'send failed');
        })
        .catch(function (error) {
          submitButton.disabled = false;
          submitButton.classList.remove('is-busy');
          submitButton.textContent = 'Send Enquiry';
          if (status) {
            status.className = 'form-status is-error';
            status.textContent = error.message && error.message !== 'send failed'
              ? error.message
              : 'Your enquiry could not be sent. Please try again, or email chrisgkoufas.performance@gmail.com directly.';
          }
        });
    });
  }
})();
