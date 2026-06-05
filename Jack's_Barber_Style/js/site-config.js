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
    var rootLead = document.querySelector('.roots-lead');
    if (rootLead && r.paragraphs) {
      rootLead.textContent = r.paragraphs.join(' ');
    }

    var hoursEl = document.querySelector('.visit-details li:first-child span:last-child');
    if (hoursEl && cfg.hoursDisplay) {
      hoursEl.innerHTML = cfg.hoursDisplay.map(function (row) {
        return row.label + ': ' + row.text;
      }).join('<br>');
    }

    renderStyleGallery(cfg.services, cfg.gallery);
    renderHomeService(cfg.homeService);
    populateServiceSelect(cfg.services);

    window.__siteConfig = cfg;
    document.dispatchEvent(new CustomEvent('site-config-loaded'));
  }

  var SERVICE_IMAGE_CAPTIONS = {
    'Afro Cut': 'Afro Shape',
    'Skin Fade': 'Skin Fade',
    'Taper Fade': 'Skin Fade',
    'Scissor Cut': 'Afro Shape',
    'Twists & Retwist': 'Afro Shape',
    'Beard Trim & Shape': 'Beard Trim',
    'Blade Line-Up': 'Line-Up',
    'Hair Design': 'Hair Design'
  };

  var FALLBACK_IMAGES = [
    'assets/gallery/photo-2.svg',
    'assets/gallery/photo-1.svg',
    'assets/gallery/photo-1.svg',
    'assets/gallery/photo-2.svg',
    'assets/gallery/photo-2.svg',
    'assets/gallery/photo-5.svg',
    'assets/gallery/photo-3.svg',
    'assets/gallery/photo-4.svg'
  ];

  function imageForService(service, gallery, index) {
    var caption = SERVICE_IMAGE_CAPTIONS[service.name];
    if (gallery && caption) {
      var hit = gallery.find(function (g) { return g.caption === caption; });
      if (hit) return { src: hit.src, alt: hit.alt || service.name };
    }
    if (gallery && gallery[index]) {
      return { src: gallery[index].src, alt: gallery[index].alt || service.name };
    }
    return {
      src: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
      alt: service.name
    };
  }

  function renderStyleGallery(services, gallery) {
    var grid = document.getElementById('gallery');
    if (!grid || !services) return;

    grid.innerHTML = services.map(function (s, index) {
      var img = imageForService(s, gallery, index);
      var featured = s.featured;
      return '<article class="style-card' + (featured ? ' style-card--featured' : '') + '">' +
        '<figure class="style-card-media">' +
        '<button type="button" class="gallery-trigger">' +
        '<img src="' + img.src + '" alt="' + img.alt.replace(/"/g, '&quot;') + '" loading="lazy">' +
        '</button></figure>' +
        '<div class="style-card-footer">' +
        '<div class="style-card-meta">' +
        '<h3>' + s.name + (featured ? ' <span class="service-badge">Signature</span>' : '') + '</h3>' +
        '<p class="style-card-price">From <strong>$' + s.price + '</strong> · ' + s.duration + ' min</p>' +
        '</div>' +
        '<a class="btn btn-outline-light btn-sm" href="#book">Book</a>' +
        '</div></article>';
    }).join('');
  }

  function renderHomeService(hs) {
    var section = document.getElementById('home-service');
    if (!section || !hs) return;

    if (hs.enabled === false) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    var label = document.getElementById('home-service-label');
    var heading = document.getElementById('home-service-heading');
    var lead = document.getElementById('home-service-lead');
    var stepsEl = document.getElementById('home-service-steps');
    var info = document.getElementById('home-service-info');
    var coverage = document.getElementById('home-service-coverage');

    if (label && hs.label) label.textContent = hs.label;
    if (heading && hs.title) heading.textContent = hs.title;
    if (lead && hs.lead) lead.textContent = hs.lead;

    if (stepsEl && hs.steps && hs.steps.length) {
      stepsEl.innerHTML = hs.steps.map(function (step, i) {
        return '<li class="home-step-card"><span class="step-num">' + (i + 1) + '</span><p>' + step + '</p></li>';
      }).join('');
    }

    if (info) {
      var fee = Number(hs.travelFee) || 0;
      info.innerHTML =
        '<article class="home-info-card"><strong>Travel fee</strong><span>$' + fee + ' added to every home visit</span></article>' +
        '<article class="home-info-card"><strong>Service area</strong><span>' + (hs.serviceArea || 'Wodonga area') + '</span></article>' +
        '<article class="home-info-card"><strong>Parking</strong><span>' + (hs.parkingNote || '') + '</span></article>';
    }

    if (coverage && hs.coverageNote) coverage.textContent = hs.coverageNote;
  }

  function populateServiceSelect(services) {
    var select = document.getElementById('service');
    if (!select || !services) return;
    select.innerHTML = '<option value="">Select a service</option>' +
      services.map(function (s) {
        return '<option value="' + s.name.replace(/"/g, '&quot;') + '">' + s.name + '</option>';
      }).join('');
  }

  fetch('/api/public/config')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(applyConfig)
    .catch(function () { /* static fallback — existing HTML stays */ });
})();
