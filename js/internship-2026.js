/* ============================================================
   internship-2026.js
   Même organisation que pfe-before-pfe.js (convention du projet) :
   - menu mobile (drawer)
   - reveal au scroll (IntersectionObserver)
   - envoi du formulaire via FormSubmit.co vers codioacademy@outlook.com
     (fetch() POST + Accept: application/json, comme les autres formulaires)
   L'objet de l'email est généré dynamiquement selon le domaine choisi.

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

/* ============================================================
   FORMULAIRE — Stages PFE accompagnés
   FormSubmit.co → codioacademy@outlook.com
   ============================================================ */
const internForm = document.getElementById('internForm');

if(internForm){
  const fields = {
    lastName:   document.getElementById('internLastName'),
    firstName:  document.getElementById('internFirstName'),
    email:      document.getElementById('internEmail'),
    phone:      document.getElementById('internPhone'),
    school:     document.getElementById('internSchool'),
    speciality: document.getElementById('internSpeciality'),
    studyLevel: document.getElementById('internStudyLevel'),
    domain:     document.getElementById('internDomain'),
    status:     document.getElementById('internStatus'),
  };
  const consent = document.getElementById('internConsent');
  const subjectInput = document.getElementById('internSubject');
  const submitBtn = internForm.querySelector('button[type="submit"]');
  const successPanel = document.getElementById('internSuccess');

  // setError() prend directement l'élément (input/select/checkbox) et cherche
  // le .field-error dans le même .field (garde-fou si la structure change).
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

    // Champs texte obligatoires
    ['lastName','firstName','school','speciality','studyLevel'].forEach(key=>{
      if(!fields[key].value.trim()){
        setError(fields[key], tr('js.required', "Ce champ est obligatoire."));
        valid = false;
      } else {
        setError(fields[key], '');
      }
    });

    // Email
    const emailVal = fields.email.value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailVal){
      setError(fields.email, tr('js.emailReq', "L'email est obligatoire."));
      valid = false;
    } else if(!emailPattern.test(emailVal)){
      setError(fields.email, tr('js.emailBad', "Merci d'indiquer un email valide."));
      valid = false;
    } else {
      setError(fields.email, '');
    }

    // Téléphone
    if(!fields.phone.value.trim()){
      setError(fields.phone, tr('js.phoneReq', "Le téléphone est obligatoire."));
      valid = false;
    } else {
      setError(fields.phone, '');
    }

    // Domaine
    if(!fields.domain.value){
      setError(fields.domain, tr('js.intDomain', "Choisis un domaine."));
      valid = false;
    } else {
      setError(fields.domain, '');
    }

    // Avancement du PFE
    if(!fields.status.value){
      setError(fields.status, tr('js.intStatus', "Indique où en est ton PFE."));
      valid = false;
    } else {
      setError(fields.status, '');
    }

    // Consentement
    if(!consent.checked){
      setError(consent, tr('js.intConsent', "Ce consentement est obligatoire pour envoyer ta demande."));
      valid = false;
    } else {
      setError(consent, '');
    }

    return valid;
  }

  internForm.addEventListener('submit', function(e){
    e.preventDefault();

    if(!validate()){
      const firstError = internForm.querySelector('.has-error');
      if(firstError){ firstError.scrollIntoView({behavior:'smooth', block:'center'}); }
      return;
    }

    // Objet dynamique selon le domaine choisi
    subjectInput.value = `Demande d'accompagnement stage PFE — ${fields.domain.value}`;

    const original = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = tr('js.sending', 'Envoi en cours...');

    fetch(internForm.action, {
      method: 'POST',
      body: new FormData(internForm),
      headers: { 'Accept': 'application/json' }
    })
    .then(res=>{
      if(!res.ok) throw new Error('Network error');
      internForm.style.display = 'none';
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
