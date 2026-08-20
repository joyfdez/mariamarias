/* ============================================================
   NAV-MENU.JS — shared mobile hamburger menu, loaded on every page.
   Below 640px (see components.css) the nav links collapse into a
   dropdown behind a burger button; the logo and ES/EN toggle stay
   visible in the bar regardless. No-ops harmlessly on any page
   whose nav doesn't have a burger (there is none today, but this
   keeps it safe if that ever changes).
   ============================================================ */
(function () {
  const nav = document.querySelector('.comp-nav');
  const burger = nav && nav.querySelector('.comp-nav__burger');
  const links = nav && nav.querySelector('.comp-nav__links');
  if (!nav || !burger || !links) return;

  function setOpen(open) {
    nav.classList.toggle('is-menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
  }

  burger.addEventListener('click', () => {
    setOpen(!nav.classList.contains('is-menu-open'));
  });

  /* Closes on any link tap — including the external Shop link, which
     opens a new tab and leaves this one sitting behind it otherwise. */
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(false);
  });

  /* Rotating past the breakpoint into a wide/landscape view shouldn't
     leave the dropdown stuck open underneath the now-inline links. */
  window.addEventListener('resize', () => {
    if (window.innerWidth > 640) setOpen(false);
  });
})();
