(function () {
  if (localStorage.getItem('jbs_admin_token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  var form = document.getElementById('login-form');
  var errorEl = document.getElementById('login-error');
  var hostNotice = document.getElementById('host-notice');
  var submitBtn = form.querySelector('button[type="submit"]');
  var apiAvailable = false;

  function staticHostMessage() {
    return 'This website is static-only (no backend API). Admin login is not available here. ' +
      'On your PC: double-click START-SERVER.bat, then open http://localhost:3000/admin/ ' +
      '(login: admin / JackStyle2026). For online admin, deploy this project to Render.com using render.yaml.';
  }

  function offlineMessage() {
    return 'Server is not running. Double-click START-SERVER.bat on your PC, then open http://localhost:3000/admin/';
  }

  function showStaticNotice() {
    if (hostNotice) hostNotice.hidden = false;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Admin unavailable on this host';
    }
    form.querySelectorAll('input').forEach(function (input) {
      input.disabled = true;
    });
  }

  function probeApi() {
    return fetch('/api/public/config', { method: 'GET', cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('missing');
        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('json') === -1) throw new Error('not json');
        return r.json();
      })
      .then(function () {
        apiAvailable = true;
      })
      .catch(function () {
        apiAvailable = false;
        showStaticNotice();
        if (window.location.protocol === 'file:') {
          errorEl.textContent = offlineMessage();
          errorEl.hidden = false;
        }
      });
  }

  if (window.location.protocol === 'file:') {
    showStaticNotice();
  } else {
    probeApi();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    if (!apiAvailable) {
      errorEl.textContent = staticHostMessage();
      errorEl.hidden = false;
      return;
    }

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.value,
        password: form.password.value
      })
    })
      .catch(function () {
        throw new Error('Failed to fetch');
      })
      .then(function (r) {
        return r.text().then(function (text) {
          var data;
          try {
            data = JSON.parse(text);
          } catch (err) {
            throw new Error(r.status === 404 ? staticHostMessage() : offlineMessage());
          }
          return { ok: r.ok, status: r.status, data: data };
        });
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.data.error || 'Login failed');
        localStorage.setItem('jbs_admin_token', res.data.token);
        window.location.href = 'dashboard.html';
      })
      .catch(function (err) {
        errorEl.textContent = err.message === 'Failed to fetch' ? offlineMessage() : err.message;
        errorEl.hidden = false;
      });
  });
})();
