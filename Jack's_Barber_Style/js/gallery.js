(function () {
  function initGallery() {
    var lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox) return;

    var lightboxFigure = lightbox.querySelector('.lightbox-figure');
    var lightboxImg = lightbox.querySelector('.lightbox-img');
    var lightboxCaption = lightbox.querySelector('.lightbox-caption');
    var lightboxMeta = document.getElementById('lightbox-meta');
    var lightboxBook = lightbox.querySelector('.lightbox-book');
    var closeBtn = lightbox.querySelector('.lightbox-close');

    function openLightbox(src, alt, caption, options) {
      options = options || {};
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      lightboxCaption.textContent = caption || '';

      if (options.crop && options.crop.cols && lightboxFigure) {
        lightboxFigure.classList.add('lightbox-figure--crop');
        lightboxFigure.style.setProperty('--hair-cols', options.crop.cols);
        lightboxFigure.style.setProperty('--hair-rows', options.crop.rows);
        lightboxFigure.style.setProperty('--col', options.crop.col);
        lightboxFigure.style.setProperty('--row', options.crop.row);
        lightboxImg.classList.add('lightbox-img--crop');
      } else if (lightboxFigure) {
        lightboxFigure.classList.remove('lightbox-figure--crop');
        lightboxFigure.style.removeProperty('--hair-cols');
        lightboxFigure.style.removeProperty('--hair-rows');
        lightboxFigure.style.removeProperty('--col');
        lightboxFigure.style.removeProperty('--row');
        lightboxImg.classList.remove('lightbox-img--crop');
      }

      var service = options.service || (options.crop && options.crop.service) || '';
      var price = options.price || '';
      var duration = options.duration || '';

      if (lightboxMeta) {
        if (price && duration) {
          lightboxMeta.textContent = '$' + price + ' · ' + duration + ' min';
          lightboxMeta.hidden = false;
        } else {
          lightboxMeta.textContent = '';
          lightboxMeta.hidden = true;
        }
      }

      if (lightboxBook) {
        if (service) {
          lightboxBook.href = '#book?service=' + encodeURIComponent(service);
          lightboxBook.textContent = 'Book ' + service + (price ? ' — $' + price : '');
          lightboxBook.hidden = false;
        } else {
          lightboxBook.href = '#book';
          lightboxBook.textContent = 'Book an appointment';
          lightboxBook.hidden = false;
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
      if (lightboxMeta) lightboxMeta.hidden = true;
      document.body.style.overflow = '';
    }

    document.querySelectorAll('.hair-photo-trigger').forEach(function (btn) {
      btn.onclick = function () {
        var img = btn.querySelector('img');
        openLightbox(img.src, img.alt, btn.dataset.caption || img.alt, {
          service: btn.dataset.service || '',
          price: btn.dataset.price || '',
          duration: btn.dataset.duration || ''
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
