(function () {
  console.log('[contact] script loaded');

  // Main contact form element
  const form = document.getElementById('contactForm');
  if (!form) return;

  // All fields we validate
  const fields = {
    name: form.querySelector('#name'),
    email: form.querySelector('#email'),
    topic: form.querySelector('#topic'),
    message: form.querySelector('#message'),
  };

  // Element where success/error messages appear
  const statusEl = document.getElementById('contactMsg');

  // Basic email format check
  function isEmailValid(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  // Validate a single field
  function validateField(input) {
    if (!input) return true;

    const value = input.value.trim();
    let valid = true;

    // reset previous error state
    input.classList.remove('is-invalid');

    // email has special rules
    if (input.id === 'email') {
      if (!value || !isEmailValid(value)) {
        valid = false;
      }
    } else if (!value) {
        valid = false;
      }


    // apply the error class if needed
    if (!valid) input.classList.add('is-invalid');

    return valid;
  }

  // Live validation while typing and on blur
  Object.values(fields).forEach((input) => {
    if (!input) return;

    // Check validity during typing
    input.addEventListener('input', () => {
      validateField(input);

      // clear any previous status message
      if (statusEl) statusEl.textContent = '';
      if (statusEl) {
        statusEl.classList.remove(
          'contact-form__status--success',
          'contact-form__status--error'
        );
      }
    });

    // Also validate when leaving the field
    input.addEventListener('blur', () => {
      validateField(input);
    });
  });

  // Handle form submit — no page reload
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validate all fields together
    let allValid = true;
    Object.values(fields).forEach((input) => {
      const isValid = validateField(input);
      allValid = allValid && isValid;
    });

    if (!statusEl) return;

    // If valid → show success, reset form
    if (allValid) {
      statusEl.textContent = 'Thank you! Your message has been sent.';
      statusEl.classList.remove('contact-form__status--error');
      statusEl.classList.add('contact-form__status--success');

      form?.reset();
      Object.values(fields).forEach((input) =>
        input && input.classList.remove('is-invalid')
      );
    } 
    // If not valid → show error message
    else {
      statusEl.textContent =
        'Please correct the highlighted fields and try again.';
      statusEl.classList.remove('contact-form__status--success');
      statusEl.classList.add('contact-form__status--error');
    }
  });
})();

