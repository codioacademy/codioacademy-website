/* ============ Vidéos YouTube « à renseigner » ============
   Un conteneur .testi-video-wrap[data-youtube] dont l'attribut contient un lien (ou un identifiant)
   YouTube reçoit automatiquement son lecteur. Vide = le message « Vidéo bientôt disponible » reste affiché.
   Exécuté AVANT l'initialisation de la traduction pour que l'aria-label du lecteur soit traduit. */
(function () {
  function toEmbed(v) {
    v = (v || '').trim();
    if (!v) return '';
    const m = v.match(/(?:embed\/|youtu\.be\/|shorts\/|live\/|[?&]v=)([A-Za-z0-9_-]{11})/);
    const id = m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(v) ? v : '');
    return id ? 'https://www.youtube.com/embed/' + id + '?rel=0&modestbranding=1&playsinline=1' : '';
  }
  document.querySelectorAll('.testi-video-wrap[data-youtube]').forEach(function (wrap) {
    const src = toEmbed(wrap.getAttribute('data-youtube'));
    if (!src) return;
    const f = document.createElement('iframe');
    f.className = 'testi-video';
    f.src = src;
    f.loading = 'lazy';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.allowFullscreen = true;
    f.setAttribute('data-i18n-aria', 'testi.v4');
    f.setAttribute('aria-label', 'Vidéo — Stages chez Codio Academy');
    const soon = wrap.querySelector('.testi-soon');
    if (soon) soon.remove();
    wrap.appendChild(f);
  });
})();

/* Traduction : moteur partagé js/i18n.js + dictionnaire js/i18n-home.js (chargés avant ce fichier). */
CodioI18n.init();

/* ============ Reveal on scroll ============ */
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => io.observe(el));

/* ============ Mobile drawer ============ */
const burger = document.getElementById('burgerBtn');
const drawer = document.getElementById('drawer');
const scrim = document.getElementById('scrim');
const drawerClose = document.getElementById('drawerClose');

function openDrawer() {
  drawer.classList.add('open');
  scrim.classList.add('show');
  burger.setAttribute('aria-expanded', 'true');
}
function closeDrawer() {
  drawer.classList.remove('open');
  scrim.classList.remove('show');
  burger.setAttribute('aria-expanded', 'false');
}
burger.addEventListener('click', openDrawer);
drawerClose.addEventListener('click', closeDrawer);
scrim.addEventListener('click', closeDrawer);
drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));

/* ============ Form submit (FormSubmit.co → codioacademy@outlook.com) ============ */
const form = document.getElementById('enrollForm');
form.addEventListener('submit', function (e) {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  const original = btn.innerHTML;
  btn.disabled = true;

  fetch(form.action, {
    method: 'POST',
    body: new FormData(form),
    headers: { 'Accept': 'application/json' }
  })
    .then(res => {
      if (!res.ok) throw new Error('Network error');
      btn.textContent = '✓';
      btn.style.background = '#1FE6D8';
      setTimeout(() => {
        form.reset();
        btn.innerHTML = original;
        btn.style.background = '';
        btn.disabled = false;
      }, 2600);
    })
    .catch(() => {
      btn.textContent = '✕';
      btn.style.background = '#E63946';
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.background = '';
        btn.disabled = false;
      }, 2600);
    });
});

/* ============================================================
   BANDEAU « À LA UNE » — les 3 dernières nouveautés (haut de la page d'accueil)

   SOURCE UNIQUE : les cartes .avail-card de la section « Nouveautés » (#available-programs).
   Rien n'est recopié à la main : titre, description, bouton, lien et icône sont lus dans
   ces cartes (déjà traduites par le moteur i18n). Les 3 plus récentes sont retenues :
     - tri par data-published="AAAA-MM-JJ" quand il est renseigné,
     - sinon par ordre dans la page (la dernière carte de la liste = la plus récente).
   Si une carte est ajoutée ou retirée, le bandeau se reconstruit tout seul (MutationObserver).

   Défilement : 5 s par programme, en boucle continue. Pause au survol souris, au focus
   clavier, quand l'onglet est masqué, ou via le bouton pause. Les utilisateurs qui préfèrent
   les animations réduites démarrent en pause. Clavier : flèches / Début / Fin sur les onglets.
   ============================================================ */
