(function () {
  var form = document.getElementById('booking-form');
  if (!form) return;

  var homeFields = document.getElementById('home-fields');
  var homeFeeNote = document.getElementById('home-fee-note');
  var serviceTypeInputs = form.querySelectorAll('input[name="service-type"]');
  var terms = form.querySelector('#terms-agree');
  var policyModal = document.getElementById('policy-modal');
  var policyOpenBtn = document.getElementById('policy-open-btn');
  var policyStatus = document.getElementById('policy-status');
  var policyModalAgree = document.getElementById('policy-modal-agree');
  var policyAcceptBtn = document.getElementById('policy-accept-btn');
  var lastFocus = null;
  var success = document.getElementById('booking-success');
  var successTitle = document.getElementById('booking-success-title');
  var successText = document.getElementById('booking-success-text');
  var errorEl = document.getElementById('booking-error');
  var payAgainBtn = document.getElementById('booking-pay-again');
  var paymentDetailsEl = document.getElementById('booking-payment-details');
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
    applyServiceFromUrl(params.get('service'));
  }

  function applyServiceFromUrl(serviceName) {
    if (!serviceName) return;
    var select = form.querySelector('#service');
    if (!select) return;
    var match = Array.prototype.find.call(select.options, function (opt) {
      return opt.value === serviceName;
    });
    if (match) {
      select.value = serviceName;
    }
  }

  function scrollToBooking() {
    var bookSection = document.getElementById('book');
    if (bookSection) {
      bookSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updatePolicyStatus() {
    if (!policyStatus || !terms) return;
    if (terms.checked) {
      policyStatus.textContent = 'Booking policy accepted.';
      policyStatus.classList.add('is-accepted');
      if (policyOpenBtn) policyOpenBtn.textContent = 'Review booking policy';
    } else {
      policyStatus.textContent = 'Please read and accept our booking policy before continuing.';
      policyStatus.classList.remove('is-accepted');
      if (policyOpenBtn) policyOpenBtn.textContent = 'Read booking & payment policy';
    }
  }

  function openPolicyModal() {
    if (!policyModal) return;
    lastFocus = document.activeElement;
    policyModal.hidden = false;
    document.body.classList.add('policy-modal-open');
    if (policyModalAgree && terms) {
      policyModalAgree.checked = terms.checked;
    }
    if (policyAcceptBtn) {
      policyAcceptBtn.disabled = !(policyModalAgree && policyModalAgree.checked);
    }
    var closeBtn = policyModal.querySelector('.policy-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closePolicyModal() {
    if (!policyModal) return;
    policyModal.hidden = true;
    document.body.classList.remove('policy-modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function acceptPolicy() {
    if (!policyModalAgree || !policyModalAgree.checked || !terms) return;
    terms.checked = true;
    terms.removeAttribute('aria-invalid');
    updatePolicyStatus();
    closePolicyModal();
    clearError();
    if (submitBtn) submitBtn.focus();
  }

  function handlePolicyHash() {
    if (window.location.hash === '#policy') {
      scrollToBooking();
      openPolicyModal();
    }
  }

  if (policyOpenBtn) {
    policyOpenBtn.addEventListener('click', openPolicyModal);
  }

  if (policyModalAgree && policyAcceptBtn) {
    policyModalAgree.addEventListener('change', function () {
      policyAcceptBtn.disabled = !policyModalAgree.checked;
    });
  }

  if (policyAcceptBtn) {
    policyAcceptBtn.addEventListener('click', acceptPolicy);
  }

  if (policyModal) {
    policyModal.querySelectorAll('[data-policy-close]').forEach(function (el) {
      el.addEventListener('click', closePolicyModal);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && policyModal && !policyModal.hidden) {
      closePolicyModal();
    }
  });

  window.addEventListener('hashchange', handlePolicyHash);
  updatePolicyStatus();

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

  function showPaymentDetails(payment) {
    if (!payment || !paymentDetailsEl) return;
    var lines = [
      '<div class="payid-box">',
      '<p class="payid-lead"><strong>Pay now with PayID</strong> to confirm your appointment.</p>',
      '<dl class="payid-details">',
      '<div><dt>PayID</dt><dd><strong>' + escapeHtml(payment.payIdDisplay || payment.payId) + '</strong></dd></div>',
      '<div><dt>Business name</dt><dd>' + escapeHtml(payment.payIdName || "Jack's Barber Style") + '</dd></div>',
      '<div><dt>Amount</dt><dd><strong>$' + Number(payment.amount).toFixed(2) + ' AUD</strong></dd></div>',
      '<div><dt>Reference</dt><dd><strong>' + escapeHtml(payment.reference) + '</strong></dd></div>'
    ];
    if (payment.gstRegistered && payment.gst > 0) {
      lines.push('<div><dt>GST included</dt><dd>$' + Number(payment.gst).toFixed(2) + '</dd></div>');
    }
    if (payment.abn) {
      lines.push('<div><dt>ABN</dt><dd>' + escapeHtml(payment.abn) + '</dd></div>');
    }
    lines.push('</dl>');
    lines.push('<ol class="payid-steps">');
    (payment.instructions || []).forEach(function (step) {
      lines.push('<li>' + escapeHtml(step) + '</li>');
    });
    lines.push('</ol></div>');
    paymentDetailsEl.innerHTML = lines.join('');
    paymentDetailsEl.hidden = false;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showSuccess(title, message, payment) {
    clearError();
    form.hidden = true;
    if (payAgainBtn) payAgainBtn.hidden = !payment;
    if (bookingPanel) bookingPanel.classList.add('booking-confirmed');
    if (success) {
      if (successTitle) successTitle.textContent = title || 'Request sent';
      if (successText) successText.textContent = message || '';
      success.hidden = false;
      if (payment) showPaymentDetails(payment);
      else if (paymentDetailsEl) paymentDetailsEl.hidden = true;
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
      ? 'Confirm booking & pay with PayID'
      : 'Confirm booking request';
  }

  function startCheckout(bookingId) {
    if (!bookingId) return;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Loading PayID details…';
    }
    fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: bookingId })
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          throw new Error(result.data.error || 'Could not load PayID details.');
        }
        if (result.data.checkoutUrl) {
          window.location.href = result.data.checkoutUrl;
          return;
        }
        if (result.data.payment) {
          showSuccess(
            'Pay with PayID',
            'Your booking is saved. Pay the exact amount below using PayID to confirm your appointment.',
            result.data.payment
          );
          form.hidden = true;
          if (success) success.hidden = false;
          return;
        }
        throw new Error('PayID details are not available. Please call 0478 268 399.');
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
      showError('Please read and accept the booking policy before continuing.');
      openPolicyModal();
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
      submitBtn.textContent = paymentsEnabled ? 'Saving booking…' : 'Sending…';
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
        pendingBookingId = data.id || null;
        if (data.payment) {
          showSuccess(
            'Almost done — pay with PayID',
            'Your booking is saved. Pay the exact amount below using PayID to confirm your appointment.',
            data.payment
          );
          if (payAgainBtn) payAgainBtn.hidden = false;
          return;
        }
        showSuccess(
          'Request sent',
          data.message || 'Thank you — your booking request has been received. We will contact you shortly with payment details.'
        );
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong. Please try again or call 0478 268 399.');
      })
      .finally(function () {
        if (!succeeded && submitBtn) {
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
        'Thank you — your PayID payment was received and your appointment is confirmed. We look forward to seeing you!'
      );
      history.replaceState(null, '', window.location.pathname + '#book');
      return;
    }

    if (status === 'cancelled') {
      pendingBookingId = params.get('id');
      showError('Payment was not completed. Your booking is saved — use the PayID details below or tap Show PayID details.');
      if (payAgainBtn && pendingBookingId) {
        payAgainBtn.hidden = false;
        payAgainBtn.textContent = 'Show PayID details';
      }
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
          intro.textContent = 'Complete the form below, then pay instantly with PayID from your banking app.';
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
      handlePolicyHash();
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
    var hash = window.location.hash.slice(1);
    if (hash.split('?')[0] === 'book') {
      var qIndex = hash.indexOf('?');
      var params = new URLSearchParams(qIndex >= 0 ? hash.slice(qIndex + 1) : '');
      applyServiceFromUrl(params.get('service'));
    }
  });
})();
