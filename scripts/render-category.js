/* ============================================================
   RENDER-CATEGORY.JS — category.html only
   Reads ?d=<discipline-slug>, fetches data/disciplines.json +
   data/projects.json, and renders the whole page client-side.
   No build step, no backend — fetch() of local JSON only works
   served over http(s), not opened directly via file://.
   ============================================================ */
(function () {
  const slug = new URLSearchParams(location.search).get('d');

  const hero    = document.getElementById('catHero');
  const eyebrow  = document.getElementById('catEyebrow');
  const title    = document.getElementById('catTitle');
  const count    = document.getElementById('catCount');
  const desc     = document.getElementById('catDesc');
  const grid     = document.getElementById('catGrid');

  function showError(message) {
    hero.style.display = 'none';
    grid.innerHTML = '';
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
      <span class="pcard__meta">${discipline.name} · ${project.year}</span>
      <h2 class="pcard__title">${project.titleLines.join('<br>')}</h2>
      <div class="pcard__dot"></div>
    `;
    a.appendChild(info);
    return a;
  }

  Promise.all([
    fetch('data/disciplines.json').then(r => r.json()),
    fetch('data/projects.json').then(r => r.json())
  ]).then(([disciplines, projects]) => {
    const discipline = disciplines.find(d => d.slug === slug);
    if (!discipline) {
      showError(slug ? `No existe la disciplina "${slug}".` : 'Falta el parámetro ?d= en la URL.');
      return;
    }

    document.title = `María Méndez — ${discipline.name}`;

    const root = document.documentElement.style;
    root.setProperty('--c-bg',     discipline.color);
    root.setProperty('--c-text',   discipline.textColor);
    root.setProperty('--c-muted',  discipline.mutedColor);
    root.setProperty('--c-border', discipline.borderColor);
    root.setProperty('--c-dot',    discipline.dotColor);

    eyebrow.textContent = discipline.eyebrowLabel;
    title.innerHTML     = discipline.titleLines.join('<br>');
    desc.textContent    = discipline.description;

    const matches = projects.filter(p => p.discipline === slug && !p.hidden);
    count.textContent = `${matches.length} Project${matches.length === 1 ? '' : 's'}`;

    grid.innerHTML = '';
    matches.forEach(project => grid.appendChild(pcardFor(project, discipline)));
  }).catch(() => {
    showError('No se pudo cargar el contenido — revisa que la página se esté sirviendo por http(s), no abierta directo como archivo.');
  });
})();
