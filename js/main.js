(function () {
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  const navOverlay = document.getElementById('nav-overlay');
  const siteTop = document.querySelector('.site-top');

  function setNavOpen(isOpen) {
    if (!siteNav || !navToggle) return;
    siteNav.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-open', isOpen);
    if (siteTop) {
      siteTop.classList.toggle('is-nav-open', isOpen);
    }
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

  if (siteTop) {
    window.addEventListener('scroll', function () {
      siteTop.classList.toggle('is-scrolled', window.scrollY > 12);
    }, { passive: true });
  }

  function initServiceTabs() {
    var tabs = document.getElementById('service-tabs');
    var list = document.getElementById('service-price-list');
    if (!tabs || !list || tabs.dataset.bound) return;
    tabs.dataset.bound = '1';

    tabs.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (!tab) return;
      tabs.querySelectorAll('[data-tab]').forEach(function (btn) {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      var category = tab.dataset.tab;
      list.querySelectorAll('.service-price-row').forEach(function (row) {
        row.hidden = category !== 'all' && row.dataset.category !== category;
      });
    });
  }

  function initNavScrollSpy() {
    if (!siteNav || siteNav.dataset.spyBound) return;
    siteNav.dataset.spyBound = '1';

    var links = Array.prototype.slice.call(siteNav.querySelectorAll('a[href^="#"]'));
    var sections = links.map(function (link) {
      var id = link.getAttribute('href').split('?')[0];
      var el = document.querySelector(id);
      return el ? { link: link, el: el } : null;
    }).filter(Boolean);

    if (!sections.length) return;

    function setActive(link) {
      links.forEach(function (l) { l.classList.remove('is-active'); });
      if (link) link.classList.add('is-active');
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var hit = sections.find(function (s) { return s.el === entry.target; });
        if (hit) setActive(hit.link);
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

    sections.forEach(function (s) { observer.observe(s.el); });
  }

  function initMobileActionBar() {
    var bar = document.getElementById('mobile-action-bar');
    if (!bar || bar.dataset.bound) return;
    bar.dataset.bound = '1';
    if (window.matchMedia('(max-width: 768px)').matches) {
      document.body.classList.add('has-mobile-bar');
    }
  }

  function initRevealAnimations() {
    if (document.body.dataset.revealInit) return;
    document.body.dataset.revealInit = '1';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const staggerParents = [
      '.roots-pillars',
      '.service-price-list',
      '.hairstyle-gallery',
      '.home-steps-cards',
      '.home-info-cards',
      '.process-steps',
      '.extras-grid',
      '.testimonials-grid'
    ];

    document.querySelectorAll('.section-header').forEach(function (el) {
      el.classList.add('reveal');
    });

    document.querySelectorAll(
      '.feature-card, .service-price-row, .hair-photo, .home-step-card, .home-info-card, ' +
      '.process-step, .extra-card, .visit-card, .booking-panel, .testimonial-card, ' +
      '.meet-jack-photo, .meet-jack-copy, .featured-cut-inner'
    ).forEach(function (el) {
      el.classList.add('reveal');

      const parent = el.parentElement;
      if (parent && staggerParents.some(function (sel) { return parent.matches(sel); })) {
        const index = Array.prototype.indexOf.call(parent.children, el);
        el.style.setProperty('--reveal-delay', (index * 0.08) + 's');
      }
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
  }

  function initPageEnhancements() {
    initServiceTabs();
    initNavScrollSpy();
    initMobileActionBar();
    initRevealAnimations();
  }

  initPageEnhancements();
  document.addEventListener('site-config-loaded', initPageEnhancements);
})();
