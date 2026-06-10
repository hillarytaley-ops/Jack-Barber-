(function () {
  function storageGet(key) {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (err) {
      try { return sessionStorage.getItem(key); } catch (sessionErr) { return ''; }
    }
  }

  function storageSet(key, value) {
    var saved = false;
    try {
      localStorage.setItem(key, value);
      saved = true;
    } catch (err) {
      /* Mobile Safari private mode can block persistent storage. */
    }

    try {
      sessionStorage.setItem(key, value);
      saved = true;
    } catch (err) {
      /* The dashboard can still read the one-time hash fallback below. */
    }

    return saved;
  }

  if (storageGet('jbs_admin_token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  var form = document.getElementById('login-form');
  var errorEl = document.getElementById('login-error');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.elements.username.value,
        password: form.elements.password.value
      })
    })
      .catch(function () {
        throw new Error('Cannot reach server. Try again in a moment.');
      })
      .then(function (r) {
        return r.text().then(function (text) {
          var data;
          try {
            data = JSON.parse(text);
          } catch (err) {
            throw new Error('Server error — please refresh and try again.');
          }
          return { ok: r.ok, data: data };
        });
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.data.error || 'Login failed');
        var redirect = 'dashboard.html';
        if (!storageSet('jbs_admin_token', res.data.token)) {
          redirect += '#token=' + encodeURIComponent(res.data.token);
        }
        window.location.href = redirect;
      })
      .catch(function (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      });
  });
})();
