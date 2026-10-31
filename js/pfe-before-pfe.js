/* ============================================================
   pfe-before-pfe.js
   Réutilise exactement les mêmes mécanismes que script.js (racine) :
   - menu mobile (drawer)
   - reveal au scroll (IntersectionObserver)
   - envoi de formulaire via FormSubmit.co vers codioacademy@outlook.com
     (même destinataire et même mécanisme que le formulaire de index.html —
     fetch() POST + Accept: application/json, PAS de mailto)
   Seule nouveauté : l'objet de l'email est généré dynamiquement
   selon le parcours choisi par l'étudiant.

   Le message de succès n'est affiché QUE si fetch() reçoit une réponse
   ok (res.ok) de FormSubmit — jamais avant, jamais en cas d'erreur réseau.
   ============================================================ */

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

/* ============ Mobile drawer (identique à script.js) ============ */
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

/* ============ Reveal on scroll (identique à script.js) ============ */
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

/* ============================================================
   FORMULAIRE D'INSCRIPTION — PFE 9bal el PFE
   Même mécanisme que le formulaire de contact de index.html :
   FormSubmit.co → codioacademy@outlook.com
   L'objet ("_subject") est généré dynamiquement selon le parcours.
   ============================================================ */
const pfeForm = document.getElementById('pfeForm');

if(pfeForm){
  const fields = {
    lastName:    { el: document.getElementById('pfeLastName'),    label: "Nom" },
    firstName:   { el: document.getElementById('pfeFirstName'),   label: "Prénom" },
    email:       { el: document.getElementById('pfeEmail'),       label: "Email" },
    phone:       { el: document.getElementById('pfePhone'),       label: "Téléphone" },
    school:      { el: document.getElementById('pfeSchool'),      label: "Université" },
    speciality:  { el: document.getElementById('pfeSpeciality'),  label: "Spécialité" },
    studyLevel:  { el: document.getElementById('pfeStudyLevel'),  label: "Niveau d'études" },
    track:       { el: document.getElementById('pfeTrack'),       label: "Parcours souhaité" },
    techLevel:   { el: document.getElementById('pfeTechLevel'),   label: "Niveau technique" },
    motivation:  { el: document.getElementById('pfeMotivation'),  label: "Motivation" },
  };
  const availability = document.getElementById('pfeAvailability');
  const consent = document.getElementById('pfeConsent');
  const subjectInput = document.getElementById('pfeSubject');
  const submitBtn = pfeForm.querySelector('button[type="submit"]');
  const successPanel = document.getElementById('pfeSuccess');

  // setError() est générique : elle prend l'élément input/select DIRECTEMENT
  // (et non plus une "clé"), pour pouvoir être réutilisée à l'identique par
  // les champs texte ET les checkboxes. Elle cherche le .field-error dans le
  // même .field que l'élément passé — ce qui correspond exactement à la
  // structure HTML réelle (field-error est toujours un enfant direct de .field).
  function setError(inputEl, message){
    const wrap = inputEl.closest('.field');
    if(!wrap) return; // garde-fou : ne jamais planter si la structure change
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

    // Champs texte obligatoires
    ['lastName','firstName','school','speciality','studyLevel','motivation'].forEach(key=>{
      const val = fields[key].el.value.trim();
      if(!val){
        setError(fields[key].el, tr('js.required', "Ce champ est obligatoire."));
        valid = false;
      } else {
        setError(fields[key].el, '');
      }
    });

    // Email
    const emailVal = fields.email.el.value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailVal){
      setError(fields.email.el, tr('js.emailReq', "L'email est obligatoire."));
      valid = false;
    } else if(!emailPattern.test(emailVal)){
      setError(fields.email.el, tr('js.emailBad', "Merci d'indiquer un email valide."));
      valid = false;
    } else {
      setError(fields.email.el, '');
    }

    // Téléphone
    const phoneVal = fields.phone.el.value.trim();
    if(!phoneVal){
      setError(fields.phone.el, tr('js.phoneReq', "Le téléphone est obligatoire."));
      valid = false;
    } else {
      setError(fields.phone.el, '');
    }

    // Parcours
    if(!fields.track.el.value){
      setError(fields.track.el, tr('js.pfeTrack', "Choisis un parcours."));
      valid = false;
    } else {
      setError(fields.track.el, '');
    }

    // Niveau technique
    if(!fields.techLevel.el.value){
      setError(fields.techLevel.el, tr('js.pfeLevel', "Sélectionne ton niveau."));
      valid = false;
    } else {
      setError(fields.techLevel.el, '');
    }

    // Disponibilité
    if(!availability.checked){
      setError(availability, tr('js.pfeAvail', "Merci de confirmer ta disponibilité."));
      valid = false;
    } else {
      setError(availability, '');
    }

    // Consentement
    if(!consent.checked){
      setError(consent, tr('js.pfeConsent', "Ce consentement est obligatoire pour envoyer ta candidature."));
      valid = false;
    } else {
      setError(consent, '');
    }

    return valid;
  }

  pfeForm.addEventListener('submit', function(e){
    e.preventDefault();

    if(!validate()){
      const firstError = pfeForm.querySelector('.has-error');
      if(firstError){ firstError.scrollIntoView({behavior:'smooth', block:'center'}); }
      return;
    }

    // Objet dynamique selon le parcours choisi
    const trackLabel = fields.track.el.value;
    subjectInput.value = `Candidature PFE 9bal el PFE — ${trackLabel}`;

    const original = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = tr('js.sending', 'Envoi en cours...');

    fetch(pfeForm.action, {
      method: 'POST',
      body: new FormData(pfeForm),
      headers: { 'Accept': 'application/json' }
    })
    .then(res=>{
      if(!res.ok) throw new Error('Network error');
      pfeForm.style.display = 'none';
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
