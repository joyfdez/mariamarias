/* ============================================================
   RENDER-STRIP.JS — work.html only
   Renders the horizontal projects strip from data/projects.json —
   every project is a candidate, shuffled into a random order on
   each page load (see shuffle() below) rather than always opening
   with the same fixed textile/campaigns/branding/packaging sequence
   from the JSON file. A project without a real cover yet (status: "missing-assets", or
   zero uploaded photos) gets a tinted placeholder card in its own
   discipline's color instead of being silently left out.
   discipline.name is a bilingual { es, en } object — resolved via
   I18N.pick(); re-renders on 'langchange' instead of reloading.
   ============================================================ */
(function () {
  const strip = document.getElementById('projectsStrip');
  if (!strip) return;
  const pick = window.I18N.pick;

  function cardFor(project, discipline) {
    const hasCover = !!project.cover && project.status !== 'missing-assets';

    const a = document.createElement('a');
    a.className = 'project-card ' + (hasCover ? 'project-card--photo' : 'project-card--placeholder');
    a.href = `project.html?p=${project.slug}`;

    if (hasCover) {
      a.style.backgroundImage =
        `linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%), url('${project.cover}')`;
    } else {
      a.style.setProperty('--project-card-tint', discipline.color);
      a.style.setProperty('--project-card-text', discipline.textColor);
      a.style.setProperty('--project-card-dot', discipline.dotColor);
      const iconWrap = document.createElement('div');
      iconWrap.className = 'project-card__placeholder-icon';
      iconWrap.innerHTML = `<img src="${discipline.icon}" alt="">`;
      a.appendChild(iconWrap);
    }

    const label = document.createElement('div');
    label.className = 'project-card__label';
    label.textContent = `${pick(discipline.name)} · ${project.year}`;

    const title = document.createElement('div');
    title.className = 'project-card__title';
    title.innerHTML = project.titleLines.join('<br>');

    const dot = document.createElement('div');
    dot.className = 'project-card__dot';

    a.appendChild(label);
    a.appendChild(title);
    a.appendChild(dot);
    return a;
  }

  /* Fisher-Yates, in place on a copy — this is the only page that
     reads data/projects.json in strip order; render-project.js looks
     up one project by slug and render-category.js filters by
     discipline, neither cares about array order, and each page does
     its own independent fetch(), so shuffling this local copy can't
     leak into anything else on the site. */
  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  Promise.all([
    fetch('data/projects.json').then(r => r.json()),
    fetch('data/disciplines.json').then(r => r.json())
  ]).then(([fetchedProjects, disciplines]) => {
    const bySlug = Object.fromEntries(disciplines.map(d => [d.slug, d]));
    /* Shuffled once per page load, not per render() call — switching
       ES/EN calls render() again and shouldn't shuffle the cards out
       from under someone mid-browse. */
    const projects = shuffle(fetchedProjects);

    function render() {
      strip.innerHTML = '';
      projects.filter(project => !project.hidden).forEach(project => {
        const discipline = bySlug[project.discipline];
        if (!discipline) return; // defensive — every project.discipline must match a real slug
        strip.appendChild(cardFor(project, discipline));
      });
    }

    render();
    document.addEventListener('langchange', render);
  });
})();
