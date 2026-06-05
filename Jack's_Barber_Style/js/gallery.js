(function () {
  function initGallery() {
    document.querySelectorAll('.style-card img[data-fallback]').forEach(function (img) {
      img.addEventListener('error', function () {
        if (img.dataset.fallback && img.src.indexOf(img.dataset.fallback) === -1) {
          img.src = img.dataset.fallback;
        }
      });
    });

    var lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox) return;

    var lightboxFigure = lightbox.querySelector('.lightbox-figure');
    var lightboxImg = lightbox.querySelector('.lightbox-img');
    var lightboxCaption = lightbox.querySelector('.lightbox-caption');
    var lightboxBook = lightbox.querySelector('.lightbox-book');
    var closeBtn = lightbox.querySelector('.lightbox-close');

    function openLightbox(src, alt, caption, crop) {
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      lightboxCaption.textContent = caption || '';

      if (crop && crop.cols && lightboxFigure) {
        lightboxFigure.classList.add('lightbox-figure--crop');
        lightboxFigure.style.setProperty('--hair-cols', crop.cols);
        lightboxFigure.style.setProperty('--hair-rows', crop.rows);
        lightboxFigure.style.setProperty('--col', crop.col);
        lightboxFigure.style.setProperty('--row', crop.row);
        lightboxImg.classList.add('lightbox-img--crop');
      } else if (lightboxFigure) {
        lightboxFigure.classList.remove('lightbox-figure--crop');
        lightboxFigure.style.removeProperty('--hair-cols');
        lightboxFigure.style.removeProperty('--hair-rows');
        lightboxFigure.style.removeProperty('--col');
        lightboxFigure.style.removeProperty('--row');
        lightboxImg.classList.remove('lightbox-img--crop');
      }

      if (lightboxBook) {
        if (crop && crop.service) {
          lightboxBook.href = '#book?service=' + encodeURIComponent(crop.service);
          lightboxBook.hidden = false;
        } else {
          lightboxBook.hidden = true;
        }
      }

      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.hidden = true;
      lightboxImg.src = '';
      lightboxImg.classList.remove('lightbox-img--crop');
      if (lightboxFigure) lightboxFigure.classList.remove('lightbox-figure--crop');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('.style-card .gallery-trigger').forEach(function (btn) {
      btn.onclick = function () {
        var img = btn.querySelector('img');
        var card = btn.closest('.style-card');
        var heading = card ? card.querySelector('.style-card-meta h3') : null;
        var caption = heading ? heading.textContent.replace(/\s*Signature\s*/i, '').trim() : img.alt;
        openLightbox(img.src, img.alt, caption, null);
      };
    });

    document.querySelectorAll('.hair-photo-trigger').forEach(function (btn) {
      btn.onclick = function () {
        var img = btn.querySelector('img');
        openLightbox(img.src, img.alt, btn.dataset.caption || img.alt, {
          service: btn.dataset.service || ''
        });
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
