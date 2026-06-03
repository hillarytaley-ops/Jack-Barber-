(function () {
  if (localStorage.getItem('jbs_admin_token')) {
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
        username: form.username.value,
        password: form.password.value
      })
    })
      .catch(function () {
        throw new Error('Failed to fetch');
      })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.data.error || 'Login failed');
        localStorage.setItem('jbs_admin_token', res.data.token);
        window.location.href = 'dashboard.html';
      })
      .catch(function (err) {
        if (err.message.indexOf('fetch') !== -1 || err.message === 'Failed to fetch') {
          errorEl.textContent = 'Server is not running. Double-click START-SERVER.bat first, then try again.';
        } else {
          errorEl.textContent = err.message;
        }
        errorEl.hidden = false;
      });
  });
})();
