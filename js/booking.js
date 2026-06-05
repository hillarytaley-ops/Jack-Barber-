(function () {
  var form = document.getElementById('booking-form');
  if (!form) return;

  var homeFields = document.getElementById('home-fields');
  var homeFeeNote = document.getElementById('home-fee-note');
  var serviceTypeInputs = form.querySelectorAll('input[name="service-type"]');
  var terms = form.querySelector('#terms-agree');
  var success = document.getElementById('booking-success');
  var successTitle = document.getElementById('booking-success-title');
  var successText = document.getElementById('booking-success-text');
  var errorEl = document.getElementById('booking-error');
  var payAgainBtn = document.getElementById('booking-pay-again');
  var submitBtn = form.querySelector('button[type="submit"]');
  var bookingPanel = form.closest('.booking-panel');
  var pendingBookingId = null;
  var paymentsEnabled = false;

  function updateHomeFeeNote() {
    if (!homeFeeNote) return;
    var cfg = window.__siteConfig;
    var isHome = form.querySelector('input[name="service-type"]:checked');
    var showHome = isHome && isHome.value === 'home';
    if (!showHome || !cfg || !cfg.homeService) {
      homeFeeNote.hidden = true;
      return;
    }
    var fee = Number(cfg.homeService.travelFee) || 0;
    homeFeeNote.textContent = fee > 0
      ? 'A $' + fee + ' travel fee will be added to your service price for home visits.'
      : '';
    homeFeeNote.hidden = fee <= 0;
  }

  function applyHomeFromUrl() {
    var hash = window.location.hash.slice(1);
    if (!hash || hash.split('?')[0] !== 'book') return;
    var qIndex = hash.indexOf('?');
    var params = new URLSearchParams(qIndex >= 0 ? hash.slice(qIndex + 1) : '');
    if (params.get('home') === '1') {
      selectHomeService();
    }
  }

  function scrollToBooking() {
    var bookSection = document.getElementById('book');
    if (bookSection) {
      bookSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function selectHomeService() {
    var homeRadio = form.querySelector('input[name="service-type"][value="home"]');
    if (homeRadio) homeRadio.checked = true;
    toggleHomeFields();
    updateHomeFeeNote();
  }

  function toggleHomeFields() {
    var isHome = form.querySelector('input[name="service-type"]:checked');
    if (!homeFields) return;
    var show = isHome && isHome.value === 'home';
    homeFields.hidden = !show;
    homeFields.querySelectorAll('input, textarea').forEach(function (el) {
      el.required = show;
    });
    updateHomeFeeNote();
  }

  serviceTypeInputs.forEach(function (input) {
    input.addEventListener('change', toggleHomeFields);
  });
  toggleHomeFields();

  var dateInput = form.querySelector('#date');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
    dateInput.addEventListener('change', checkClosedDate);
  }

  function checkClosedDate() {
    var cfg = window.__siteConfig;
    if (!cfg || !dateInput.value) return;
    var closed = (cfg.closedDates || []).some(function (d) {
      return (d.date || d) === dateInput.value;
    });
    if (closed) {
      showError('Sorry, we are closed on this date. Please choose another day.');
      dateInput.value = '';
      dateInput.focus();
    }
  }

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
    if (success) success.hidden = true;
  }

  function clearError() {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  function showSuccess(title, message) {
    clearError();
    form.hidden = true;
    if (payAgainBtn) payAgainBtn.hidden = true;
    if (bookingPanel) bookingPanel.classList.add('booking-confirmed');
    if (success) {
      if (successTitle) successTitle.textContent = title || 'Request sent';
      if (successText) successText.textContent = message || '';
      success.hidden = false;
      success.setAttribute('aria-live', 'polite');
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function validate(payload) {
    if (!payload.name || !String(payload.name).trim()) {
      return 'Please enter your full name.';
    }
    if (!payload.email || !String(payload.email).trim()) {
      return 'Please enter your email address.';
    }
    if (!payload.phone || !String(payload.phone).trim()) {
      return 'Please enter your phone number.';
    }
    if (!payload.service || !String(payload.service).trim()) {
      return 'Please select a service from the list.';
    }
    if (!payload.date) {
      return 'Please choose a preferred date.';
    }
    if (!payload.time) {
      return 'Please choose a preferred time.';
    }
    if (payload.serviceType === 'home' && !String(payload.address || '').trim()) {
      return 'Please enter your home address for a home service appointment.';
    }
    return '';
  }

  function updateSubmitLabel() {
    if (!submitBtn) return;
    submitBtn.textContent = paymentsEnabled
      ? 'Continue to secure card payment'
      : 'Confirm booking request';
  }

  function startCheckout(bookingId) {
    if (!bookingId) return;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Opening payment…';
    }
    fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: bookingId })
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || !result.data.checkoutUrl) {
          throw new Error(result.data.error || 'Could not start payment.');
        }
        window.location.href = result.data.checkoutUrl;
      })
      .catch(function (err) {
        showError(err.message || 'Payment could not be started. Please call 0478 268 399.');
        if (submitBtn) {
          submitBtn.disabled = false;
          updateSubmitLabel();
        }
      });
  }

  if (payAgainBtn) {
    payAgainBtn.addEventListener('click', function () {
      startCheckout(pendingBookingId);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();
    if (payAgainBtn) payAgainBtn.hidden = true;

    if (terms && !terms.checked) {
      showError('Please agree to the booking and payment terms before continuing.');
      terms.focus();
      terms.setAttribute('aria-invalid', 'true');
      return;
    }
    if (terms) terms.removeAttribute('aria-invalid');

    var fd = new FormData(form);
    var payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      serviceType: fd.get('service-type'),
      service: String(fd.get('service') || '').trim(),
      date: fd.get('date'),
      time: fd.get('time'),
      address: String(fd.get('address') || '').trim()
    };

    var validationError = validate(payload);
    if (validationError) {
      showError(validationError);
      if (!payload.service) {
        var serviceSelect = form.querySelector('#service');
        if (serviceSelect) serviceSelect.focus();
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = paymentsEnabled ? 'Preparing payment…' : 'Sending…';
    }

    var succeeded = false;

    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.text().then(function (text) {
          var data;
          try {
            data = text ? JSON.parse(text) : {};
          } catch (err) {
            if (text && text.indexOf('FUNCTION_INVOCATION_FAILED') !== -1) {
              throw new Error('Our booking system is temporarily down. Please call 0478 268 399 to book by phone.');
            }
            throw new Error('Could not save your booking. Please call 0478 268 399 to book by phone.');
          }
          if (!r.ok) throw new Error(data.error || 'Could not save your booking.');
          return data;
        });
      })
      .then(function (data) {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
        succeeded = true;
        showSuccess(
          'Request sent',
          data.message || 'Thank you — your booking request has been received. We will contact you shortly with payment details.'
        );
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong. Please try again or call 0478 268 399.');
      })
      .finally(function () {
        if (!succeeded && submitBtn && !window.location.href.includes('checkout.stripe.com')) {
          submitBtn.disabled = false;
          updateSubmitLabel();
        }
      });
  });

  function handleReturnFromPayment() {
    var params = new URLSearchParams(window.location.search);
    var status = params.get('booking');
    if (window.location.hash !== '#book' || !status) return;

    if (status === 'success') {
      showSuccess(
        'Payment received',
        'Thank you — your card payment was successful and your appointment is confirmed. We look forward to seeing you!'
      );
      history.replaceState(null, '', window.location.pathname + '#book');
      return;
    }

    if (status === 'cancelled') {
      pendingBookingId = params.get('id');
      showError('Payment was cancelled. Your booking is saved but not confirmed until payment is complete.');
      if (payAgainBtn && pendingBookingId) payAgainBtn.hidden = false;
      history.replaceState(null, '', window.location.pathname + '#book');
    }
  }

  fetch('/api/public/config')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (cfg && cfg.paymentsEnabled) {
        paymentsEnabled = true;
        updateSubmitLabel();
        var intro = document.querySelector('.booking-intro');
        if (intro) {
          intro.textContent = 'Complete the form below, then pay securely by Visa, Mastercard, or other credit/debit card.';
        }
      }
      if (cfg && cfg.homeService && cfg.homeService.enabled === false) {
        form.querySelectorAll('input[name="service-type"][value="home"]').forEach(function (el) {
          el.disabled = true;
          el.closest('.radio-label').classList.add('is-disabled');
        });
      }
    })
    .catch(function () { /* ignore */ })
    .finally(function () {
      handleReturnFromPayment();
      applyHomeFromUrl();
    });

  var homeBookBtn = document.getElementById('home-service-book-btn');
  if (homeBookBtn) {
    homeBookBtn.addEventListener('click', function (e) {
      e.preventDefault();
      selectHomeService();
      history.replaceState(null, '', '#book?home=1');
      scrollToBooking();
    });
  }

  document.addEventListener('site-config-loaded', function () {
    updateHomeFeeNote();
  });
})();
