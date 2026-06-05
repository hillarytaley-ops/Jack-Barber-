(function () {
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  const navOverlay = document.getElementById('nav-overlay');

  function setNavOpen(isOpen) {
    if (!siteNav || !navToggle) return;
    siteNav.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-open', isOpen);
    if (navOverlay) {
      navOverlay.hidden = !isOpen;
      navOverlay.classList.toggle('is-visible', isOpen);
      navOverlay.setAttribute('aria-hidden', String(!isOpen));
    }
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      setNavOpen(!siteNav.classList.contains('is-open'));
    });

    if (navOverlay) {
      navOverlay.addEventListener('click', function () {
        setNavOpen(false);
      });
    }

    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setNavOpen(false);
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href === '#') return;
      var targetId = href.split('?')[0];
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        if (href.indexOf('?') !== -1) {
          history.replaceState(null, '', href);
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    window.addEventListener('scroll', function () {
      siteHeader.classList.toggle('is-scrolled', window.scrollY > 12);
    }, { passive: true });
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const staggerParents = [
    '.roots-features',
    '.services-grid',
    '.gallery-grid',
    '.process-steps',
    '.extras-grid',
    '.faq-list'
  ];

  document.querySelectorAll('.section-header').forEach(function (el) {
    el.classList.add('reveal');
  });

  document.querySelectorAll('.roots-story').forEach(function (el) {
    el.classList.add('reveal', 'reveal-left');
  });

  document.querySelectorAll('.roots-quote').forEach(function (el) {
    el.classList.add('reveal');
  });

  document.querySelectorAll(
    '.feature-card, .service-card, .gallery-item, .home-service-card, ' +
    '.process-step, .extra-card, .faq-item, .visit-info, .visit-map, .policy-panel, .booking-panel'
  ).forEach(function (el) {
    el.classList.add('reveal');

    const parent = el.parentElement;
    if (parent && staggerParents.some(function (sel) { return parent.matches(sel); })) {
      const index = Array.prototype.indexOf.call(parent.children, el);
      el.style.setProperty('--reveal-delay', (index * 0.08) + 's');
    }
  });

  document.querySelectorAll('.feature-card').forEach(function (el) {
    el.classList.add('reveal-right');
  });

  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -2% 0px'
  });

  function revealIfInView(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < vh * 0.95 && rect.bottom > vh * 0.05) {
      el.classList.add('is-visible');
      return true;
    }
    return false;
  }

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function (el) {
    if (!revealIfInView(el)) {
      revealObserver.observe(el);
    }
  });

  window.addEventListener('load', function () {
    document.querySelectorAll('.reveal:not(.is-visible), .reveal-left:not(.is-visible), .reveal-right:not(.is-visible)').forEach(function (el) {
      revealIfInView(el);
    });
  });
})();
