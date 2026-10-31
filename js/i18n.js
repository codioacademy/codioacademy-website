/* ============================================================
   i18n.js — moteur de traduction partagé par TOUTES les pages (FR / EN / AR)
   Repris de l'ancien applyLang() de script.js et généralisé.

   Utilisation dans le HTML :
     data-i18n="clé"          remplace le contenu (innerHTML) de l'élément
     data-i18n-ph="clé"       remplace l'attribut placeholder
     data-i18n-aria="clé"     remplace l'attribut aria-label
     data-i18n-content="clé"  remplace l'attribut content (meta description)

   Dictionnaires (chargés avant ce fichier ne sont pas requis : ils s'enregistrent) :
     CodioI18n.add({fr:{...}, en:{...}, ar:{...}})   formats par langue (i18n-home.js)
     CodioI18n.addEntries({clé:[EN, AR]})             format compact (i18n-pages.js)
   Pour les pages dont le HTML est en français, le FR est le texte d'origine du HTML :
   il est mémorisé au premier passage, donc jamais recopié dans un dictionnaire.
   Une clé absente retombe sur le français : aucun texte ne disparaît.

   API pour les scripts de page : CodioI18n.t(clé, texteFr), CodioI18n.lang,
   et l'évènement « codio:langchange » (detail.lang).
   ============================================================ */
(function () {
  var store = { fr: {}, en: {}, ar: {} };
  var LANGS = ['fr', 'en', 'ar'];
  var originals = new WeakMap();
  var ATTRS = [
    ['data-i18n', null],            // contenu HTML
    ['data-i18n-ph', 'placeholder'],
    ['data-i18n-aria', 'aria-label'],
    ['data-i18n-content', 'content']
  ];
  var api = { lang: 'fr' };

  api.add = function (d) {
    LANGS.forEach(function (l) { if (d[l]) Object.assign(store[l], d[l]); });
  };
  api.addEntries = function (map) {
    Object.keys(map).forEach(function (k) { store.en[k] = map[k][0]; store.ar[k] = map[k][1]; });
  };

  // Traduction d'un texte dynamique (messages de formulaire, etc.)
  api.t = function (key, frText) {
    var v = store[api.lang][key];
    if (v !== undefined) return v;
    if (frText !== undefined) return frText;
    return store.fr[key] !== undefined ? store.fr[key] : key;
  };

  function original(el, attrName) {
    var rec = originals.get(el);
    if (!rec) { rec = {}; originals.set(el, rec); }
    if (!(attrName in rec)) {
      rec[attrName] = attrName === '' ? el.innerHTML : el.getAttribute(attrName);
    }
    return rec[attrName];
  }

  api.apply = function (lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'fr';
    api.lang = lang;
    ATTRS.forEach(function (pair) {
      var sel = '[' + pair[0] + ']', attr = pair[1];
      document.querySelectorAll(sel).forEach(function (el) {
        var key = el.getAttribute(pair[0]);
        var orig = original(el, attr || '');
        var v = store[lang][key];
        if (v === undefined) v = (lang === 'fr') ? undefined : store.fr[key];
        if (v === undefined && lang === 'fr') v = store.fr[key];
        if (v === undefined) v = orig;           // repli : texte d'origine du HTML
        if (v === null || v === undefined) return;
        if (attr) el.setAttribute(attr, v); else if (el.innerHTML !== v) el.innerHTML = v;
      });
    });
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
    try { localStorage.setItem('codio-lang', lang); } catch (e) { }
    document.dispatchEvent(new CustomEvent('codio:langchange', { detail: { lang: lang } }));
  };

  // Chargé en fin de <body> : le DOM est prêt.
  document.querySelectorAll('.lang-switch button').forEach(function (btn) {
    btn.addEventListener('click', function () { api.apply(btn.getAttribute('data-lang')); });
  });
  api.init = function () {
    var saved = 'fr';
    try { saved = localStorage.getItem('codio-lang') || 'fr'; } catch (e) { }
    api.apply(saved);
  };

  window.CodioI18n = api;
})();
