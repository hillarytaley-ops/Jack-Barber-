(function () {
  if (localStorage.getItem('jbs_admin_token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  var form = document.getElementById('login-form');
  var errorEl = document.getElementById('login-error');
  var hostNotice = document.getElementById('host-notice');
  var isVercel = /\.vercel\.app$/i.test(window.location.hostname);

  if (hostNotice && (isVercel || window.location.protocol === 'file:')) {
    hostNotice.hidden = false;
  }

  function loginErrorMessage(status) {
    if (isVercel || status === 404) {
      return 'Admin login does not work on Vercel (static hosting only). ' +
        'Run START-SERVER.bat on your PC and open http://localhost:3000/admin/ — ' +
        'or deploy the full app to Render.com with render.yaml in this project.';
    }
    return 'Server is not running. Double-click START-SERVER.bat, then try again at http://localhost:3000/admin/';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    if (isVercel) {
      errorEl.textContent = loginErrorMessage(404);
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
            throw new Error(loginErrorMessage(r.status));
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
        if (err.message === 'Failed to fetch') {
          errorEl.textContent = loginErrorMessage(0);
        } else {
          errorEl.textContent = err.message;
        }
        errorEl.hidden = false;
      });
  });
})();
