/* ============================================================
   RENDER-CATEGORY.JS — category.html only
   Reads ?d=<discipline-slug>, fetches data/disciplines.json +
   data/projects.json, and renders the whole page client-side.
   No build step, no backend — fetch() of local JSON only works
   served over http(s), not opened directly via file://.
   Bilingual fields ({es,en} objects in the JSON) are resolved via
   I18N.pick(); fixed UI strings via I18N.t(). Re-renders on
   'langchange' instead of reloading the page.
   ============================================================ */
(function () {
  const slug = new URLSearchParams(location.search).get('d');
  const pick = window.I18N.pick;
  const t = window.I18N.t;

  const hero    = document.getElementById('catHero');
  const eyebrow  = document.getElementById('catEyebrow');
  const title    = document.getElementById('catTitle');
  const count    = document.getElementById('catCount');
  const desc     = document.getElementById('catDesc');
  const grid     = document.getElementById('catGrid');

  function showError(message) {
    hero.style.display = 'none';
    grid.innerHTML = '';
    grid.parentNode.querySelectorAll('.cat-error').forEach(el => el.remove());
    const p = document.createElement('p');
    p.className = 'cat-error';
    p.textContent = message;
    grid.parentNode.insertBefore(p, grid);
  }

  function pcardFor(project, discipline) {
    const hasCover = !!project.cover && project.status !== 'missing-assets';

    const a = document.createElement('a');
    a.className = 'pcard' + (hasCover ? ' pcard--photo' : ' pcard--placeholder');
    a.href = `project.html?p=${project.slug}`;

    if (hasCover) {
      a.style.backgroundImage =
        `linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%), url('${project.cover}')`;
    } else {
      const iconWrap = document.createElement('div');
      iconWrap.className = 'pcard__placeholder-icon';
      iconWrap.innerHTML = `<img src="${discipline.icon}" alt="">`;
      a.appendChild(iconWrap);
    }

    const info = document.createElement('div');
    info.className = 'pcard__info';
    info.innerHTML = `
      <span class="pcard__meta">${pick(discipline.name)} · ${project.year}</span>
      <h2 class="pcard__title">${project.titleLines.join('<br>')}</h2>
      <div class="pcard__dot"></div>
    `;
    a.appendChild(info);
    return a;
  }

  window.I18N.init(function () {
    Promise.all([
      fetch('data/disciplines.json').then(r => r.json()),
      fetch('data/projects.json').then(r => r.json())
    ]).then(([disciplines, projects]) => {
      const discipline = disciplines.find(d => d.slug === slug);
      if (!discipline) {
        function renderError() {
          showError(slug ? t('category.errorNoDiscipline', { slug }) : t('category.errorMissingParam'));
        }
        renderError();
        document.addEventListener('langchange', renderError);
        return;
      }

      const matches = projects.filter(p => p.discipline === slug && !p.hidden);

      function render() {
        document.title = `María Méndez — ${pick(discipline.name)}`;

        const root = document.documentElement.style;
        root.setProperty('--c-bg',     discipline.color);
        root.setProperty('--c-text',   discipline.textColor);
        root.setProperty('--c-muted',  discipline.mutedColor);
        root.setProperty('--c-border', discipline.borderColor);
        root.setProperty('--c-dot',    discipline.dotColor);

        eyebrow.textContent = pick(discipline.eyebrowLabel);
        title.innerHTML     = pick(discipline.titleLines).join('<br>');
        desc.textContent    = pick(discipline.description);

        count.textContent = t(
          matches.length === 1 ? 'category.projectCountSingular' : 'category.projectCountPlural',
          { count: matches.length }
        );

        grid.innerHTML = '';
        matches.forEach(project => grid.appendChild(pcardFor(project, discipline)));
      }

      render();
      document.addEventListener('langchange', render);
    }).catch(() => {
      showError(t('common.errorLoadFailed'));
    });
  });
})();
