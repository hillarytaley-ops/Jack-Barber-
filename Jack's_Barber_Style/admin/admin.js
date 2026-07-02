(function () {
  var token = localStorage.getItem('jbs_admin_token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  var settings = null;

  function showServerError() {
    var el = document.getElementById('server-alert');
    if (el) el.hidden = false;
  }

  function api(url, options) {
    options = options || {};
    var headers = Object.assign({
      Authorization: 'Bearer ' + token
    }, options.headers || {});
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    options.headers = headers;
    return fetch(url, options)
      .catch(function () {
        showServerError();
        throw new Error('Website services are offline. Run START-SERVER.bat on your computer, then refresh.');
      })
      .then(function (r) {
        if (r.status === 401) {
          localStorage.removeItem('jbs_admin_token');
          window.location.href = 'index.html';
          throw new Error('Session expired');
        }
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.error || 'Request failed');
          return d;
        });
      });
  }

  function money(n) {
    return '$' + Number(n || 0).toFixed(2);
  }

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* Navigation */
  document.querySelectorAll('.nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
      if (btn.dataset.panel === 'reports') loadReport();
      if (btn.dataset.panel === 'clients') loadBookings();
      if (btn.dataset.panel === 'finances') loadTransactions();
      if (btn.dataset.panel === 'gallery' && settings) {
        renderGalleryAdmin();
        renderGalleryPricesEditor();
      }
    });
  });

  document.getElementById('logout-btn').addEventListener('click', function () {
    api('/api/admin/logout', { method: 'POST' }).finally(function () {
      localStorage.removeItem('jbs_admin_token');
      window.location.href = 'index.html';
    });
  });

  /* Load settings */
  function loadSettings() {
    return api('/api/admin/settings').then(function (data) {
      settings = data;
      if (!Array.isArray(settings.gallery)) settings.gallery = [];
      try { renderContentForm(); } catch (err) { console.error('Content editor failed', err); }
      try { renderHoursEditor(); } catch (err) { console.error('Hours editor failed', err); }
      try { renderServicesEditor(); } catch (err) { console.error('Services editor failed', err); }
      try { renderHomeServiceEditor(); } catch (err) { console.error('Home service editor failed', err); }
      try { renderGalleryAdmin(); } catch (err) { console.error('Gallery admin failed', err); }
      try { renderClosedDates(); } catch (err) { console.error('Closed dates failed', err); }
    });
  }

  /* Overview */
  function loadOverview() {
    api('/api/admin/overview').then(function (data) {
      document.getElementById('overview-stats').innerHTML =
        statCard('Today', money(data.daily.totalRevenue), data.daily.transactionCount + ' payments') +
        statCard('This week', money(data.weekly.totalRevenue), data.weekly.bookingCount + ' bookings') +
        statCard('This month', money(data.monthly.totalRevenue), money(data.monthly.averageTicket) + ' avg') +
        statCard('Pending bookings', data.pendingBookings, data.totalBookings + ' total');
    });
  }

  function statCard(label, value, sub) {
    return '<div class="stat-card"><span>' + label + '</span><strong>' + value + '</strong><span>' + sub + '</span></div>';
  }

  /* Content editor */
  function renderContentForm() {
    var c = settings.contact;
    var h = settings.hero;
    var r = settings.roots || {};
    var paragraphs = r.paragraphs || ['', ''];
    document.getElementById('content-form').innerHTML =
      '<h3>Contact</h3>' +
      field('contact-phone', 'Phone', c.phone) +
      field('contact-phoneDisplay', 'Phone display', c.phoneDisplay) +
      field('contact-email', 'Email', c.email) +
      field('contact-address', 'Address', c.address) +
      field('contact-city', 'City', c.city) +
      '<h3>Social media</h3>' +
      field('social-facebook', 'Facebook page URL (full link)', (settings.social && settings.social.facebook) || '', false, 'https://www.facebook.com/yourpage') +
      field('social-tiktok', 'TikTok profile URL (full link)', (settings.social && settings.social.tiktok) || '', false, 'https://www.tiktok.com/@yourprofile') +
      '<p class="field-hint">WhatsApp uses your phone number automatically. Paste full Facebook and TikTok URLs — leave blank to hide those icons on the site.</p>' +
      '<h3>Hero</h3>' +
      field('hero-eyebrow', 'Eyebrow', h.eyebrow) +
      field('hero-title', 'Headline', h.title) +
      field('hero-lead', 'Lead text', h.lead, true) +
      '<h3>Our Roots</h3>' +
      field('roots-label', 'Section label', r.label) +
      field('roots-title', 'Section title', r.title) +
      field('roots-p1', 'Paragraph 1', paragraphs[0], true) +
      field('roots-p2', 'Paragraph 2', paragraphs[1], true) +
      field('roots-quote', 'Quote', r.quote);
  }

  function field(id, label, value, textarea, placeholder) {
    var v = (value || '').replace(/"/g, '&quot;');
    var ph = placeholder ? ' placeholder="' + placeholder.replace(/"/g, '&quot;') + '"' : '';
    if (textarea) {
      return '<label for="' + id + '">' + label + '</label><textarea id="' + id + '">' + (value || '') + '</textarea>';
    }
    return '<label for="' + id + '">' + label + '</label><input id="' + id + '" value="' + v + '"' + ph + '>';
  }

  function val(id) {
    return document.getElementById(id).value.trim();
  }

  document.getElementById('save-content-btn').addEventListener('click', function () {
    settings.contact.phone = val('contact-phone');
    settings.contact.phoneDisplay = val('contact-phoneDisplay');
    settings.contact.email = val('contact-email');
    settings.contact.address = val('contact-address');
    settings.contact.city = val('contact-city');
    if (!settings.social) settings.social = {};
    settings.social.facebook = val('social-facebook');
    settings.social.tiktok = val('social-tiktok');
    settings.hero.eyebrow = val('hero-eyebrow');
    settings.hero.title = val('hero-title');
    settings.hero.lead = val('hero-lead');
    settings.roots.label = val('roots-label');
    settings.roots.title = val('roots-title');
    settings.roots.paragraphs = [val('roots-p1'), val('roots-p2')];
    settings.roots.quote = val('roots-quote');
    api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
      .then(function () { alert('Content saved. Refresh the public site to see changes.'); });
  });

  /* Hours */
  function renderHoursEditor() {
    document.getElementById('hours-editor').innerHTML = settings.hours.schedule.map(function (row, i) {
      return '<div class="hours-row" data-idx="' + i + '">' +
        '<strong>' + row.label + '</strong>' +
        '<input type="time" class="hr-open" value="' + (row.open || '') + '" ' + (row.closed ? 'disabled' : '') + '>' +
        '<input type="time" class="hr-close" value="' + (row.close || '') + '" ' + (row.closed ? 'disabled' : '') + '>' +
        '<label><input type="checkbox" class="hr-closed" ' + (row.closed ? 'checked' : '') + '> Closed</label>' +
        '</div>';
    }).join('');

    document.querySelectorAll('.hours-row .hr-closed').forEach(function (checkbox) {
      checkbox.addEventListener('change', function () {
        var row = checkbox.closest('.hours-row');
        var closed = checkbox.checked;
        row.querySelector('.hr-open').disabled = closed;
        row.querySelector('.hr-close').disabled = closed;
      });
    });
  }

  function renderClosedDates() {
    var list = settings.hours.closedDates || [];
    document.getElementById('closed-dates-list').innerHTML = list.map(function (item, i) {
      var label = typeof item === 'string' ? item : item.date + (item.note ? ' — ' + item.note : '');
      var key = typeof item === 'string' ? item : item.date;
      return '<li><span>' + label + '</span><button type="button" class="btn btn-danger btn-sm" data-date="' + key + '">Remove</button></li>';
    }).join('');

    document.querySelectorAll('#closed-dates-list button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        settings.hours.closedDates = (settings.hours.closedDates || []).filter(function (item) {
          var d = typeof item === 'string' ? item : item.date;
          return d !== btn.dataset.date;
        });
        renderClosedDates();
      });
    });
  }

  document.getElementById('add-closed-date').addEventListener('click', function () {
    var date = document.getElementById('closed-date-input').value;
    var note = document.getElementById('closed-date-note').value.trim();
    if (!date) return;
    settings.hours.closedDates = settings.hours.closedDates || [];
    if (!settings.hours.closedDates.some(function (x) { return (x.date || x) === date; })) {
      settings.hours.closedDates.push(note ? { date: date, note: note } : date);
    }
    document.getElementById('closed-date-input').value = '';
    document.getElementById('closed-date-note').value = '';
    renderClosedDates();
  });

  document.getElementById('save-hours-btn').addEventListener('click', function () {
    document.querySelectorAll('.hours-row').forEach(function (row) {
      var i = Number(row.dataset.idx);
      settings.hours.schedule[i].open = row.querySelector('.hr-open').value;
      settings.hours.schedule[i].close = row.querySelector('.hr-close').value;
      settings.hours.schedule[i].closed = row.querySelector('.hr-closed').checked;
    });
    api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
      .then(function () { alert('Hours saved.'); });
  });

  /* Services */
  function escAttr(val) {
    return String(val || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function escHtml(val) {
    return String(val || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'service';
  }

  function collectServicesFromDOM() {
    return Array.from(document.querySelectorAll('#services-editor .service-row')).map(function (row) {
      var id = row.dataset.id;
      var existing = (settings.services || []).find(function (s) { return s.id === id; }) || {};
      return {
        id: id,
        name: row.querySelector('.svc-name').value.trim(),
        price: Number(row.querySelector('.svc-price').value) || 0,
        duration: Number(row.querySelector('.svc-duration').value) || 30,
        description: row.querySelector('.svc-desc').value.trim(),
        featured: row.querySelector('.svc-featured').checked,
        category: existing.category || ''
      };
    }).filter(function (s) { return s.name; });
  }

  function renderServicesEditor() {
    document.getElementById('services-editor').innerHTML = settings.services.map(function (s) {
      return '<div class="service-row" data-id="' + escAttr(s.id) + '">' +
        '<input class="svc-name" value="' + escAttr(s.name) + '" placeholder="Service name">' +
        '<input class="svc-price" type="number" min="0" step="1" value="' + s.price + '" placeholder="0">' +
        '<input class="svc-duration" type="number" min="5" step="5" value="' + s.duration + '" placeholder="30">' +
        '<input class="svc-desc" value="' + escAttr(s.description || '') + '" placeholder="Short description">' +
        '<label class="svc-featured-label"><input type="checkbox" class="svc-featured" ' + (s.featured ? 'checked' : '') + '> Featured</label>' +
        '<button type="button" class="btn btn-danger btn-sm remove-service" title="Remove service">&times;</button>' +
        '</div>';
    }).join('');

    document.querySelectorAll('.remove-service').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Remove this service?')) return;
        btn.closest('.service-row').remove();
      });
    });
  }

  document.getElementById('add-service-btn').addEventListener('click', function () {
    settings.services = collectServicesFromDOM();
    var newId = 'svc-' + Date.now();
    settings.services.push({
      id: newId,
      name: '',
      price: 50,
      duration: 30,
      description: '',
      featured: false
    });
    renderServicesEditor();
    var rows = document.querySelectorAll('#services-editor .service-row');
    var last = rows[rows.length - 1];
    if (last) last.querySelector('.svc-name').focus();
  });

  document.getElementById('save-services-btn').addEventListener('click', function () {
    var collected = collectServicesFromDOM();
    if (!collected.length) {
      alert('Add at least one service with a name.');
      return;
    }
    collected.forEach(function (s) {
      if (!s.id || s.id.indexOf('svc-') !== 0) {
        s.id = 'svc-' + slugify(s.name) + '-' + Date.now();
      }
    });
    if (collected.filter(function (s) { return s.featured; }).length > 1) {
      var first = true;
      collected.forEach(function (s) {
        if (s.featured && first) first = false;
        else if (s.featured) s.featured = false;
      });
    }
    settings.services = collected;
    api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
      .then(function () {
        renderServicesEditor();
        alert('Services saved. Refresh the public site to see updates.');
      });
  });

  /* Home Service */
  function renderHomeServiceEditor() {
    var hs = settings.homeService || {};
    var steps = (hs.steps || []).join('\n');
    document.getElementById('home-service-form').innerHTML =
      '<label><input type="checkbox" id="hs-enabled" ' + (hs.enabled !== false ? 'checked' : '') + '> Home service available for booking</label>' +
      field('hs-label', 'Section label', hs.label || 'We Come to You') +
      field('hs-title', 'Heading', hs.title || 'Home Service Haircut') +
      field('hs-lead', 'Introduction', hs.lead || '', true) +
      '<label for="hs-steps">Steps (one per line)</label><textarea id="hs-steps" rows="5">' + steps + '</textarea>' +
      field('hs-travelFee', 'Travel fee ($)', hs.travelFee != null ? hs.travelFee : 15) +
      field('hs-serviceArea', 'Service area', hs.serviceArea || '') +
      field('hs-coverageNote', 'Coverage note', hs.coverageNote || '', true) +
      field('hs-parkingNote', 'Parking note', hs.parkingNote || '', true) +
      field('hs-minNoticeHours', 'Minimum notice (hours)', hs.minNoticeHours != null ? hs.minNoticeHours : 24);
  }

  document.getElementById('save-home-service-btn').addEventListener('click', function () {
    settings.homeService = {
      enabled: document.getElementById('hs-enabled').checked,
      label: val('hs-label'),
      title: val('hs-title'),
      lead: val('hs-lead'),
      steps: val('hs-steps').split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
      travelFee: Number(val('hs-travelFee')) || 0,
      serviceArea: val('hs-serviceArea'),
      coverageNote: val('hs-coverageNote'),
      parkingNote: val('hs-parkingNote'),
      minNoticeHours: Number(val('hs-minNoticeHours')) || 24
    };
    api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
      .then(function () {
        alert('Home service settings saved. Refresh the public site to see changes.');
      });
  });

  /* Gallery */
  var GALLERY_EXTRA_SERVICE_LINKS = ['Afro Shape'];

  function serviceForGalleryLink(name) {
    if (name === 'Afro Shape') return serviceByName('Afro Cut');
    return serviceByName(name);
  }

  function galleryServiceOptionsHtml(selected) {
    var html = '';
    (settings.services || []).forEach(function (s) {
      var sel = s.name === selected ? ' selected' : '';
      html += '<option value="' + escAttr(s.name) + '"' + sel + '>' + escHtml(s.name) + '</option>';
    });
    GALLERY_EXTRA_SERVICE_LINKS.forEach(function (name) {
      if ((settings.services || []).some(function (s) { return s.name === name; })) return;
      var sel = name === selected ? ' selected' : '';
      html += '<option value="' + escAttr(name) + '"' + sel + '>' + escHtml(name) + '</option>';
    });
    return html;
  }

  function renderGalleryServiceSelect() {
    var select = document.getElementById('gallery-service-select');
    if (!select || !settings || !settings.services) return;
    select.innerHTML = '<option value="">Link to booking service (optional)</option>' +
      galleryServiceOptionsHtml('');
  }

  function renderGalleryEditServiceSelect(selected) {
    var select = document.getElementById('gallery-edit-service');
    if (!select || !settings || !settings.services) return;
    select.innerHTML = '<option value="">No linked service</option>' +
      galleryServiceOptionsHtml(selected);
  }

  function serviceByName(name) {
    return (settings.services || []).find(function (s) { return s.name === name; });
  }

  function renderGalleryPricesEditor() {
    var el = document.getElementById('gallery-prices-editor');
    if (!el || !settings || !settings.services) return;
    el.innerHTML = settings.services.map(function (s, index) {
      return '<div class="price-row" data-index="' + index + '">' +
        '<span class="price-row-name">' + escHtml(s.name) + '</span>' +
        '<input class="price-row-price" type="number" min="0" step="1" value="' + s.price + '" aria-label="Price for ' + escAttr(s.name) + '">' +
        '<input class="price-row-duration" type="number" min="5" step="5" value="' + s.duration + '" aria-label="Duration for ' + escAttr(s.name) + '">' +
        '</div>';
    }).join('');
  }

  function collectGalleryPricesFromDOM() {
    document.querySelectorAll('#gallery-prices-editor .price-row').forEach(function (row) {
      var index = Number(row.dataset.index);
      if (!settings.services[index]) return;
      settings.services[index].price = Number(row.querySelector('.price-row-price').value) || 0;
      settings.services[index].duration = Number(row.querySelector('.price-row-duration').value) || 30;
    });
  }

  document.getElementById('save-gallery-prices-btn').addEventListener('click', function () {
    collectGalleryPricesFromDOM();
    api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
      .then(function () {
        renderGalleryPricesEditor();
        renderGalleryAdmin();
        alert('Prices saved. Refresh the public site to see updates.');
      })
      .catch(function (err) { alert(err.message); });
  });

  function isUploadedPhoto(item) {
    var name = item && item.filename ? item.filename : '';
    return name && !/^photo-\d+\.svg$/i.test(name);
  }

  function galleryItemHtml(item) {
    var filename = item.filename || '';
    var src = item.src || (
      filename.startsWith('photo-') && filename.endsWith('.svg')
        ? '/assets/gallery/' + filename
        : filename
          ? '/api/gallery/' + encodeURIComponent(filename)
          : ''
    );
    var serviceNote = item.service ? '<small>Books: ' + escHtml(item.service) + '</small>' : '';
    var linked = item.service ? serviceForGalleryLink(item.service) : null;
    if (linked) {
      serviceNote += '<small>$' + linked.price + ' · ' + linked.duration + ' min</small>';
    }
    var badge = isUploadedPhoto(item) ? '' : '<small>Template placeholder</small>';
    return '<figure class="gallery-admin-item">' +
      (src ? '<img src="' + src + '" alt="">' : '<div class="gallery-admin-missing">No image file</div>') +
      '<figcaption>' + escHtml(item.caption || 'Untitled') + serviceNote + badge + '</figcaption>' +
      '<div class="gallery-admin-actions">' +
      '<button type="button" class="edit-gallery btn btn-secondary btn-sm" data-id="' + escAttr(item.id) + '">Edit</button>' +
      '<button type="button" class="del-gallery btn btn-danger btn-sm" data-id="' + escAttr(item.id) + '">Delete</button>' +
      '</div></figure>';
  }

  var galleryEditModal = document.getElementById('gallery-edit-modal');
  var galleryEditForm = document.getElementById('gallery-edit-form');
  var galleryEditCancel = document.getElementById('gallery-edit-cancel');

  function closeGalleryEditModal() {
    if (!galleryEditModal) return;
    galleryEditModal.hidden = true;
    if (galleryEditForm) galleryEditForm.reset();
  }

  function openGalleryEditModal(id) {
    if (!galleryEditModal || !galleryEditForm || !settings) return;
    var item = (settings.gallery || []).find(function (g) { return g.id === id; });
    if (!item) return;
    document.getElementById('gallery-edit-id').value = item.id;
    document.getElementById('gallery-edit-caption').value = item.caption || '';
    renderGalleryEditServiceSelect(item.service || '');
    galleryEditModal.hidden = false;
    document.getElementById('gallery-edit-caption').focus();
  }

  function saveGalleryEdit(e) {
    e.preventDefault();
    var id = document.getElementById('gallery-edit-id').value;
    var caption = document.getElementById('gallery-edit-caption').value.trim();
    var service = document.getElementById('gallery-edit-service').value;
    var fileInput = document.getElementById('gallery-edit-photo');
    var file = fileInput && fileInput.files[0];
    var submitBtn = galleryEditForm.querySelector('button[type=submit]');

    if (!id || !caption) return;
    if (submitBtn) submitBtn.disabled = true;

    function sendPatch(payload) {
      return api('/api/admin/gallery', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
        .then(function () {
          closeGalleryEditModal();
          return loadSettings();
        })
        .catch(function (err) {
          alert(err.message || 'Could not save changes.');
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    }

    var payload = { id: id, caption: caption, service: service };
    if (!file) {
      sendPatch(payload);
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      payload.image = reader.result;
      payload.filename = file.name;
      sendPatch(payload);
    };
    reader.onerror = function () {
      alert('Could not read the selected photo.');
      if (submitBtn) submitBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  if (galleryEditForm) {
    galleryEditForm.addEventListener('submit', saveGalleryEdit);
  }
  if (galleryEditCancel) {
    galleryEditCancel.addEventListener('click', closeGalleryEditModal);
  }
  if (galleryEditModal) {
    galleryEditModal.addEventListener('click', function (e) {
      if (e.target === galleryEditModal) closeGalleryEditModal();
    });
  }

  function deleteGalleryPhoto(id, btn) {
    if (!id) return;
    if (!confirm('Delete this photo?')) return;
    if (btn) btn.disabled = true;
    api('/api/admin/gallery', {
      method: 'DELETE',
      body: JSON.stringify({ id: id })
    })
      .then(function () { return loadSettings(); })
      .catch(function (err) {
        alert(err.message || 'Could not delete photo.');
        if (btn) btn.disabled = false;
      });
  }

  var galleryPanel = document.getElementById('panel-gallery');
  if (galleryPanel) {
    galleryPanel.addEventListener('click', function (e) {
      var editBtn = e.target.closest('.edit-gallery');
      if (editBtn) {
        openGalleryEditModal(editBtn.getAttribute('data-id'));
        return;
      }
      var btn = e.target.closest('.del-gallery');
      if (!btn) return;
      deleteGalleryPhoto(btn.getAttribute('data-id'), btn);
    });
  }

  function renderGalleryAdmin() {
    renderGalleryServiceSelect();
    renderGalleryPricesEditor();
    var uploadsEl = document.getElementById('gallery-admin-uploads');
    var templatesEl = document.getElementById('gallery-admin-templates');
    if (!uploadsEl || !settings) return;

    var all = Array.isArray(settings.gallery) ? settings.gallery : [];
    var uploads = all.filter(isUploadedPhoto);
    var templates = all.filter(function (item) { return !isUploadedPhoto(item); });

    if (uploads.length) {
      uploadsEl.innerHTML = uploads.map(galleryItemHtml).join('');
    } else {
      uploadsEl.innerHTML = '<p class="gallery-admin-empty">No uploaded photos yet. Add one with the form above — it will appear on the public Style Gallery.</p>';
    }

    if (templatesEl) {
      if (templates.length) {
        templatesEl.hidden = false;
        templatesEl.innerHTML = '<h3 class="gallery-admin-subheading">Built-in placeholders</h3>' +
          '<p class="gallery-admin-note">Default template images for service cards until real photos are uploaded.</p>' +
          '<div class="gallery-admin-grid">' + templates.map(galleryItemHtml).join('') + '</div>';
      } else {
        templatesEl.hidden = true;
        templatesEl.innerHTML = '';
      }
    }

  }

  document.getElementById('gallery-upload-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var fileInput = e.target.querySelector('input[type=file]');
    var captionInput = e.target.querySelector('input[name=caption]');
    var serviceInput = e.target.querySelector('select[name=service]');
    var file = fileInput.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      api('/api/admin/gallery', {
        method: 'POST',
        body: JSON.stringify({
          caption: captionInput.value,
          alt: captionInput.value,
          service: serviceInput ? serviceInput.value : '',
          filename: file.name,
          image: reader.result
        })
      }).then(function () {
        e.target.reset();
        loadSettings();
      }).catch(function (err) { alert(err.message); });
    };
    reader.readAsDataURL(file);
  });

  /* Bookings */
  function loadBookings() {
    api('/api/admin/bookings').then(function (rows) {
      document.querySelector('#bookings-table tbody').innerHTML = rows.map(function (b) {
        var payment = b.paymentStatus === 'paid'
          ? 'Paid' + (b.amount ? ' ($' + b.amount + ')' : '') + (b.invoiceNumber ? '<br><small>Invoice ' + b.invoiceNumber + '</small>' : '')
          : (b.paymentStatus || 'unpaid');
        if (b.paymentStatus !== 'paid') {
          payment += b.paymentChoice === 'shop'
            ? '<br><small class="tag-shop">Pay at shop · no priority</small>'
            : '<br><small class="tag-priority">Pay now · priority</small>';
        }
        var location = b.serviceType === 'home'
          ? (b.address || '—') + (b.travelFee ? '<br><small>Travel fee: $' + b.travelFee + '</small>' : '')
          : '47 O\'Meara St (in-shop)';
        var paid = b.paymentStatus === 'paid';
        return '<tr>' +
          '<td>' + fmtDate(b.createdAt) + '</td>' +
          '<td><strong>' + b.name + '</strong></td>' +
          '<td>' + b.phone + '<br>' + b.email + '</td>' +
          '<td>' + b.service + '<br><small>' + (b.serviceType === 'home' ? 'Home visit' : 'In-shop') + '</small></td>' +
          '<td>' + location + '</td>' +
          '<td>' + b.date + ' ' + b.time + '</td>' +
          '<td>' + payment + '</td>' +
          '<td><select class="status-select" data-id="' + b.id + '">' +
          ['pending', 'confirmed', 'completed', 'cancelled'].map(function (s) {
            return '<option value="' + s + '" ' + (b.status === s ? 'selected' : '') + '>' + s + '</option>';
          }).join('') + '</select></td>' +
          '<td class="booking-actions">' +
          (paid
            ? '<button type="button" class="btn btn-secondary btn-sm resend-invoice" data-id="' + b.id + '">Resend invoice</button>'
            : '<button type="button" class="btn btn-primary btn-sm mark-paid" data-id="' + b.id + '">Mark paid</button>') +
          ' <button type="button" class="btn btn-danger btn-sm del-booking" data-id="' + b.id + '">Delete</button>' +
          '</td>' +
          '</tr>';
      }).join('') || '<tr><td colspan="9">No bookings yet</td></tr>';

      document.querySelectorAll('.status-select').forEach(function (sel) {
        sel.addEventListener('change', function () {
          api('/api/admin/bookings', {
            method: 'PATCH',
            body: JSON.stringify({ id: sel.dataset.id, status: sel.value })
          });
        });
      });
      document.querySelectorAll('.mark-paid').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Mark this booking as paid? This records the payment and emails a tax invoice to the client.')) return;
          btn.disabled = true;
          api('/api/admin/bookings/mark-paid', {
            method: 'POST',
            body: JSON.stringify({ id: btn.dataset.id })
          }).then(function (result) {
            var msg = result.alreadyPaid ? 'Already marked paid.' : 'Payment recorded.';
            if (result.invoice && result.invoice.ok) msg += ' Tax invoice emailed.';
            else if (result.invoice && result.invoice.skipped) msg += ' (Invoice not sent: ' + result.invoice.reason + ')';
            else if (result.invoice && result.invoice.error) msg += ' (Invoice email failed — add RESEND_API_KEY on Vercel.)';
            alert(msg);
            loadBookings();
            loadTransactions();
            loadOverview();
          }).catch(function (err) {
            alert(err.message);
            btn.disabled = false;
          });
        });
      });
      document.querySelectorAll('.resend-invoice').forEach(function (btn) {
        btn.addEventListener('click', function () {
          btn.disabled = true;
          api('/api/admin/bookings/send-invoice', {
            method: 'POST',
            body: JSON.stringify({ id: btn.dataset.id, resend: true })
          }).then(function () {
            alert('Tax invoice sent.');
            loadBookings();
          }).catch(function (err) {
            alert(err.message);
            btn.disabled = false;
          });
        });
      });
      document.querySelectorAll('.del-booking').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (confirm('Delete booking?')) {
            api('/api/admin/bookings', {
              method: 'DELETE',
              body: JSON.stringify({ id: btn.dataset.id })
            }).then(loadBookings);
          }
        });
      });
    });
  }

  /* Transactions */
  function loadTransactions() {
    api('/api/admin/transactions').then(function (rows) {
      document.querySelector('#transactions-table tbody').innerHTML = rows.map(function (t) {
        return '<tr>' +
          '<td>' + t.date + '</td>' +
          '<td>' + (t.clientName || '—') + '</td>' +
          '<td>' + (t.service || '—') + '</td>' +
          '<td>' + money(t.amount) + '</td>' +
          '<td>' + (t.notes || '') + '</td>' +
          '<td><button type="button" class="btn btn-danger btn-sm del-txn" data-id="' + t.id + '">Delete</button></td></tr>';
      }).join('') || '<tr><td colspan="6">No payments recorded yet</td></tr>';

      document.querySelectorAll('.del-txn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (confirm('Delete transaction?')) {
            api('/api/admin/transactions', {
              method: 'DELETE',
              body: JSON.stringify({ id: btn.dataset.id })
            }).then(loadTransactions);
          }
        });
      });
    });
  }

  document.getElementById('transaction-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    api('/api/admin/transactions', {
      method: 'POST',
      body: JSON.stringify({
        date: fd.get('date'),
        amount: fd.get('amount'),
        service: fd.get('service'),
        clientName: fd.get('clientName'),
        notes: fd.get('notes')
      })
    }).then(function () {
      e.target.reset();
      loadTransactions();
      loadOverview();
    });
  });

  /* Reports */
  function loadReport() {
    var period = document.getElementById('report-period').value;
    api('/api/admin/reports?period=' + period).then(function (report) {
      var services = Object.keys(report.byService).map(function (k) {
        return '<tr><td>' + k + '</td><td>' + money(report.byService[k]) + '</td></tr>';
      }).join('');

      document.getElementById('report-output').innerHTML =
        '<h3>' + report.period.charAt(0).toUpperCase() + report.period.slice(1) + ' Report</h3>' +
        '<p>' + report.from + ' to ' + report.to + '</p>' +
        '<div class="report-summary">' +
        '<div><span>Total revenue</span><strong>' + money(report.summary.totalRevenue) + '</strong></div>' +
        '<div><span>Payments</span><strong>' + report.summary.transactionCount + '</strong></div>' +
        '<div><span>Bookings</span><strong>' + report.summary.bookingCount + '</strong></div>' +
        '<div><span>Avg ticket</span><strong>' + money(report.summary.averageTicket) + '</strong></div>' +
        '</div>' +
        '<h4>Revenue by service</h4>' +
        '<table class="admin-table"><thead><tr><th>Service</th><th>Amount</th></tr></thead><tbody>' +
        (services || '<tr><td colspan="2">No payments in this period</td></tr>') +
        '</tbody></table>' +
        '<h4 style="margin-top:1.5rem">Bookings in period</h4>' +
        '<table class="admin-table"><thead><tr><th>Client</th><th>Phone</th><th>Service</th><th>Appt</th></tr></thead><tbody>' +
        (report.bookings.map(function (b) {
          return '<tr><td>' + b.name + '</td><td>' + b.phone + '</td><td>' + b.service + '</td><td>' + b.date + '</td></tr>';
        }).join('') || '<tr><td colspan="4">No bookings</td></tr>') +
        '</tbody></table>';
    });
  }

  document.getElementById('report-period').addEventListener('change', loadReport);
  document.getElementById('print-report').addEventListener('click', function () { window.print(); });

  /* Password & security status */
  function loadSecurityStatus() {
    var el = document.getElementById('security-status');
    if (!el) return;
    api('/api/admin/security-status').then(function (s) {
      var items = [
        statusRow('Live admin password (ADMIN_PASSWORD on Vercel)', s.adminPasswordConfigured, 'Set by your developer before first login'),
        statusRow('Email reminders (RESEND_API_KEY)', s.remindersConfigured, 'Required for tax invoices and appointment reminders'),
        statusRow('PayID payments (PAYID on Vercel)', s.payIdConfigured, 'Required for online PayID instructions')
      ];
      el.innerHTML = '<div class="security-status-grid">' + items.join('') + '</div>';
    }).catch(function () {
      el.innerHTML = '';
    });
  }

  function statusRow(label, ok, hint) {
    return '<div class="security-status-row ' + (ok ? 'is-ok' : 'is-pending') + '">' +
      '<span class="security-status-dot">' + (ok ? 'OK' : '!') + '</span>' +
      '<div><strong>' + label + '</strong><br><small>' + hint + '</small></div></div>';
  }

  document.getElementById('password-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    api('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: fd.get('currentPassword'),
        newPassword: fd.get('newPassword')
      })
    }).then(function () {
      document.getElementById('password-msg').textContent = 'Password updated successfully.';
      e.target.reset();
    }).catch(function (err) {
      document.getElementById('password-msg').textContent = err.message;
    });
  });

  /* Init */
  loadSettings()
    .then(function () {
      loadOverview();
      loadBookings();
      loadTransactions();
      loadSecurityStatus();
    })
    .catch(function () { /* server alert already shown */ });
})();
