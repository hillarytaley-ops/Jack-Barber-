(function () {
  function formatTime(t) {
    if (!t) return '';
    var p = t.split(':');
    var h = parseInt(p[0], 10);
    var m = p[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    var hour = h % 12 || 12;
    return hour + ':' + m + ' ' + ampm;
  }

  function applyConfig(cfg) {
    if (!cfg) return;

    var c = cfg.contact;
    document.querySelectorAll('[data-config="phone"]').forEach(function (el) {
      el.href = 'tel:+61' + c.phone.replace(/^0/, '');
      el.textContent = c.phoneDisplay || c.phone;
    });
    document.querySelectorAll('[data-config="email"]').forEach(function (el) {
      el.href = 'mailto:' + c.email;
      el.textContent = c.email;
    });
    document.querySelectorAll('[data-config="address"]').forEach(function (el) {
      el.innerHTML = c.address + '<br>' + c.city + (c.country ? '<br>' + c.country : '');
    });

    var brand = cfg.brand;
    var brandName = document.querySelector('.brand-name');
    var brandTag = document.querySelector('.brand-tag');
    if (brandName && brand) brandName.textContent = brand.name;
    if (brandTag && brand) brandTag.textContent = brand.tagline;

    var h = cfg.hero;
    var eyebrow = document.querySelector('.hero-eyebrow');
    var heading = document.getElementById('hero-heading');
    var lead = document.querySelector('.hero-lead');
    if (eyebrow) eyebrow.textContent = h.eyebrow;
    if (heading) heading.textContent = h.title;
    if (lead) lead.textContent = h.lead;

    if (h.stats && document.querySelector('.hero-stats')) {
      document.querySelector('.hero-stats').innerHTML = h.stats.map(function (s) {
        return '<li><strong>' + s.label + '</strong><span>' + s.sub + '</span></li>';
      }).join('');
    }

    var r = cfg.roots;
    var rootsLabel = document.querySelector('#roots .section-label');
    var rootsTitle = document.getElementById('roots-heading');
    if (rootsLabel) rootsLabel.textContent = r.label;
    if (rootsTitle) rootsTitle.textContent = r.title;
    var rootPs = document.querySelectorAll('.roots-story p');
    if (rootPs[0]) rootPs[0].textContent = r.paragraphs[0];
    if (rootPs[1]) rootPs[1].textContent = r.paragraphs[1];
    var quote = document.querySelector('.roots-quote p');
    if (quote) quote.textContent = '"' + r.quote + '"';

    var hoursEl = document.querySelector('.visit-details li:first-child span:last-child');
    if (hoursEl && cfg.hoursDisplay) {
      hoursEl.innerHTML = cfg.hoursDisplay.map(function (row) {
        return row.label + ': ' + row.text;
      }).join('<br>');
    }

    renderServices(cfg.services);
    renderGallery(cfg.gallery);
    populateServiceSelect(cfg.services);

    window.__siteConfig = cfg;
    document.dispatchEvent(new CustomEvent('site-config-loaded'));
  }

  function renderServices(services) {
    var grid = document.querySelector('.services-grid');
    if (!grid || !services) return;

    grid.innerHTML = services.map(function (s) {
      if (s.featured) {
        return '<article class="service-card service-featured">' +
          '<span class="service-badge">Signature</span>' +
          '<h3>' + s.name + '</h3>' +
          '<p class="service-desc">' + s.description + '</p>' +
          '<p class="service-price">From <strong>$' + s.price + '</strong></p>' +
          '<a class="btn btn-primary btn-sm" href="#book">Book ' + s.name + '</a></article>';
      }
      return '<article class="service-card">' +
        '<h3>' + s.name + '</h3>' +
        '<p class="service-desc">' + s.description + '</p>' +
        '<p class="service-meta">' + s.duration + ' min · From <strong>$' + s.price + '</strong></p>' +
        '<a class="btn btn-outline-light btn-sm" href="#book">Book</a></article>';
    }).join('');
  }

  function renderGallery(items) {
    var grid = document.getElementById('gallery-grid');
    if (!grid || !items) return;

    grid.innerHTML = items.map(function (item) {
      return '<figure class="gallery-item">' +
        '<button type="button" class="gallery-trigger">' +
        '<img src="' + item.src + '" alt="' + item.alt + '" loading="lazy">' +
        '</button><figcaption>' + item.caption + '</figcaption></figure>';
    }).join('');
  }

  function populateServiceSelect(services) {
    var select = document.getElementById('service');
    if (!select || !services) return;
    select.innerHTML = '<option value="">Select a service</option>' +
      services.map(function (s) {
        return '<option>' + s.name + '</option>';
      }).join('');
  }

  fetch('/api/public/config')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(applyConfig)
    .catch(function () { /* static fallback — existing HTML stays */ });
})();
