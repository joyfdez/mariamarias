/* ============================================================
   RENDER-CATEGORY-GRID.JS — work.html only
   Renders the discipline grid from data/disciplines.json — the same
   source category.html reads from, instead of a second hardcoded
   copy of the same names living in work.html's markup. Fires
   'categorygridready' after each render so work.html's pagination-dot
   script (which measures grid.scrollWidth) can re-measure once real
   items exist, since they no longer exist at parse time.
   ============================================================ */
(function () {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;

  let disciplines = null;

  function itemFor(d) {
    const a = document.createElement('a');
    a.className = `category-item category-item--${d.slug}`;
    a.href = `category.html?d=${d.slug}`;

    const num = document.createElement('span');
    num.className = 'category-num';
    num.textContent = d.number;

    const icon = document.createElement('div');
    icon.className = 'category-icon';
    icon.innerHTML = `<img class="category-shape" src="${d.icon}" alt="">`;

    const name = document.createElement('div');
    name.className = 'category-name';
    name.innerHTML = window.I18N.pick(d.titleLines).join('<br>');

    a.append(num, icon, name);
    return a;
  }

  function render() {
    grid.innerHTML = '';
    disciplines.forEach(d => grid.appendChild(itemFor(d)));
    document.dispatchEvent(new CustomEvent('categorygridready'));
  }

  fetch('data/disciplines.json').then(r => r.json()).then(json => {
    disciplines = json;
    render();
    document.addEventListener('langchange', render);
  });
})();
