/* ============================================================
   programming-for-kids.js — page Codio Kids
   Mêmes mécanismes que script.js / pfe-before-pfe.js (convention du projet) :
   - menu mobile (drawer)
   - reveal au scroll (IntersectionObserver)
   Spécifique à cette page :
   - onglets accessibles des 4 groupes (sans JS : les 4 programmes restent
     visibles à la suite, la classe .kids-js n'est alors jamais ajoutée)
   - groupe indicatif selon l'âge de l'enfant
   - formulaire FormSubmit.co → codioacademy@outlook.com
     (le message de succès n'apparaît que si la réponse est ok)
   ============================================================ */

/* Active les styles "avec JavaScript" (onglets) */
document.documentElement.classList.add('kids-js');

/* ============ Traduction (moteur partagé js/i18n.js) ============ */
CodioI18n.init();
const tr = (key, fr) => CodioI18n.t(key, fr);
// Un changement de langue efface les messages d'erreur affichés (ils seraient dans l'ancienne langue)
document.addEventListener('codio:langchange', () => {
  document.querySelectorAll('.field.has-error').forEach(w => {
    w.classList.remove('has-error');
    const e = w.querySelector('.field-error'); if (e) e.textContent = '';
  });
});

/* ============ Mobile drawer ============ */
const burger = document.getElementById('burgerBtn');
const drawer = document.getElementById('drawer');
const scrim = document.getElementById('scrim');
const drawerClose = document.getElementById('drawerClose');

function openDrawer(){
  drawer.classList.add('open');
  scrim.classList.add('show');
  burger.setAttribute('aria-expanded','true');
}
function closeDrawer(){
  drawer.classList.remove('open');
  scrim.classList.remove('show');
  burger.setAttribute('aria-expanded','false');
}
if(burger){
  burger.addEventListener('click', openDrawer);
  drawerClose.addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a').forEach(a=>a.addEventListener('click', closeDrawer));
}

/* ============ Reveal on scroll ============ */
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
},{threshold:0.12});
revealEls.forEach(el=>io.observe(el));

/* ============ Onglets des groupes (G1 → G4) ============ */
const tabs = Array.from(document.querySelectorAll('.group-tab'));
const panels = Array.from(document.querySelectorAll('.week-panel'));

function selectTab(tab, moveFocus){
  tabs.forEach(t=>{
    const on = (t === tab);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if(panel) panel.hidden = !on;
  });
  if(moveFocus) tab.focus();
}

if(tabs.length){
  // état initial : seul le premier groupe est visible
  selectTab(tabs[0], false);

  tabs.forEach((tab, i)=>{
    tab.addEventListener('click', ()=>selectTab(tab, false));
    // navigation clavier : flèches, Début, Fin
    tab.addEventListener('keydown', (e)=>{
      let next = null;
      const rtl = document.documentElement.dir === 'rtl';
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
      const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
      if(e.key === forward || e.key === 'ArrowDown') next = tabs[(i+1) % tabs.length];
      else if(e.key === backward || e.key === 'ArrowUp') next = tabs[(i-1+tabs.length) % tabs.length];
      else if(e.key === 'Home') next = tabs[0];
      else if(e.key === 'End') next = tabs[tabs.length-1];
      if(next){ e.preventDefault(); selectTab(next, true); }
    });
  });
}

/* ============================================================
   FORMULAIRE D'INSCRIPTION — Codio Kids
   ============================================================ */
const kidsForm = document.getElementById('kidsForm');

