(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const fields = {
    name: form.querySelector('#name'),
    email: form.querySelector('#email'),
    topic: form.querySelector('#topic'),
    message: form.querySelector('#message'),
  };

  const statusEl = document.getElementById('contactMsg');

  function isEmailValid(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function validateField(input) {
    if (!input) return true;

    const value = input.value.trim();
    let valid = true;

    input.classList.remove('is-invalid');

    if (input.id === 'email') {
      if (!value || !isEmailValid(value)) {
        valid = false;
      }
    } else if (!value) {
        valid = false;
      }


    if (!valid) input.classList.add('is-invalid');

    return valid;
  }

  Object.values(fields).forEach((input) => {
    if (!input) return;

    input.addEventListener('input', () => {
      validateField(input);

      if (statusEl) statusEl.textContent = '';
      if (statusEl) {
        statusEl.classList.remove(
          'contact-form__status--success',
          'contact-form__status--error'
        );
      }
    });

    input.addEventListener('blur', () => {
      validateField(input);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let allValid = true;
    Object.values(fields).forEach((input) => {
      const isValid = validateField(input);
      allValid = allValid && isValid;
    });

    if (!statusEl) return;

    if (allValid) {
      statusEl.textContent = 'Thank you! Your message has been sent.';
      statusEl.classList.remove('contact-form__status--error');
      statusEl.classList.add('contact-form__status--success');

      form?.reset();
      Object.values(fields).forEach((input) =>
       input?.classList.remove('is-invalid')
      );
    } 
    else {
      statusEl.textContent =
        'Please correct the highlighted fields and try again.';
      statusEl.classList.remove('contact-form__status--success');
      statusEl.classList.add('contact-form__status--error');
    }
  });
})();

