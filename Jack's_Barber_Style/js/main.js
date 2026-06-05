(function () {
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      const isOpen = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        siteNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
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
    threshold: 0.12,
    rootMargin: '0px 0px -5% 0px'
  });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function (el) {
    revealObserver.observe(el);
  });
})();
