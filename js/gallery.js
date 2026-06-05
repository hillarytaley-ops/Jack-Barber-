(function () {
  function initGallery() {
    document.querySelectorAll('.style-card img[data-fallback]').forEach(function (img) {
      img.addEventListener('error', function () {
        if (img.dataset.fallback && img.src.indexOf(img.dataset.fallback) === -1) {
          img.src = img.dataset.fallback;
        }
      });
    });

    var gallery = document.getElementById('gallery');
    var lightbox = document.getElementById('gallery-lightbox');
    if (!gallery || !lightbox) return;

    var lightboxImg = lightbox.querySelector('.lightbox-img');
    var lightboxCaption = lightbox.querySelector('.lightbox-caption');
    var closeBtn = lightbox.querySelector('.lightbox-close');

    function openLightbox(src, alt, caption) {
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      lightboxCaption.textContent = caption;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.hidden = true;
      lightboxImg.src = '';
      document.body.style.overflow = '';
    }

    gallery.querySelectorAll('.gallery-trigger').forEach(function (btn) {
      btn.onclick = function () {
        var img = btn.querySelector('img');
        var title = btn.closest('.style-card');
        var heading = title ? title.querySelector('.style-card-meta h3') : null;
        var caption = heading ? heading.textContent.replace(/\s*Signature\s*/i, '').trim() : img.alt;
        openLightbox(img.src, img.alt, caption);
      };
    });

    closeBtn.onclick = closeLightbox;
    lightbox.onclick = function (e) { if (e.target === lightbox) closeLightbox(); };
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
  } else {
    initGallery();
  }
  document.addEventListener('site-config-loaded', initGallery);
})();
