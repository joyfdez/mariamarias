/* ============================================================
   GALLERY.JS — shared by project.html and every real-content
   project page (.comp-gallery-interactive sections).

   - Drag: translate accumulates raw pointer delta since mousedown
     (this.startDx/startDy + movement), never re-derived from the
     element's static left/top. That static-position leak was the
     old bug: pieces further right/down drifted from the cursor
     because their CSS left/top got folded into the drag math.
   - Double-click opens a lightbox carousel over every piece in
     that gallery, in DOM order. Dragging is not wired up there —
     it's view-only.
   ============================================================ */
(function () {

  function buildLightbox(pieces) {
    const t = window.I18N ? window.I18N.t : function () { return ''; };
    const lb = document.createElement('div');
    lb.className = 'comp-gallery-lightbox';
    lb.innerHTML =
      `<button class="lightbox-close" aria-label="${t('gallery.close') || 'Close'}">&times;</button>` +
      `<button class="lightbox-prev" aria-label="${t('gallery.prevImage') || 'Previous image'}">&#8249;</button>` +
      '<div class="lightbox-stage"></div>' +
      `<button class="lightbox-next" aria-label="${t('gallery.nextImage') || 'Next image'}">&#8250;</button>`;
    document.body.appendChild(lb);

    const stage    = lb.querySelector('.lightbox-stage');
    const closeBtn = lb.querySelector('.lightbox-close');
    const prevBtn  = lb.querySelector('.lightbox-prev');
    const nextBtn  = lb.querySelector('.lightbox-next');
    let index = 0;

    function render() {
      stage.innerHTML = '';
      const piece = pieces[index];
      const src = piece.dataset.lightboxSrc;
      if (src) {
        const clone = document.createElement('img');
        clone.className = 'lightbox-image';
        clone.src = src;
        clone.alt = piece.dataset.lightboxAlt || '';
        stage.appendChild(clone);
        return;
      }
      const img = piece.querySelector('.gallery-piece__img');
      if (img) {
        const clone = document.createElement('img');
        clone.className = 'lightbox-image';
        clone.src = img.currentSrc || img.src;
        clone.alt = img.alt || '';
        stage.appendChild(clone);
      } else {
        const fill = piece.querySelector('.gallery-piece__fill');
        const clone = document.createElement('div');
        clone.className = 'lightbox-fill';
        if (fill) {
          clone.style.background = fill.style.background;
          clone.style.setProperty('--fill-ratio', fill.style.aspectRatio || '4/3');
        }
        stage.appendChild(clone);
      }
    }

    function open(i) {
      index = (i + pieces.length) % pieces.length;
      render();
      lb.classList.add('is-open');
    }
    function close() { lb.classList.remove('is-open'); }
    function next()  { index = (index + 1) % pieces.length; render(); }
    function prev()  { index = (index - 1 + pieces.length) % pieces.length; render(); }

    closeBtn.addEventListener('click', close);
    nextBtn.addEventListener('click', e => { e.stopPropagation(); next(); });
    prevBtn.addEventListener('click', e => { e.stopPropagation(); prev(); });

    /* Click outside the image/buttons (the dark backdrop itself) closes it. */
    lb.addEventListener('click', e => { if (e.target === lb) close(); });

    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    });

    let touchStartX = null;
    lb.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) (dx < 0 ? next() : prev());
      touchStartX = null;
    }, { passive: true });

    return { open };
  }

  class DraggablePiece {
    constructor(el, onInteract) {
      this.el = el;
      this.dx = 0; this.dy = 0;
      this.vx = 0; this.vy = 0;
      this.raf = null;
      this.rot = parseFloat(el.dataset.rotation || 0);
      this.moved = false;
      this.onInteract = onInteract;
      this.apply();
      this.bind();
    }

    bind() {
      this.el.addEventListener('mousedown', e => { e.preventDefault(); this.down(e); });
      this.el.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.touches[0];
        this.down({ clientX: t.clientX, clientY: t.clientY });
      }, { passive: false });
    }

    down(e) {
      this.el.classList.add('is-dragging');
      this.el.style.zIndex = String(this.onInteract('nextZ'));
      this.startDx = this.dx;
      this.startDy = this.dy;
      this.startX  = e.clientX;
      this.startY  = e.clientY;
      this.px = e.clientX;
      this.py = e.clientY;
      this.vx = 0;
      this.vy = 0;
      this.moved = false;
      cancelAnimationFrame(this.raf);
      this.onInteract('start');

      const move = e => {
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        if (Math.abs(cx - this.startX) > 3 || Math.abs(cy - this.startY) > 3) this.moved = true;
        this.vx = cx - this.px;
        this.vy = cy - this.py;
        this.px = cx;
        this.py = cy;
        /* Pure delta accumulation — never re-derive from getBoundingClientRect(),
           that's what let the piece's own static left/top leak into the math. */
        this.dx = this.startDx + (cx - this.startX);
        this.dy = this.startDy + (cy - this.startY);
        this.apply();
      };

      const up = () => {
        this.el.classList.remove('is-dragging');
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup',   up);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend',  up);
        this.inertia();
      };

      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup',   up);
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend',  up);
    }

    inertia() {
      const decay = 0.91;
      const step = () => {
        this.vx *= decay;
        this.vy *= decay;
        if (Math.abs(this.vx) < 0.25 && Math.abs(this.vy) < 0.25) return;
        this.dx += this.vx;
        this.dy += this.vy;
        this.apply();
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }

    apply() {
      this.el.style.transform = `translate(${this.dx}px, ${this.dy}px) rotate(${this.rot}deg)`;
    }
  }

  /* A detached div carrying data-lightbox-src/-alt — buildLightbox()
     already knows how to read those off any element, real stack
     piece or not, so this is the cheapest way to fold the cover and
     the gallery-only (7th-and-up) images into the same lightbox
     without needing a second code path. */
  function stubPiece(src, alt) {
    const el = document.createElement('div');
    el.dataset.lightboxSrc = src;
    el.dataset.lightboxAlt = alt || '';
    return el;
  }

  function initGallery(section) {
    const stackPieces = Array.from(section.querySelectorAll('.gallery-piece'));
    if (!stackPieces.length) return;

    const dragHint = section.querySelector('.comp-drag-hint');
    let globalZ = 100;
    let hasInteracted = false;

    function onInteract(kind) {
      if (kind === 'nextZ') return ++globalZ;
      if (kind === 'start' && !hasInteracted) {
        hasInteracted = true;
        dragHint && dragHint.classList.add('is-hidden');
      }
    }

    const draggables = stackPieces.map(el => new DraggablePiece(el, onInteract));

    /* Full gallery order: cover (if any), then everything beyond the
       6-piece stack (07+, gallery-only), then the stack itself (01-06)
       last — matching how María numbers and sequences a project's
       photos, not just "stack first, extras after". */
    const coverSrc = section.dataset.galleryCover;
    let extra = [];
    if (section.dataset.galleryExtra) {
      try { extra = JSON.parse(section.dataset.galleryExtra); } catch (e) { extra = []; }
    }

    const fullPieces = [];
    const stackOffset = (coverSrc ? 1 : 0) + extra.length;
    if (coverSrc) fullPieces.push(stubPiece(coverSrc, section.dataset.galleryCoverAlt));
    extra.forEach(item => fullPieces.push(stubPiece(item.src, item.alt)));
    fullPieces.push(...stackPieces);

    const lightbox = buildLightbox(fullPieces);

    stackPieces.forEach((el, i) => {
      const img = el.querySelector('img');
      if (img) img.setAttribute('draggable', 'false');

      el.addEventListener('dblclick', () => {
        if (draggables[i].moved) return;
        lightbox.open(i + stackOffset);
      });
    });

    const viewAllBtn = section.parentElement.querySelector('.js-view-gallery')
      || document.querySelector('.js-view-gallery');
    if (viewAllBtn) viewAllBtn.addEventListener('click', () => lightbox.open(0));
  }

  /* Simple click-to-open lightbox — no drag, single click, for
     static image groups like the About hero bags. Reuses the same
     buildLightbox()/CSS as the draggable galleries above. */
  function initClickLightbox(container) {
    const items = Array.from(container.querySelectorAll('[data-lightbox-src]'));
    if (!items.length) return;
    const lightbox = buildLightbox(items);
    items.forEach((el, i) => {
      el.addEventListener('click', () => lightbox.open(i));
    });
  }

  document.querySelectorAll('.comp-gallery-interactive').forEach(initGallery);
  document.querySelectorAll('[data-lightbox-group]').forEach(initClickLightbox);

  /* Exposed for project.html's dynamic renderer — it builds the
     .comp-gallery-interactive DOM from projects.json *after* this
     script has already run its own querySelectorAll pass above (which
     found nothing yet, harmlessly), so it calls this directly once the
     stack/gallery markup exists. Static pages never need to call this
     themselves — the auto-run above already covers them. */
  window.GalleryJS = { initGallery, initClickLightbox };

})();
