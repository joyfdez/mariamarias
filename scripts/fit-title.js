/* ============================================================
   FIT-TITLE.JS — shrinks a title's font-size (in vw) with a
   binary search until it fits the available width of its parent,
   measured from the parent's real computed padding (not a
   hardcoded offset). Shared by work.html (.work-title) and
   contact.html (.contact-outline) — previously two near-identical
   inline copies, one of which (work.html) used a hardcoded
   `- 80` offset instead of reading the parent's actual padding.
   ============================================================ */
function fitTitleToWidth(el, { min = 5, max = 17 } = {}) {
  if (!el) return;
  const fit = () => {
    const parent = el.parentElement;
    const style = getComputedStyle(parent);
    const available = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    let lo = min, hi = max, mid;
    for (let i = 0; i < 30; i++) {
      mid = (lo + hi) / 2;
      el.style.fontSize = mid + 'vw';
      if (el.scrollWidth > available) hi = mid;
      else lo = mid;
    }
    el.style.fontSize = lo + 'vw';
  };
  fit();
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fit);
  }
}
