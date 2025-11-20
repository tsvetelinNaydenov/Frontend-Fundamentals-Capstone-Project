// =======================
// Cart Logic
// =======================

// Update cart counter + handle add-to-cart actions
(function () {

  // Load cart from localStorage
  function loadCart() {
    try {
      const c = JSON.parse(localStorage.getItem('cart'));
      if (c && Array.isArray(c.items)) return c;
    } catch {}
    return { items: [] };
  }

  // Save cart to localStorage
  function saveCart(c) {
    localStorage.setItem('cart', JSON.stringify(c));
  }

  // Update the cart count in the header
  function updateCartCounter() {
    const el = document.querySelector('.cart-count');
    if (!el) return;

    const cart = loadCart();
    const total = cart.items.reduce((s, it) => s + Number(it.qty || 0), 0);

    el.textContent = String(total || 0);
    el.style.display = total > 0 ? '' : 'none';
  }

  // Add product to cart (or update qty if already in cart)
  function addToCart({ id, name, image, price, size = '', color = '', qty = 1 }) {
    if (!id) return;

    const cart = loadCart();
    const line = cart.items.find(it => it.id === id && it.size === size && it.color === color);

    if (line) {
      line.qty += qty;
      if (price != null) line.price = price;
      if (name) line.name = name;
      if (image) line.image = image;
    } else {
      cart.items.push({
        id,
        name: name || 'Product',
        image: image || '',
        size,
        color,
        price: Number(price || 0),
        qty: Math.max(1, qty)
      });
    }

    cart.updatedAt = Date.now();
    saveCart(cart);
    updateCartCounter();
  }

  // Read product info from the product card
  function readCardData(card) {
    const title = card.querySelector('.product-card__title')?.textContent?.trim()
      || card.dataset.name || '';

    const priceTxt = card.querySelector('.product-card__price')?.textContent
      || card.dataset.price || '';

    const match = /[\d.]+/.exec(String(priceTxt));
    const price = Number(match?.[0] || 0);

    const img = card.querySelector('.product-card__media img')?.getAttribute('src')
      || card.dataset.image || '';

    let id = card.dataset.id || '';

    const link = card.querySelector('.product-card__media[href], .product-card__media a, a[href*="product.html"]');
    const href = link?.getAttribute?.('href') || '';
    const m = href.match(/[?&]id=([^&#]+)/i);

    if (m) id = decodeURIComponent(m[1]);

    return { id, name: title, image: img, price };
  }

  // Handle clicking any "Add to cart" button
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-add-to-cart');
    if (!btn) return;

    if (btn.tagName.toLowerCase() === 'a') e.preventDefault();

    const card = btn.closest('.product-card');
    if (!card) return;

    const data = readCardData(card);
    addToCart({ ...data, qty: 1 });

    // Temporary "Added!" feedback
    const old = btn.textContent;
    btn.textContent = 'Added!';
    setTimeout(() => btn.textContent = old, 800);
  });

  // Update cart count on page load
  document.addEventListener('DOMContentLoaded', updateCartCounter);

})();


// =======================
// Login Modal Logic
// =======================

// Login modal open/close + validation
(function () {
  console.log('[main] login modal init');

  const accountBtn = document.querySelector('.account-btn');
  const modal = document.getElementById('loginModal');
  const dialog = modal ? modal.querySelector('.login-modal__dialog') : null;
  const backdrop = modal ? modal.querySelector('.login-modal__backdrop') : null;
  const closeBtn = modal ? modal.querySelector('.login-modal__close') : null;
  const form = document.getElementById('loginForm');
  const emailInput = form ? form.querySelector('#loginEmail') : null;
  const passwordInput = form ? form.querySelector('#loginPassword') : null;
  const toggleBtn = form ? form.querySelector('.login-form__toggle') : null;

  // If anything essential is missing, stop script
  if (!accountBtn || !modal || !dialog || !form || !emailInput || !passwordInput) return;

  // Basic email check
  function isEmailValid(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  // Open modal
  function showModal() {
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');

  // Open the <dialog>
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    // Fallback: just set "open" attribute
    dialog.setAttribute('open', 'true');
  }

  emailInput.focus();
  document.addEventListener('keydown', onKeyDown);
}

  // Close modal and reset form
  function closeModal() {
  // Close the <dialog>
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }

  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', onKeyDown);
  form.reset();

  [emailInput, passwordInput].forEach((el) =>
    el.classList.remove('is-invalid')
  );

  form
    .querySelectorAll('.login-form__error')
    .forEach((p) => (p.textContent = ''));
}

  // Close with Escape key
  function onKeyDown(e) {
    if (e.key === 'Escape') closeModal();
  }

  // Open modal when clicking account icon
  accountBtn.addEventListener('click', showModal);

  // Close via X or backdrop
  closeBtn && closeBtn.addEventListener('click', closeModal);
  backdrop && backdrop.addEventListener('click', closeModal);

  // Toggle password visibility
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';

      toggleBtn.setAttribute(
        'aria-label',
        isHidden ? 'Hide password' : 'Show password'
      );
    });
  }

  // Show or hide validation messages
  function setError(input, message) {
    const key = input.id === 'loginEmail' ? 'email' : 'password';
    const msgEl = form.querySelector(`.login-form__error[data-for="${key}"]`);

    input.classList.toggle('is-invalid', !!message);
    if (msgEl) msgEl.textContent = message || '';
  }

  // Validate email field
  function validateEmail() {
    const value = emailInput.value.trim();

    if (!value) {
      setError(emailInput, 'Please enter your email address.');
      return false;
    }
    if (!isEmailValid(value)) {
      setError(emailInput, 'Please enter a valid email address.');
      return false;
    }
    setError(emailInput, '');
    return true;
  }

  // Validate password field
  function validatePassword() {
    const value = passwordInput.value.trim();

    if (!value) {
      setError(passwordInput, 'Please enter your password.');
      return false;
    }
    setError(passwordInput, '');
    return true;
  }

  // Live validation
  emailInput.addEventListener('input', validateEmail);
  passwordInput.addEventListener('input', validatePassword);

  // Submit form
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const okEmail = validateEmail();
    const okPass = validatePassword();

    if (!okEmail || !okPass) return;

    // Form success — just close modal for this project
    closeModal();
  });

})();
