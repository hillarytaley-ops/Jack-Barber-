(function () {
  function initGallery() {
    document.querySelectorAll('.gallery-item img[data-fallback]').forEach(function (img) {
      img.addEventListener('error', function () {
        if (img.dataset.fallback && img.src.indexOf(img.dataset.fallback) === -1) {
          img.src = img.dataset.fallback;
        }
      });
    });

    var gallery = document.getElementById('gallery-grid');
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

    gallery.querySelectorAll('.gallery-item button').forEach(function (btn) {
      btn.onclick = function () {
        var img = btn.querySelector('img');
        var caption = btn.querySelector('.gallery-tag');
        openLightbox(img.src, img.alt, caption ? caption.textContent : img.alt);
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
