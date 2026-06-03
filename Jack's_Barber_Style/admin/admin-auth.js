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
        localStorage.setItem('jbs_admin_token', res.data.token);
        window.location.href = 'dashboard.html';
      })
      .catch(function (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      });
  });
})();
