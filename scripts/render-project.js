/* ============================================================
   RENDER-PROJECT.JS — project.html only
   Reads ?p=<project-slug>, fetches data/projects.json +
   data/disciplines.json (for inherited theme color), and renders
   the whole page client-side. gallery.js already ran its own
   auto-init pass at DOMContentLoaded — before this fetch resolves,
   so it found nothing (harmless no-op). Once the gallery DOM below
   is built, we call window.GalleryJS.initGallery() explicitly.
   Bilingual fields ({es,en} objects in the JSON) are resolved via
   I18N.pick(); fixed UI strings via I18N.t(). Re-renders on
   'langchange' instead of reloading the page.
   ============================================================ */
(function () {
  const slug = new URLSearchParams(location.search).get('p');
  const pick = window.I18N.pick;
  const t = window.I18N.t;

  const header     = document.getElementById('projectHeader');
  const leftCol     = header.querySelector('.project-header__left');
  const categoryEl  = document.getElementById('projCategory');
  const titleEl     = document.getElementById('projTitle');
  const specSheet   = document.getElementById('projSpecSheet');
  const descWrap    = document.getElementById('projDesc');
  const gallerySec  = document.getElementById('projGallery');
  const canvas      = document.getElementById('galleryCanvas');

  /* Same fixed set used across every real project's stack, just
     applied by position instead of hand-authored per piece. */
  const ROTATIONS = [-8, 6, -4, 9, -6, 3];

  /* The 6 gradients every legacy placeholder page used for
     .gallery-piece__fill — reused verbatim so a project with no
     real photos yet still gets the same "photos on a table" look. */
  const PLACEHOLDER_FILLS = [
    { ratio: '3/4', css: 'linear-gradient(140deg, #c4b498 0%, #967850 40%, #6c4828 100%)' },
    { ratio: '4/5', css: 'linear-gradient(155deg, #4a6878 0%, #2a3e58 50%, #182840 100%)' },
    { ratio: '2/3', css: 'linear-gradient(165deg, #c87858 0%, #9a5035 50%, #6a2e18 100%)' },
    { ratio: '5/4', css: 'linear-gradient(130deg, #d4c8a8 0%, #a89870 50%, #7a6840 100%)' },
    { ratio: '4/3', css: 'linear-gradient(145deg, #8898a8 0%, #586878 55%, #303e50 100%)' },
    { ratio: '3/5', css: 'linear-gradient(160deg, #b8a898 0%, #8a7868 50%, #5a4838 100%)' },
  ];

  function showError(message) {
    header.innerHTML = `<p class="cat-error">${message}</p>`;
    gallerySec.remove();
  }

  function buildSpecSheet(project) {
    specSheet.innerHTML = `
      <div class="spec-item">
        <div class="spec-label">${t('project.specClient')}</div>
        <div class="spec-value">${project.client}</div>
      </div>
      <div class="spec-item">
        <div class="spec-label">${t('project.specDiscipline')}</div>
        <div class="spec-value">${pick(project.disciplineDetail)}</div>
      </div>
      <div class="spec-item">
        <div class="spec-label">${t('project.specYear')}</div>
        <div class="spec-value">${project.year}</div>
      </div>
    `;
  }

  function buildDescription(project) {
    descWrap.innerHTML = '';
    project.description.forEach(block => {
      const p = document.createElement('p');
      p.className = 'project-desc' + (block.style === 'secondary' ? ' project-desc--secondary' : '');
      p.textContent = pick(block.text);
      descWrap.appendChild(p);
    });
  }

  function buildGalleryAndCta(project, hasImages) {
    canvas.innerHTML = '';
    leftCol.querySelectorAll('.gallery-view-all, .gallery-note').forEach(el => el.remove());

    if (!hasImages) {
      PLACEHOLDER_FILLS.forEach((fill, i) => {
        const piece = document.createElement('div');
        piece.className = `gallery-piece gp-${i + 1}`;
        piece.dataset.rotation = String(ROTATIONS[i]);
        piece.innerHTML = `<div class="gallery-piece__fill" style="aspect-ratio:${fill.ratio}; background:${fill.css};"></div>`;
        canvas.appendChild(piece);
      });
      return; // no CTA/note when there's nothing real to view
    }

    project.stack.forEach((src, i) => {
      const piece = document.createElement('div');
      piece.className = `gallery-piece gp-${i + 1}`;
      piece.dataset.rotation = String(ROTATIONS[i % ROTATIONS.length]);
      piece.innerHTML = `<img class="gallery-piece__img" src="${src}" alt="" draggable="false">`;
      canvas.appendChild(piece);
    });

    if (project.cover) gallerySec.dataset.galleryCover = project.cover;
    if (project.gallery.length) {
      gallerySec.dataset.galleryExtra = JSON.stringify(project.gallery.map(src => ({ src })));
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cta-link gallery-view-all js-view-gallery';
    btn.textContent = t('project.viewGalleryCta');
    const note = document.createElement('p');
    note.className = 'gallery-note';
    note.textContent = t('project.dragNote');
    leftCol.appendChild(btn);
    leftCol.appendChild(note);
  }

  window.I18N.init(function () {
    Promise.all([
      fetch('data/projects.json').then(r => r.json()),
      fetch('data/disciplines.json').then(r => r.json())
    ]).then(([projects, disciplines]) => {
      const project = projects.find(p => p.slug === slug);
      if (!project || project.hidden) {
        function renderError() {
          showError(slug ? t('project.errorNotFound', { slug }) : t('project.errorMissingParam'));
        }
        renderError();
        document.addEventListener('langchange', renderError);
        return;
      }
      const discipline = disciplines.find(d => d.slug === project.discipline);

      /* status: "missing-assets" means the referenced files don't
         actually exist on disk right now — treat exactly like a
         project with zero uploaded photos (placeholder fills, no
         broken <img>, no CTA) until the real files land and the
         status field is removed from projects.json. */
      const hasImages = project.stack.length > 0 && project.status !== 'missing-assets';

      function render() {
        document.title = `María Méndez — ${project.titleLines.join(' ')}`;

        const root = document.documentElement.style;
        root.setProperty('--c-bg',     discipline.color);
        root.setProperty('--c-text',   discipline.textColor);
        root.setProperty('--c-muted',  discipline.mutedColor);
        root.setProperty('--c-border', discipline.borderColor);
        root.setProperty('--c-dot',    discipline.dotColor);

        categoryEl.textContent = `${pick(discipline.name)} · ${project.year}`;
        titleEl.innerHTML = project.titleLines.join('<br>');

        buildSpecSheet(project);
        buildDescription(project);
        buildGalleryAndCta(project, hasImages);

        if (window.GalleryJS) window.GalleryJS.initGallery(gallerySec);
      }

      render();
      document.addEventListener('langchange', render);
    }).catch(() => {
      showError(t('common.errorLoadFailed'));
    });
  });
})();
