(function () {
  'use strict';

  const modal = document.getElementById('questionnaire-modal');
  const form = document.getElementById('questionnaire-form');
  const openBtn = document.getElementById('cta');
  const closeTriggers = document.querySelectorAll('[data-close-modal]');
  const sections = document.querySelectorAll('.q-section');
  const prevBtn = document.querySelector('[data-prev]');
  const nextBtn = document.querySelector('[data-next]');
  const submitBtn = document.querySelector('[data-submit]');
  const sectionIndicator = document.querySelector('.modal-section-indicator');
  const TOTAL_SECTIONS = 5;

  let currentSection = 1;
  let focusableInModal = [];

  // --- Age dropdown ---
  const ageSelect = document.getElementById('q-age');
  if (ageSelect) {
    for (let i = 18; i <= 80; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i;
      ageSelect.appendChild(opt);
    }
  }

  // --- Slider outputs ---
  document.querySelectorAll('.slider').forEach(function (slider) {
    const output = document.querySelector('.slider-value[for="' + slider.id + '"]');
    if (output) {
      output.textContent = slider.value;
      slider.addEventListener('input', function () { output.textContent = this.value; });
    }
  });

  // --- Conditional fields ---
  function getRadioValue(name) {
    const r = document.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : '';
  }

  function getCheckboxValues(name) {
    return Array.from(document.querySelectorAll('input[name="' + name + '"]:checked')).map(function (c) { return c.value; });
  }

  function updateConditionals() {
    document.querySelectorAll('[data-show-when]').forEach(function (el) {
      const name = el.getAttribute('data-show-when');
      const showValue = el.getAttribute('data-show-value');
      const hideValue = el.getAttribute('data-hide-value');
      const isCheckbox = el.getAttribute('data-show-type') === 'checkbox';

      let show = false;
      if (hideValue !== null && hideValue !== '') {
        const val = getRadioValue(name);
        show = val !== '' && val !== hideValue;
      } else if (isCheckbox) {
        const vals = getCheckboxValues(name);
        show = vals.indexOf(showValue) !== -1;
      } else {
        show = getRadioValue(name) === showValue;
      }
      el.hidden = !show;
    });
  }

  document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function (input) {
    input.addEventListener('change', updateConditionals);
  });
  updateConditionals();

  // --- Section visibility ---
  function showSection(index) {
    currentSection = Math.max(1, Math.min(index, TOTAL_SECTIONS));
    sections.forEach(function (sec, i) {
      sec.classList.toggle('is-current', parseInt(sec.getAttribute('data-section'), 10) === currentSection);
    });
    if (sectionIndicator) {
      sectionIndicator.textContent = 'Section ' + currentSection + ' sur ' + TOTAL_SECTIONS;
    }
    prevBtn.disabled = currentSection === 1;
    nextBtn.hidden = currentSection === TOTAL_SECTIONS;
    submitBtn.hidden = currentSection !== TOTAL_SECTIONS;
    if (submitBtn.hidden) submitBtn.disabled = false;
    updateNextState();
  }

  function getFieldsInSection(sectionIndex) {
    const section = document.querySelector('.q-section[data-section="' + sectionIndex + '"]');
    if (!section) return [];
    const inputs = section.querySelectorAll('input[type="text"], input[type="email"], select, input[type="radio"]:not([name="intensite"])');
    const intensiteBlock = section.querySelector('[data-show-when="seances_semaine"][data-hide-value="aucune"]');
    const intensiteRadios = intensiteBlock && !intensiteBlock.hidden ? section.querySelectorAll('input[name="intensite"]') : [];
    const checkboxesObjectifs = section.querySelectorAll('input[name="objectifs"]');
    const checkboxesRelation = section.querySelectorAll('input[name="relation_nourriture"]');
    const requiredRadios = section.querySelectorAll('input[type="radio"][required]');
    const requiredInputs = section.querySelectorAll('input[type="text"][required], input[type="email"][required], select[required]');
    return { section, requiredInputs, requiredRadios, intensiteBlock, intensiteRadios, checkboxesObjectifs, checkboxesRelation };
  }

  function validateSection(index) {
    const ctx = getFieldsInSection(index);
    let valid = true;
    ctx.section.querySelectorAll('.error').forEach(function (e) { e.classList.remove('error'); });

    ctx.requiredInputs.forEach(function (input) {
      if (input.closest('.field-conditional') && input.closest('.field-conditional').hidden) return;
      const v = (input.value || '').trim();
      if (input.type === 'email') {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if (!ok) { input.classList.add('error'); valid = false; }
      } else if (!v) {
        input.classList.add('error');
        valid = false;
      }
    });

    ctx.requiredRadios.forEach(function (radio) {
      const name = radio.name;
      const group = ctx.section.querySelectorAll('input[name="' + name + '"]');
      const checked = ctx.section.querySelector('input[name="' + name + '"]:checked');
      if (!checked && group.length) {
        group.forEach(function (r) { r.closest('.radio-label') && r.closest('.radio-label').classList.add('error'); });
        valid = false;
      }
    });

    if (index === 2 && ctx.intensiteBlock && !ctx.intensiteBlock.hidden) {
      const intensiteChecked = ctx.section.querySelector('input[name="intensite"]:checked');
      if (!intensiteChecked) {
        ctx.intensiteBlock.classList.add('error');
        valid = false;
      }
    }

    if (index === 3) {
      const atLeastOne = ctx.checkboxesObjectifs.length && Array.from(ctx.checkboxesObjectifs).some(function (c) { return c.checked; });
      if (!atLeastOne) {
        ctx.checkboxesObjectifs[0].closest('.checkbox-group').classList.add('error');
        valid = false;
      }
      if (getRadioValue('remise_forme') === 'oui') {
        const arret = document.getElementById('q-arret');
        const pasAbandonner = document.getElementById('q-pas_abandonner');
        if (arret && (arret.value || '').trim() === '') { arret.classList.add('error'); valid = false; }
        if (pasAbandonner && (pasAbandonner.value || '').trim() === '') { pasAbandonner.classList.add('error'); valid = false; }
      }
    }

    if (index === 4) {
      const atLeastOne = ctx.checkboxesRelation.length && Array.from(ctx.checkboxesRelation).some(function (c) { return c.checked; });
      if (!atLeastOne) {
        ctx.checkboxesRelation[0].closest('.checkbox-group').classList.add('error');
        valid = false;
      }
      if (getCheckboxValues('relation_nourriture').indexOf('trouble_alimentaire') !== -1) {
        const suivi = ctx.section.querySelector('input[name="suivi_professionnel_trouble"]:checked');
        if (!suivi) {
          const group = ctx.section.querySelectorAll('input[name="suivi_professionnel_trouble"]');
          group.forEach(function (r) { r.closest('.radio-label') && r.closest('.radio-label').classList.add('error'); });
          valid = false;
        }
      }
    }

    return valid;
  }

  function updateNextState() {
    nextBtn.disabled = !validateSection(currentSection);
  }

  form.addEventListener('change', updateNextState);
  form.addEventListener('input', updateNextState);

  prevBtn.addEventListener('click', function () {
    showSection(currentSection - 1);
  });

  nextBtn.addEventListener('click', function () {
    if (!validateSection(currentSection)) return;
    showSection(currentSection + 1);
  });

  // --- Modal open/close ---
  function getFocusables() {
    return modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
  }

  function openModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
    currentSection = 1;
    showSection(1);
    focusableInModal = Array.from(getFocusables());
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      const first = focusableInModal[0];
      if (first) first.focus();
    }, 50);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (openBtn) {
      openBtn.setAttribute('aria-expanded', 'false');
      openBtn.focus();
    }
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openModal);
  closeTriggers.forEach(function (btn) {
    btn.addEventListener('click', closeModal);
  });

  modal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key !== 'Tab' || focusableInModal.length === 0) return;
    const first = focusableInModal[0];
    const last = focusableInModal[focusableInModal.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  modal.addEventListener('focusin', function () {
    focusableInModal = Array.from(getFocusables());
  });

  // --- Form submit ---
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateSection(TOTAL_SECTIONS)) return;

    const data = {};
    new FormData(form).forEach(function (value, key) {
      if (key === 'objectifs' || key === 'relation_nourriture') {
        if (!data[key]) data[key] = [];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });

    // Optional: send to Formspree or your backend
    // fetch('https://formspree.io/f/YOUR_ID', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
    console.log('Questionnaire data:', data);
    alert('Merci! Ton questionnaire a bien été enregistré. Nous te recontacterons pour planifier l\'appel vidéo.');
    closeModal();
    form.reset();
    updateConditionals();
    showSection(1);
  });

  showSection(1);
})();