if(kidsForm){
  // Groupe indicatif selon l'âge (à confirmer par le test de positionnement)
  function groupForAge(age){
    if(age >= 8  && age <= 9)  return 'G1 — Discover';
    if(age >= 10 && age <= 11) return 'G2 — Explore';
    if(age >= 12 && age <= 13) return 'G3 — Creator';
    if(age >= 14 && age <= 15) return 'G4 — Developer';
    return '';
  }

  const f = {
    parent: document.getElementById('kidsParent'),
    email:  document.getElementById('kidsEmail'),
    phone:  document.getElementById('kidsPhone'),
    child:  document.getElementById('kidsChild'),
    age:    document.getElementById('kidsAge'),
    level:  document.getElementById('kidsLevel'),
  };
  const consent = document.getElementById('kidsConsent');
  const subjectInput = document.getElementById('kidsSubject');
  const groupField = document.getElementById('kidsGroupField');
  const groupHint = document.getElementById('kidsGroupHint');
  const submitBtn = kidsForm.querySelector('button[type="submit"]');
  const successPanel = document.getElementById('kidsSuccess');

  function updateGroupHint(){
    const g = groupForAge(parseInt(f.age.value, 10));
    groupField.value = g;
    groupHint.textContent = g
      ? tr('js.kidsHint', 'Groupe indicatif : {g} (à confirmer après le test de positionnement).').replace('{g}', g)
      : tr('kids.236', "Le programme s'adresse aux 8–15 ans.");
  }
  f.age.addEventListener('change', updateGroupHint);
  document.addEventListener('codio:langchange', ()=>{ if(f.age.value) updateGroupHint(); });

  function setError(inputEl, message){
    const wrap = inputEl.closest('.field');
    if(!wrap) return;
    const errorEl = wrap.querySelector('.field-error');
    if(message){
      wrap.classList.add('has-error');
      if(errorEl) errorEl.textContent = message;
    } else {
      wrap.classList.remove('has-error');
      if(errorEl) errorEl.textContent = '';
    }
  }

  function validate(){
    let valid = true;

    ['parent','child'].forEach(key=>{
      if(!f[key].value.trim()){ setError(f[key], tr('js.required', 'Ce champ est obligatoire.')); valid = false; }
      else setError(f[key], '');
    });

    const emailVal = f.email.value.trim();
    if(!emailVal){ setError(f.email, tr('js.emailReq', "L'email est obligatoire.")); valid = false; }
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)){ setError(f.email, tr('js.emailBad', "Merci d'indiquer un email valide.")); valid = false; }
    else setError(f.email, '');

    if(!f.phone.value.trim()){ setError(f.phone, tr('js.phoneReq', 'Le téléphone est obligatoire.')); valid = false; }
    else setError(f.phone, '');

    if(!f.age.value){ setError(f.age, tr('js.kidsAge', "Indiquez l'âge de l'enfant.")); valid = false; }
    else setError(f.age, '');

    if(!f.level.value){ setError(f.level, tr('js.kidsLevel', 'Choisissez une option.')); valid = false; }
    else setError(f.level, '');

    if(!consent.checked){ setError(consent, tr('js.kidsConsent', "Ce consentement est obligatoire pour envoyer la demande.")); valid = false; }
    else setError(consent, '');

    return valid;
  }

  kidsForm.addEventListener('submit', function(e){
    e.preventDefault();

    if(!validate()){
      const firstError = kidsForm.querySelector('.has-error');
      if(firstError){ firstError.scrollIntoView({behavior:'smooth', block:'center'}); }
      return;
    }

    // Objet de l'email : âge et groupe indicatif
    subjectInput.value = 'Inscription Codio Kids — ' + f.age.value + ' ans (' + (groupField.value || 'groupe à définir') + ')';

    const original = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = tr('js.sending', 'Envoi en cours...');

    fetch(kidsForm.action, {
      method: 'POST',
      body: new FormData(kidsForm),
      headers: { 'Accept': 'application/json' }
    })
    .then(res=>{
      if(!res.ok) throw new Error('Network error');
      kidsForm.style.display = 'none';
      successPanel.classList.add('show');
      successPanel.scrollIntoView({behavior:'smooth', block:'center'});
    })
    .catch(()=>{
      submitBtn.textContent = tr('js.sendError', "Erreur d'envoi — réessayer");
      submitBtn.disabled = false;
      setTimeout(()=>{ CodioI18n.apply(CodioI18n.lang); }, 3000);
    });
  });
}