(function () {
  const root = document.getElementById('spotlight');
  const hero = document.getElementById('top');
  if (!root || !hero) return;

  const SOURCE = '#available-programs .avail-card';
  const MAX = 3;                 // nombre de programmes mis en avant
  const DELAY = 5000;            // durée d'affichage de chaque programme (ms)
  const t = (k, fr) => CodioI18n.t(k, fr);
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SVG = {
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    pause: '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
    play: '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>'
  };

  let items = [], slides = [], tabs = [];
  let idx = 0, timer = null, startedAt = 0, remaining = DELAY;
  let userPaused = reduceMotion, holdPaused = false;

  // --- 1. Lecture des cartes « Nouveautés » : les MAX plus récentes, la plus récente en premier
  function readItems() {
    return Array.from(document.querySelectorAll(SOURCE))
      .map((el, i) => ({ el, i, date: el.getAttribute('data-published') || '' }))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) || b.i - a.i)
      .slice(0, MAX);
  }

  // --- 2. Minuteur (pause / reprise sans perdre le temps déjà écoulé)
  const playing = () => !userPaused && !holdPaused && !document.hidden && items.length > 1;
  function clear() { clearTimeout(timer); timer = null; }
  function arm(ms) {
    clear(); remaining = ms;
    if (!playing()) { root.classList.add('is-paused'); return; }
    root.classList.remove('is-paused');
    startedAt = performance.now();
    timer = setTimeout(() => show(idx + 1), ms);
  }
  function freeze() {
    if (timer) { remaining = Math.max(0, remaining - (performance.now() - startedAt)); clear(); }
    root.classList.add('is-paused');
  }
  function thaw() {
    if (!playing() || timer) return;
    root.classList.remove('is-paused');
    startedAt = performance.now();
    timer = setTimeout(() => show(idx + 1), remaining);
  }

  // --- 3. Affichage d'un programme
  function show(i) {
    const n = items.length;
    idx = ((i % n) + n) % n;
    slides.forEach((s, k) => {
      s.classList.toggle('is-active', k === idx);
      s.setAttribute('aria-hidden', k === idx ? 'false' : 'true');
    });
    tabs.forEach((tb, k) => {
      tb.classList.remove('is-active');
      tb.classList.toggle('is-done', k < idx);
      tb.setAttribute('aria-selected', k === idx ? 'true' : 'false');
      tb.tabIndex = k === idx ? 0 : -1;
    });
    void root.offsetWidth;                       // relance l'animation de la barre de progression
    tabs[idx].classList.add('is-active');
    const c = root.querySelector('.spot-count');
    if (c) c.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    arm(DELAY);
  }

  // --- 4. Textes (relus dans les cartes : reflètent donc la langue courante)
  function updateToggle() {
    const b = root.querySelector('.spot-toggle');
    if (!b) return;
    b.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
    b.setAttribute('aria-label', userPaused ? t('spot.play', 'Reprendre le défilement') : t('spot.pause', 'Mettre le défilement en pause'));
    const vp = root.querySelector('.spot-viewport');
    if (vp) vp.setAttribute('aria-live', userPaused ? 'polite' : 'off');
  }
  function sync() {
    if (!items.length) return;
    root.setAttribute('aria-label', t('spot.region', 'Nouveaux programmes à la une'));
    root.querySelector('.spot-badge-t').textContent = t('avail.eyebrow', 'Nouveaux programmes');
    items.forEach((it, k) => {
      const c = it.el, s = slides[k], tb = tabs[k];
      const title = c.querySelector('h3'), desc = c.querySelector('p'), cta = c.querySelector('.avail-cta');
      s.querySelector('.spot-title').innerHTML = title ? title.innerHTML : '';
      s.querySelector('.spot-desc').innerHTML = desc ? desc.innerHTML : '';
      s.querySelector('.spot-cta').innerHTML = cta ? cta.innerHTML : '';
      const label = title ? title.textContent.trim() : '';
      tb.querySelector('.spot-tab-t').textContent = label;
      tb.setAttribute('aria-label', t('spot.goto', 'Afficher : {t}').replace('{t}', label));
    });
    root.querySelector('.spot-prev').setAttribute('aria-label', t('spot.prev', 'Programme précédent'));
    root.querySelector('.spot-next').setAttribute('aria-label', t('spot.next', 'Programme suivant'));
    updateToggle();
  }

  // --- 5. Construction du bandeau
  function render() {
    clear();
    items = readItems();
    if (!items.length) { root.hidden = true; hero.classList.remove('has-spotlight'); return; }
    const n = items.length;
    root.hidden = false;
    hero.classList.add('has-spotlight');
    root.classList.toggle('is-single', n < 2);
    root.style.setProperty('--spot-delay', DELAY + 'ms');
    root.style.setProperty('--spot-n', n);
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');

    root.innerHTML =
      '<div class="spot-shell">' +
        '<div class="spot-top">' +
          '<div class="spot-top-l"><span class="spot-badge"><i class="spot-pulse" aria-hidden="true"></i><span class="spot-badge-t"></span></span>' +
          '<span class="spot-count" dir="ltr"></span></div>' +
          '<div class="spot-ctrls">' +
            '<button type="button" class="spot-btn spot-prev">' + SVG.prev + '</button>' +
            '<button type="button" class="spot-btn spot-toggle" aria-pressed="false">' + SVG.pause + SVG.play + '</button>' +
            '<button type="button" class="spot-btn spot-next">' + SVG.next + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="spot-viewport" aria-live="off">' +
          items.map((it, k) =>
            '<article class="spot-slide" id="spot-p' + k + '" role="tabpanel" aria-roledescription="slide" aria-labelledby="spot-t' + k + '">' +
              '<span class="spot-icon"><img src="' + (it.el.getAttribute('data-icon') || 'images/logo.png') + '" alt=""></span>' +
              '<div class="spot-copy"><p class="spot-title"></p><p class="spot-desc"></p></div>' +
              '<a class="btn btn-primary spot-cta" href="' + it.el.getAttribute('href') + '"></a>' +
            '</article>').join('') +
        '</div>' +
        '<div class="spot-tabs" role="tablist">' +
          items.map((it, k) =>
            '<button type="button" class="spot-tab" role="tab" id="spot-t' + k + '" aria-controls="spot-p' + k + '" data-i="' + k + '">' +
              '<span class="spot-tab-n">' + String(k + 1).padStart(2, '0') + '</span><span class="spot-tab-t"></span>' +
              '<i class="spot-bar" aria-hidden="true"><b></b></i>' +
            '</button>').join('') +
        '</div>' +
      '</div>';

    slides = Array.from(root.querySelectorAll('.spot-slide'));
    tabs = Array.from(root.querySelectorAll('.spot-tab'));
    sync();
    show(0);
  }

  // --- 6. Interactions (délégation : posées une seule fois)
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !items.length) return;
    if (b.classList.contains('spot-prev')) show(idx - 1);
    else if (b.classList.contains('spot-next')) show(idx + 1);
    else if (b.classList.contains('spot-toggle')) { userPaused = !userPaused; userPaused ? freeze() : thaw(); updateToggle(); }
    else if (b.classList.contains('spot-tab')) show(parseInt(b.dataset.i, 10));
  });
  root.addEventListener('keydown', (e) => {
    const tb = e.target.closest('.spot-tab');
    if (!tb) return;
    const rtl = document.documentElement.dir === 'rtl';
    const fwd = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
    let to = null;
    if (e.key === fwd) to = idx + 1; else if (e.key === back) to = idx - 1;
    else if (e.key === 'Home') to = 0; else if (e.key === 'End') to = items.length - 1;
    if (to !== null) { e.preventDefault(); show(to); tabs[idx].focus(); }
  });
  // pause au survol (souris uniquement) et au focus clavier
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { holdPaused = true; freeze(); } });
  root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { holdPaused = false; thaw(); } });
  root.addEventListener('focusin', (e) => { if (e.target.matches && e.target.matches(':focus-visible')) { holdPaused = true; freeze(); } });
  root.addEventListener('focusout', () => { holdPaused = false; thaw(); });
  document.addEventListener('visibilitychange', () => { document.hidden ? freeze() : thaw(); });
  // balayage tactile
  let sx = null;
  root.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && e.target.closest('.spot-viewport')) sx = e.clientX; });
  root.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) < 50) return;
    const rtl = document.documentElement.dir === 'rtl';
    show((dx < 0) !== rtl ? idx + 1 : idx - 1);
  });

  // --- 7. Mises à jour automatiques
  document.addEventListener('codio:langchange', sync);            // changement de langue
  const list = document.querySelector('#available-programs .avail-row');
  if (list && window.MutationObserver) {                          // carte ajoutée / retirée dans « Nouveautés »
    let debounce;
    new MutationObserver(() => { clearTimeout(debounce); debounce = setTimeout(render, 60); })
      .observe(list, { childList: true });
  }

  render();
})();
