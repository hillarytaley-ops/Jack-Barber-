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

  function formatHoursCompact(rows) {
    if (!rows || !rows.length) return '';
    var groups = [];
    var i = 0;
    while (i < rows.length) {
      var text = rows[i].text;
      var start = rows[i].label;
      var end = start;
      var j = i + 1;
      while (j < rows.length && rows[j].text === text) {
        end = rows[j].label;
        j++;
      }
      var label = start === end
        ? start.slice(0, 3)
        : start.slice(0, 3) + '–' + end.slice(0, 3);
      groups.push(label + ': ' + text);
      i = j;
    }
    return groups.join('<br>');
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

    var social = cfg.social || {};
    var phoneDigits = String(c.phone || '').replace(/\D/g, '');
    if (phoneDigits.charAt(0) === '0') phoneDigits = phoneDigits.slice(1);
    var waMsg = encodeURIComponent("Hi, I'd like to book at Jack's Barber Style.");
    document.querySelectorAll('[data-config="social-whatsapp"]').forEach(function (el) {
      if (phoneDigits) {
        el.href = 'https://wa.me/61' + phoneDigits + '?text=' + waMsg;
      }
    });
    function applySocialLink(selector, url) {
      document.querySelectorAll(selector).forEach(function (el) {
        el.hidden = false;
        if (url) {
          el.href = url;
          el.removeAttribute('aria-disabled');
          el.style.pointerEvents = '';
          el.style.opacity = '';
        } else {
          el.href = '#';
          el.setAttribute('aria-disabled', 'true');
          el.style.pointerEvents = 'none';
          el.style.opacity = '0.55';
        }
      });
    }
    applySocialLink('[data-config="social-facebook"]', social.facebook);
    applySocialLink('[data-config="social-tiktok"]', social.tiktok);

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

    var hoursEl = document.querySelector('.visit-hours-text');
    if (hoursEl && cfg.hoursDisplay) {
      hoursEl.innerHTML = formatHoursCompact(cfg.hoursDisplay);
    }

    renderServicePriceList(cfg.services);
    renderHairstyleGallery(cfg.gallery, cfg.services);
    renderFeaturedCut(cfg.gallery, cfg.services);
    renderOpenBadge(cfg.hours);
    renderHomeService(cfg.homeService);
    populateServiceSelect(cfg.services);

    window.__siteConfig = cfg;
    document.dispatchEvent(new CustomEvent('site-config-loaded'));
  }

  var SERVICE_IMAGE_CAPTIONS = {
    'Afro Cut': 'Afro Shape',
    'Skin Fade': 'Skin Fade',
    'Taper Fade': 'Taper Fade',
    'Scissor Cut': 'Afro Shape',
    'Twists & Retwist': 'Afro Shape',
    'Beard Trim & Shape': 'Beard Trim',
    'Blade Line-Up': 'Line-Up',
    'Hair Design': 'Hair Design'
  };

  var GALLERY_BOOKING_ALIASES = {
    'Afro Shape': 'Afro Cut'
  };

  var FALLBACK_IMAGES = [
    'assets/gallery/photo-3.svg',
    'assets/gallery/photo-4.svg',
    'assets/gallery/photo-5.svg',
    'assets/gallery/photo-6.svg',
    'assets/gallery/photo-3.svg',
    'assets/gallery/photo-4.svg',
    'assets/gallery/photo-5.svg',
    'assets/gallery/photo-6.svg'
  ];

  function isTemplateGalleryItem(item) {
    if (!item) return false;
    var name = item.filename || item.src || '';
    return /photo-\d+\.svg/i.test(name);
  }

  function resolveBookingService(serviceLink) {
    if (!serviceLink) return '';
    return GALLERY_BOOKING_ALIASES[serviceLink] || serviceLink;
  }

  function findUploadedGalleryForService(serviceName, gallery) {
    if (!gallery || !gallery.length) return null;
    var uploaded = gallery.filter(isUploadedGalleryItem);

    var exactService = uploaded.find(function (g) { return g.service === serviceName; });
    if (exactService) return exactService;

    var exactCaption = uploaded.find(function (g) { return g.caption === serviceName; });
    if (exactCaption) return exactCaption;

    if (serviceName === 'Afro Cut') {
      return uploaded.find(function (g) {
        return g.service === 'Afro Shape' || g.caption === 'Afro Shape';
      }) || null;
    }

    if (serviceName === 'Skin Fade') {
      return uploaded.find(function (g) {
        var c = g.caption || '';
        return /skin\s*fade/i.test(c) && !/taper/i.test(c);
      }) || null;
    }

    if (serviceName === 'Taper Fade') {
      return uploaded.find(function (g) {
        var c = g.caption || '';
        return g.service === 'Taper Fade' || /taper\s*fade/i.test(c);
      }) || null;
    }

    var aliasCaption = SERVICE_IMAGE_CAPTIONS[serviceName];
    if (aliasCaption && aliasCaption !== serviceName) {
      return uploaded.find(function (g) {
        return g.caption === aliasCaption && !g.service;
      }) || null;
    }

    return null;
  }

  function galleryItemBookingKey(item, services) {
    var link = item.service || matchServiceByCaption(item.caption, services);
    return resolveBookingService(link) || item.caption || item.src || '';
  }

  function dedupeGalleryDisplayItems(items, services) {
    var seen = {};
    return items.filter(function (item) {
      var key = galleryItemBookingKey(item, services);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function imageForService(service, gallery, index) {
    var uploaded = findUploadedGalleryForService(service.name, gallery);
    if (uploaded) return { src: uploaded.src, alt: uploaded.alt || service.name };

    var caption = SERVICE_IMAGE_CAPTIONS[service.name];
    if (gallery && caption) {
      var hit = gallery.find(function (g) {
        return g.caption === caption && !isTemplateGalleryItem(g);
      });
      if (hit) return { src: hit.src, alt: hit.alt || service.name };
    }

    return {
      src: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
      alt: service.name
    };
  }

  function serviceLookup(services, name) {
    if (!name || !services) return null;
    return services.find(function (s) { return s.name === name; }) || null;
  }

  function renderServicePriceList(services) {
    var tabsEl = document.getElementById('service-tabs');
    var listEl = document.getElementById('service-price-list');
    if (!tabsEl || !listEl || !services) return;

    tabsEl.innerHTML = SERVICE_TABS.map(function (tab, i) {
      return '<button type="button" class="service-tab' + (i === 0 ? ' is-active' : '') + '" role="tab" data-tab="' + tab.id + '" aria-selected="' + (i === 0 ? 'true' : 'false') + '">' + tab.label + '</button>';
    }).join('');

    listEl.innerHTML = services.map(function (s) {
      var cat = s.category || 'other';
      var badge = s.featured ? ' <span class="service-badge">Signature</span>' : '';
      var desc = s.description
        ? '<p class="service-price-row__desc">' + s.description.replace(/</g, '&lt;') + '</p>'
        : '';
      return '<article class="service-price-row" role="listitem" data-category="' + cat + '">' +
        '<div class="service-price-row__info">' +
        '<h3 class="service-price-row__name">' + s.name + badge + '</h3>' +
        desc +
        '</div>' +
        '<span class="service-price-row__price">$' + s.price + '</span>' +
        '<span class="service-price-row__duration">' + s.duration + ' min</span>' +
        '<a class="btn btn-outline-light btn-sm service-price-row__book" href="#book?service=' + encodeURIComponent(s.name) + '">Book</a>' +
        '</article>';
    }).join('');
  }

  function renderFeaturedCut(gallery, services) {
    var section = document.getElementById('featured-cut');
    if (!section) return;

    var uploaded = dedupeGalleryDisplayItems(
      (gallery || []).filter(isUploadedGalleryItem),
      services
    );
    if (!uploaded.length) {
      section.hidden = true;
      return;
    }

    var pick = null;
    var featuredSvc = (services || []).find(function (s) { return s.featured; });
    if (featuredSvc) {
      pick = findUploadedGalleryForService(featuredSvc.name, gallery);
    }
    if (!pick) pick = uploaded[0];

    var bookName = resolveBookingService(
      pick.service || matchServiceByCaption(pick.caption, services)
    );
    var svc = serviceLookup(services, bookName);
    var nameEl = document.getElementById('featured-cut-name');
    var priceEl = document.getElementById('featured-cut-price');
    var imgEl = document.getElementById('featured-cut-img');
    var bookEl = document.getElementById('featured-cut-book');

    section.hidden = false;
    if (nameEl) nameEl.textContent = pick.caption || (svc && svc.name) || 'Featured style';
    if (priceEl) priceEl.textContent = svc ? '$' + svc.price + ' · ' + svc.duration + ' min' : '';
    if (imgEl) {
      imgEl.src = pick.src;
      imgEl.alt = pick.alt || pick.caption || 'Featured haircut';
    }
    if (bookEl && bookName) {
      bookEl.href = '#book?service=' + encodeURIComponent(bookName);
    }
  }

  function renderOpenBadge(hours) {
    var badge = document.getElementById('open-badge');
    if (!badge || !hours || !hours.schedule) return;

    var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    var now = new Date();
    var row = hours.schedule.find(function (r) { return r.id === days[now.getDay()]; });

    if (!row || row.closed) {
      badge.textContent = '· Closed today';
      badge.className = 'open-badge open-badge--closed';
      badge.hidden = false;
      return;
    }

    var parts = (row.open || '').split(':');
    var closeParts = (row.close || '').split(':');
    if (parts.length < 2 || closeParts.length < 2) return;

    var mins = now.getHours() * 60 + now.getMinutes();
    var openMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    var closeMins = parseInt(closeParts[0], 10) * 60 + parseInt(closeParts[1], 10);

    if (mins >= openMins && mins < closeMins) {
      badge.textContent = '· Open now';
      badge.className = 'open-badge open-badge--open';
    } else {
      badge.textContent = '· Closed now';
      badge.className = 'open-badge open-badge--closed';
    }
    badge.hidden = false;
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

  var DEFAULT_STYLE_LABELS = [
    { caption: 'Skin Fade', service: 'Skin Fade' },
    { caption: 'High-Top Fade', service: 'High-Top Fade' },
    { caption: 'Textured Afro', service: 'Afro Cut' },
    { caption: 'Hair Design', service: 'Hair Design' },
    { caption: '360 Waves', service: '360 Waves' },
    { caption: 'Buzz Cut & Line-Up', service: 'Buzz Cut & Line-Up' },
    { caption: 'Beard Trim & Fade', service: 'Beard Trim & Shape' },
    { caption: 'Taper Fade', service: 'Taper Fade' },
    { caption: 'Curly Mohawk', service: 'Curly Mohawk' },
    { caption: 'Scissor Cut', service: 'Scissor Cut' },
    { caption: 'Blade Line-Up', service: 'Blade Line-Up' },
    { caption: 'Twists & Retwist', service: 'Twists & Retwist' }
  ];

  function isUploadedGalleryItem(item) {
    if (!item || !item.src) return false;
    var name = item.filename || item.src;
    if (/photo-\d+\.svg/i.test(name)) return false;
    if (item.caption === 'The Shop') return false;
    return true;
  }

  function matchServiceByCaption(caption, services) {
    if (!caption || !services) return '';
    if (caption === 'Afro Shape') return 'Afro Cut';
    var exact = services.find(function (s) { return s.name === caption; });
    if (exact) return exact.name;
    var partial = services.find(function (s) {
      return caption.indexOf(s.name) !== -1 || s.name.indexOf(caption) !== -1;
    });
    return partial ? partial.name : '';
  }

  function renderHairstyleGallery(gallery, services) {
    var grid = document.getElementById('hairstyle-gallery');
    if (!grid) return;

    var uploaded = dedupeGalleryDisplayItems(
      (gallery || []).filter(isUploadedGalleryItem),
      services
    );
    var items;

    if (uploaded.length) {
      items = uploaded.map(function (item) {
        var serviceLink = item.service || matchServiceByCaption(item.caption, services);
        return {
          src: item.src,
          caption: item.caption,
          alt: item.alt || item.caption,
          service: resolveBookingService(serviceLink)
        };
      });
    } else if (services && services.length) {
      items = services.map(function (s, index) {
        return {
          src: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
          caption: s.name,
          alt: s.name,
          service: s.name
        };
      });
    } else {
      items = DEFAULT_STYLE_LABELS.map(function (entry, index) {
        return {
          src: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
          caption: entry.caption,
          alt: entry.caption,
          service: entry.service
        };
      });
    }

    grid.innerHTML = items.map(function (item) {
      var caption = item.caption || 'Style';
      var service = item.service || '';
      var alt = item.alt || caption;
      var svc = service ? serviceLookup(services, service) : null;
      var metaAttrs = svc
        ? ' data-price="' + svc.price + '" data-duration="' + svc.duration + '"'
        : '';
      return '<article class="hair-photo">' +
        '<button type="button" class="gallery-trigger hair-photo-trigger" data-caption="' + caption.replace(/"/g, '&quot;') + '" ' +
        (service ? 'data-service="' + service.replace(/"/g, '&quot;') + '"' : '') +
        metaAttrs + '>' +
        '<img src="' + item.src + '" alt="' + alt.replace(/"/g, '&quot;') + '" loading="lazy">' +
        '<span class="hair-photo-label">' + caption + (svc ? ' · $' + svc.price : '') + '</span>' +
        '</button></article>';
    }).join('');
  }

  var SERVICE_TABS = [
    { id: 'all', label: 'All' },
    { id: 'fades', label: 'Fades & Cuts' },
    { id: 'afro', label: 'Afro & Texture' },
    { id: 'design', label: 'Line-Up & Design' },
    { id: 'beard', label: 'Beard' }
  ];

  var SERVICE_GROUPS = [
    { label: 'Fades & Cuts', categories: ['fades'] },
    { label: 'Afro & Texture', categories: ['afro'] },
    { label: 'Line-Up & Design', categories: ['design'] },
    { label: 'Beard Grooming', categories: ['beard'] }
  ];

  function serviceOptionLabel(service) {
    return service.name + ' — $' + service.price + ' · ' + service.duration + ' min';
  }

  function populateServiceSelect(services) {
    var select = document.getElementById('service');
    if (!select || !services) return;

    var grouped = SERVICE_GROUPS.map(function (group) {
      var items = services.filter(function (s) {
        return group.categories.indexOf(s.category || '') !== -1;
      });
      if (!items.length) return '';
      return '<optgroup label="' + group.label + '">' +
        items.map(function (s) {
          return '<option value="' + s.name.replace(/"/g, '&quot;') + '">' + serviceOptionLabel(s) + '</option>';
        }).join('') +
        '</optgroup>';
    }).join('');

    var uncategorized = services.filter(function (s) {
      return !s.category || !SERVICE_GROUPS.some(function (g) {
        return g.categories.indexOf(s.category) !== -1;
      });
    });

    var fallback = uncategorized.map(function (s) {
      return '<option value="' + s.name.replace(/"/g, '&quot;') + '">' + serviceOptionLabel(s) + '</option>';
    }).join('');

    select.innerHTML = '<option value="">Choose a style service</option>' + grouped + fallback;
  }

  fetch('/api/public/config')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      applyConfig(cfg);
      if (!cfg) {
        renderHairstyleGallery(null, null);
      }
    })
    .catch(function () {
      renderHairstyleGallery(null, null);
    });
})();
