// Product page interactions: tabs, quantity, reviews, data loading, add-to-cart
(function () {
  // Tabs container and buttons
  const tabsWrap = document.querySelector('.product__tabs-wrap');
  const tabButtons = tabsWrap ? [...tabsWrap.querySelectorAll('.tab')] : [];
  const panels = {
    details: document.getElementById('panel-details'),
    reviews: document.getElementById('panel-reviews'),
    shipping: document.getElementById('panel-shipping'),
  };

  // Quantity controls
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus  = document.getElementById('qtyPlus');
  const qtyInput = document.getElementById('qtyInput');

  // Review form + message area
  const reviewForm = document.getElementById('reviewForm');
  const reviewMsg  = document.getElementById('reviewMsg');

  // Tabs: toggle active tab + panel
  if (tabsWrap && tabButtons.length) {
    tabsWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      const key = btn.dataset.tab; // details|reviews|shipping

      // buttons state
      tabButtons.forEach(b => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      // panels state
      Object.entries(panels).forEach(([k, el]) => {
        if (!el) return;
        const active = k === key;
        el.hidden = !active;
        el.classList.toggle('is-active', active);
      });
    });
  }

  // Quantity: + / - with min = 1
  const MIN_QTY = 1;
  // Ensure qty is a valid integer >= MIN_QTY
  function clampQty(val) {
    const n = Number(val);
    return Number.isFinite(n) && n >= MIN_QTY ? Math.floor(n) : MIN_QTY;
  }
  // Decrease quantity
  qtyMinus && qtyMinus.addEventListener('click', () => {
    qtyInput.value = String(Math.max(MIN_QTY, clampQty(qtyInput.value) - 1));
  });
  // Increase quantity
  qtyPlus && qtyPlus.addEventListener('click', () => {
    qtyInput.value = String(clampQty(qtyInput.value) + 1);
  });
  // Validate typed quantity
  qtyInput && qtyInput.addEventListener('input', () => {
    qtyInput.value = String(clampQty(qtyInput.value));
  });

  // Reviews: star UI (optional) + validation + message
  const starHost = document.getElementById('reviewStars');
  const ratingInput = document.getElementById('revRating');

  // Build clickable star rating UI if container + input exist
  if (starHost && ratingInput) {
    starHost.innerHTML = ''; // create 5 buttons
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'star';
      b.setAttribute('aria-label', `${i} star${i>1?'s':''}`);
      b.textContent = '☆';
      b.addEventListener('click', () => setStars(i));
      stars.push(b);
      starHost.appendChild(b);
    }
    function setStars(n) {
      ratingInput.value = String(n);
      stars.forEach((s, i) => (s.textContent = i < n ? '★' : '☆'));
    }
    // initialize from current value
    setStars(Number(ratingInput.value) || 0);
  }

  // Handle review form submit: basic validation + message
  if (reviewForm) {
    reviewForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name  = (reviewForm.name?.value || '').trim();
      const email = (reviewForm.email?.value || '').trim(); // if you add one
      const text  = (reviewForm.text?.value || '').trim();
      const rate  = Number(reviewForm.rating?.value || ratingInput?.value || 0);

      const valid =
        name.length > 1 &&
        text.length > 3 &&
        Number.isFinite(rate) && rate >= 1 && rate <= 5;

      if (!valid) {
        showFormMsg('Please fill all fields and select a rating (1–5).', false);
        return;
      }

      // Simulate async success (no reload)
      showFormMsg('Thank you! Your review was submitted.', true);
      reviewForm.reset();
      if (starHost && ratingInput) {
        // reset stars to 0
        ratingInput.value = '0';
        starHost.querySelectorAll('.star').forEach(s => (s.textContent = '☆'));
      }
    });
  }

  // Show status message under review form
  function showFormMsg(msg, ok) {
    if (!reviewMsg) return;
    reviewMsg.textContent = msg;
    reviewMsg.classList.toggle('is-ok', ok);
    reviewMsg.classList.toggle('is-err', !ok);
  }

  // Small helper for querySelector
  const $ = (sel, root = document) => root.querySelector(sel);

  // Turn numeric rating into ★★★☆☆ text
  function starsFromRating(r) {
    const n = Math.max(0, Math.min(5, Math.round(r)));
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  }

  // -----------------------------------------
  // PRODUCT DATA: load from JSON by ?id=
  // -----------------------------------------
  const params = new URLSearchParams(location.search);
  const productId = params.get('id');

  initData();

  async function initData() {
    try {
      const res = await fetch('../assets/data.json'); // path from src/html/
      const json = await res.json();
      const products = Array.isArray(json) ? json : (json.data || []);
      if (!products.length) throw new Error('No products in JSON');

      // Find current product by id, fallback to first
      const prod = products.find(p => String(p.id) === String(productId)) || products[0];
      hydrateProduct(prod);
      renderRelated(products, prod.id);
    } catch (err) {
      console.error('Data load error', err);
      $('#product-title').textContent = 'Product not found';
    }
  }

  // Fill the product page with loaded product data
  function hydrateProduct(p) {
    $('#product-title').textContent = p.name || '—';
    $('#price').textContent = p.price ? `$${p.price}` : '—';
    $('#ratingStars').textContent = starsFromRating(p.rating || 0);
    $('#ratingValue').textContent = `(${p.rating || 0} Clients Review)`;

    const img = $('#mainImage');
    if (img) {
      img.src = p.imageUrl || '';
      img.alt = p.name || '';
    }

    // Set dropdowns for size, color, category
    setSelect('#optSize', p.size);
    setSelect('#optColor', p.color);
    setSelect('#optCategory', p.category);

    // Store product data on "Add to Cart" button
    const btn = $('#addToCartBtn');
    if (btn) {
      btn.dataset.id = p.id;
      btn.dataset.price = p.price;
      btn.dataset.name = p.name;
      btn.dataset.image = p.imageUrl || '';
    }

    // Show product name above reviews, if element exists
    $('#reviewsProductName') && ($('#reviewsProductName').textContent = p.name || '');
  }

  // -----------------------------------------
  // ADD TO CART (product page)
  // -----------------------------------------
  const addBtn = document.getElementById('addToCartBtn') || document.querySelector('.js-add-to-cart');
  const cartCounter = document.querySelector('.cart-count');

  // initialize counter on page load
  updateCartCounterV2();

  addBtn?.addEventListener('click', () => {
    const id    = addBtn.dataset.id;
    const name  = addBtn.dataset.name || '';
    const price = Number(addBtn.dataset.price || 0);
    const image = addBtn.dataset.image || '';

    // read options & qty from the page
    const sizeEl  = document.getElementById('optSize');
    const colorEl = document.getElementById('optColor');
    const qtyEl   = document.getElementById('qtyInput');

    const size  = sizeEl ? String(sizeEl.value || '') : '';
    const color = colorEl ? String(colorEl.value || '') : '';
    const qty   = Math.max(1, Number(qtyEl?.value || 1));

    if (!id) return;

    const cart = loadCartV2(); // { items: [] }

    // merge by id+size+color
    const line = cart.items.find(it => it.id === id && it.size === size && it.color === color);
    if (line) {
      line.qty += qty;
      if (price) line.price = price;
      if (name)  line.name  = name;
      if (image) line.image = image;
    } else {
      cart.items.push({ id, name, image, size, color, price, qty });
    }

    cart.updatedAt = Date.now();
    saveCartV2(cart);
    updateCartCounterV2();

    // tiny feedback
    const old = addBtn.textContent;
    addBtn.textContent = 'Added!';
    setTimeout(() => (addBtn.textContent = old), 800);
  });

  // v2 cart helpers (same structure your cart page expects)
  function loadCartV2() {
    try {
      const c = JSON.parse(localStorage.getItem('cart'));
      if (c && Array.isArray(c.items)) return c;
    } catch {}
    return { items: [] };
  }
  function saveCartV2(c) {
    localStorage.setItem('cart', JSON.stringify(c));
  }
  function updateCartCounterV2() {
    const c = loadCartV2();
    const total = c.items.reduce((s, it) => s + Number(it.qty || 0), 0);
    if (cartCounter) {
      cartCounter.textContent = String(total || 0);
      cartCounter.style.display = total > 0 ? '' : 'none';
    }
  }

  // -----------------------------------------
  // Helper to set single-value <select>
  // -----------------------------------------
  function setSelect(sel, val) {
    const el = $(sel);
    if (!el) return;
    el.innerHTML = '';
    el.add(new Option('Choose option', ''));
    el.add(new Option(val || '—', val || ''));
    el.value = val || '';
  }

  // -----------------------------------------
  // RELATED PRODUCTS (bottom grid)
  // -----------------------------------------
  function renderRelated(list, excludeId) {
    const grid = document.getElementById('relatedGrid');
    if (!grid) return;

    // exclude current product
    const pool = list.filter(p => String(p.id) !== String(excludeId));
    if (!pool.length) {
      grid.innerHTML = '';
      return;
    }

    // pick 4 random unique products
    const picks = sample(pool, 4);
    grid.innerHTML = picks.map(cardHtml).join('');
  }

  // Random sample of size k (no repeats)
  function sample(arr, k) {
    const a = arr.slice();
    // Fisher–Yates partial shuffle
    for (let i = 0; i < Math.min(k, a.length); i++) {
      const j = i + Math.floor(Math.random() * (a.length - i));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.min(k, a.length));
  }

  // Build HTML for a related product card
  function cardHtml(p) {
    const name  = p.name || 'Product';
    const img   = p.imageUrl || '';
    const price = (p.price != null) ? `$${Number(p.price).toFixed(0)}` : '—';
    const sale  = p.salesStatus ? '<span class="product-card__badge">SALE</span>' : '';

    return `
    <article class="product-card" data-name="${escapeHtml(name)}" data-price="${escapeHtml(p.price)}">
      <a class="product-card__media" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="${escapeHtml(name)}">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(name)}">
        ${sale}
      </a>
      <h3 class="product-card__title">${escapeHtml(name)}</h3>
      <div class="product-card__price">${price}</div>
      <a class="btn btn-primary product-card__cta" href="product.html?id=${encodeURIComponent(p.id)}">Add To Cart</a>
    </article>
  `;
  }

  // Simple HTML escaping for strings used in markup
  function escapeHtml(s='') {
    return String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Generic array shuffle (unused here but kept if you use it elsewhere)
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
})();
