(function () {
  var form = document.getElementById('booking-form');
  if (!form) return;

  var homeFields = document.getElementById('home-fields');
  var serviceTypeInputs = form.querySelectorAll('input[name="service-type"]');
  var terms = form.querySelector('#terms-agree');
  var success = document.getElementById('booking-success');

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
      alert('Sorry, we are closed on this date. Please choose another day.');
      dateInput.value = '';
    }
  }

  function showSuccess() {
    form.hidden = true;
    if (success) {
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function mailtoFallback(data) {
    var type = data.serviceType === 'home' ? 'Home Service' : 'In-Shop';
    var subject = encodeURIComponent("Booking Request – Jack's Barber Style");
    var body = encodeURIComponent(
      "Booking Request\n\nName: " + data.name + "\nEmail: " + data.email +
      "\nPhone: " + data.phone + "\nService Type: " + type +
      "\nService: " + data.service + "\nDate: " + data.date + "\nTime: " + data.time +
      (data.serviceType === 'home' ? "\nHome Address: " + data.address : '') +
      "\n\nTerms accepted: Yes"
    );
    var email = (window.__siteConfig && window.__siteConfig.contact.email) || 'Jacqueskatumbulu@gmail.com';
    window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (terms && !terms.checked) {
      terms.focus();
      terms.setAttribute('aria-invalid', 'true');
      return;
    }
    if (terms) terms.removeAttribute('aria-invalid');

    var fd = new FormData(form);
    var payload = {
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      serviceType: fd.get('service-type'),
      service: fd.get('service'),
      date: fd.get('date'),
      time: fd.get('time'),
      address: fd.get('address') || ''
    };

    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (r.ok) return r.json();
        throw new Error('server');
      })
      .then(function () { showSuccess(); })
      .catch(function () {
        showSuccess();
        mailtoFallback(payload);
      });
  });
})();
