/* ============================================================
   I18N.JS — shared ES/EN language utility, loaded on every page.
   Single source of truth for the active language: localStorage
   persists it across navigation, ?lang= in the URL makes a given
   language shareable/bookmarkable (kept in sync via replaceState,
   never a real navigation), priority on load is
   URL param > localStorage > 'es' default.
   ============================================================ */
window.I18N = (function () {
  const STORAGE_KEY = 'site-lang';
  const SUPPORTED = ['es', 'en'];
  const DEFAULT_LANG = 'es';

  function detectInitialLang() {
    const urlLang = new URLSearchParams(location.search).get('lang');
    if (SUPPORTED.includes(urlLang)) return urlLang;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(stored)) return stored;
    return DEFAULT_LANG;
  }

  let currentLang = detectInitialLang();
  document.documentElement.lang = currentLang;

  function getLang() { return currentLang; }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang) || lang === currentLang) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
    document.documentElement.lang = lang;
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  /* pick(field): resolves a plain string or a { es, en } bilingual
     object to the active language's value. Fields that were never
     bilingual to begin with (project titleLines, client — brand
     names, kept identical in both languages) just pass through. */
  function pick(field, lang) {
    lang = lang || currentLang;
    if (field == null || typeof field === 'string') return field;
    if (Array.isArray(field)) return field.map(v => pick(v, lang));
    if (field[lang] != null) return field[lang];
    return field.es != null ? field.es : field.en;
  }

  let strings = null;
  let stringsPromise = null;
  function loadStrings() {
    if (!stringsPromise) {
      stringsPromise = fetch('data/strings.json')
        .then(r => r.json())
        .then(json => { strings = json; return json; });
    }
    return stringsPromise;
  }

  /* t(key, vars): resolves a dot-path key from strings.json in the
     active language, substituting {token} placeholders from vars. */
  function t(key, vars) {
    if (!strings) return '';
    let node = strings;
    for (const part of key.split('.')) {
      node = node ? node[part] : undefined;
    }
    let value = pick(node);
    if (typeof value !== 'string') return '';
    if (vars) {
      Object.keys(vars).forEach(k => {
        value = value.split(`{${k}}`).join(vars[k]);
      });
    }
    return value;
  }

  /* Static pages (about/contact/work) keep their copy directly in
     HTML rather than building it from JSON at runtime — elements
     opt in with data-i18n-key="dot.path". data-i18n-html routes the
     resolved string through innerHTML (needed for "<br>"-bearing
     strings); data-i18n-attr="alt" (or any attribute name) sets that
     attribute instead of the element's content. */
  function applyStaticTranslations(root) {
    (root || document).querySelectorAll('[data-i18n-key]').forEach(el => {
      const value = t(el.dataset.i18nKey);
      if (!value) return;
      const attr = el.dataset.i18nAttr;
      if (attr) {
        el.setAttribute(attr, value);
      } else if (el.dataset.i18nHtml !== undefined) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });
  }

  /* Nav language toggle — replaces the old .comp-nav__dot on every
     page. Markup/CSS live in components.css (.comp-nav__lang); this
     just wires clicks and keeps the active state in sync. */
  function wireLangToggle() {
    const buttons = document.querySelectorAll('.comp-nav__lang-btn');
    if (!buttons.length) return;
    function sync() {
      buttons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.lang === currentLang));
    }
    buttons.forEach(btn => btn.addEventListener('click', () => setLang(btn.dataset.lang)));
    document.addEventListener('langchange', sync);
    sync();
  }

  /* init(onReady): fetches strings.json, applies data-i18n-key
     translations, wires the toggle, then hands control to the
     caller (each page's own dynamic renderer, if any). Re-applies
     static translations automatically on every langchange so
     about/contact/work stay in sync without each page re-wiring it. */
  function init(onReady) {
    wireLangToggle();
    loadStrings().then(() => {
      applyStaticTranslations();
      document.addEventListener('langchange', () => applyStaticTranslations());
      if (typeof onReady === 'function') onReady();
    });
  }

  return { getLang, setLang, pick, t, loadStrings, applyStaticTranslations, init, SUPPORTED };
})();
