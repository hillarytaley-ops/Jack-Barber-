(function () {
  var form = document.getElementById('booking-form');
  if (!form) return;

  var homeFields = document.getElementById('home-fields');
  var serviceTypeInputs = form.querySelectorAll('input[name="service-type"]');
  var terms = form.querySelector('#terms-agree');
  var success = document.getElementById('booking-success');
  var errorEl = document.getElementById('booking-error');
  var submitBtn = form.querySelector('button[type="submit"]');
  var bookingPanel = form.closest('.booking-panel');

  function toggleHomeFields() {
    var isHome = form.querySelector('input[name="service-type"]:checked');
    if (!homeFields) return;
    var show = isHome && isHome.value === 'home';
    homeFields.hidden = !show;
    homeFields.querySelectorAll('input, textarea').forEach(function (el) {
      el.required = show;
    });
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

  function showSuccess() {
    clearError();
    form.hidden = true;
    if (bookingPanel) bookingPanel.classList.add('booking-confirmed');
    if (success) {
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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

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
      submitBtn.textContent = 'Sending…';
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
            throw new Error('Could not save your booking. Please call 0478 268 399 to book by phone.');
          }
          if (!r.ok) throw new Error(data.error || 'Could not save your booking.');
          return data;
        });
      })
      .then(function () {
        succeeded = true;
        showSuccess();
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong. Please try again or call 0478 268 399.');
      })
      .finally(function () {
        if (!succeeded && submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm booking request';
        }
      });
  });
})();
