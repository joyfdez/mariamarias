/* ============================================================
   RENDER-STRIP.JS — work.html only
   Renders the horizontal projects strip from data/projects.json —
   every project is a candidate, in the same order as the JSON file
   (grouped by discipline: textile, campaigns, branding, packaging).
   A project without a real cover yet (status: "missing-assets", or
   zero uploaded photos) gets a tinted placeholder card in its own
   discipline's color instead of being silently left out.
   ============================================================ */
(function () {
  const strip = document.getElementById('projectsStrip');
  if (!strip) return;

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
    label.textContent = `${discipline.name} · ${project.year}`;

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

  Promise.all([
    fetch('data/projects.json').then(r => r.json()),
    fetch('data/disciplines.json').then(r => r.json())
  ]).then(([projects, disciplines]) => {
    const bySlug = Object.fromEntries(disciplines.map(d => [d.slug, d]));
    strip.innerHTML = '';
    projects.filter(project => !project.hidden).forEach(project => {
      const discipline = bySlug[project.discipline];
      if (!discipline) return; // defensive — every project.discipline must match a real slug
      strip.appendChild(cardFor(project, discipline));
    });
  });
})();
