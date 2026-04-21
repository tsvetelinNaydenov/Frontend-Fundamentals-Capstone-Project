// Product page interactions and data rendering.
(function () {
  const tabsWrap = document.querySelector('.product__tabs-wrap');
  const tabButtons = tabsWrap ? [...tabsWrap.querySelectorAll('.tab')] : [];
  const panels = {
    details: document.getElementById('panel-details'),
    reviews: document.getElementById('panel-reviews'),
    shipping: document.getElementById('panel-shipping'),
  };

  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus  = document.getElementById('qtyPlus');
  const qtyInput = document.getElementById('qtyInput');

  const reviewForm = document.getElementById('reviewForm');
  const reviewMsg  = document.getElementById('reviewMsg');

  if (tabsWrap && tabButtons.length) {
    tabsWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      const key = btn.dataset.tab;
      tabButtons.forEach(b => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      Object.entries(panels).forEach(([k, el]) => {
        if (!el) return;
        const active = k === key;
        el.hidden = !active;
        el.classList.toggle('is-active', active);
      });
    });
  }

  const MIN_QTY = 1;
  function clampQty(val) {
    const n = Number(val);
    return Number.isFinite(n) && n >= MIN_QTY ? Math.floor(n) : MIN_QTY;
  }
  qtyMinus && qtyMinus.addEventListener('click', () => {
    qtyInput.value = String(Math.max(MIN_QTY, clampQty(qtyInput.value) - 1));
  });
  qtyPlus && qtyPlus.addEventListener('click', () => {
    qtyInput.value = String(clampQty(qtyInput.value) + 1);
  });
  qtyInput && qtyInput.addEventListener('input', () => {
    qtyInput.value = String(clampQty(qtyInput.value));
  });

  const starHost = document.getElementById('reviewStars');
  const ratingInput = document.getElementById('revRating');

  if (starHost && ratingInput) {
    starHost.innerHTML = '';
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
    setStars(Number(ratingInput.value) || 0);
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name  = (reviewForm.name?.value || '').trim();
      const text  = (reviewForm.text?.value || '').trim();
      const rate  = Number(reviewForm.rating?.value || ratingInput?.value || 0);
      const email = (reviewForm.email?.value || '').trim();
      const emailRegEx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const valid =
        name.length > 2 &&
        emailRegEx.test(email) &&
        text.length > 3 &&
        Number.isFinite(rate) && rate >= 1 && rate <= 5;

      if (!valid) {
        showFormMsg('Please fill all fields and select a rating (1–5).', false);
        return;
      }

      showFormMsg('Thank you! Your review was submitted.', true);
      reviewForm.reset();
      if (starHost && ratingInput) {
        ratingInput.value = '0';
        starHost.querySelectorAll('.star').forEach(s => (s.textContent = '☆'));
      }
    });
  }

  function showFormMsg(msg, ok) {
    if (!reviewMsg) return;
    reviewMsg.textContent = msg;
    reviewMsg.classList.toggle('is-ok', ok);
    reviewMsg.classList.toggle('is-err', !ok);
  }

  const $ = (sel, root = document) => root.querySelector(sel);

  function starsFromRating(r) {
    const n = Math.max(0, Math.min(5, Math.round(r)));
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  }

  const params = new URLSearchParams(location.search);
  const productId = params.get('id');

  initData();

  async function initData() {
    try {
      const res = await fetch('../assets/data.json');
      const json = await res.json();
      const products = Array.isArray(json) ? json : (json.data || []);
      if (!products.length) throw new Error('No products in JSON');

      const prod = products.find(p => String(p.id) === String(productId)) || products[0];
      hydrateProduct(prod);
      renderRelated(products, prod.id);
    } catch (err) {
      console.error('Data load error', err);
      $('#product-title').textContent = 'Product not found';
    }
  }

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

    setSelect('#optSize', p.size);
    setSelect('#optColor', p.color);
    setSelect('#optCategory', p.category);

    const btn = $('#addToCartBtn');
    if (btn) {
      btn.dataset.id = p.id;
      btn.dataset.price = p.price;
      btn.dataset.name = p.name;
      btn.dataset.image = p.imageUrl || '';
    }

    $('#reviewsProductName') && ($('#reviewsProductName').textContent = p.name || '');
  }

  const addBtn = document.getElementById('addToCartBtn') || document.querySelector('.js-add-to-cart');
  const cartCounter = document.querySelector('.cart-count');

  updateCartCounterV2();

  addBtn?.addEventListener('click', () => {
    const id    = addBtn.dataset.id;
    const name  = addBtn.dataset.name || '';
    const price = Number(addBtn.dataset.price || 0);
    const image = addBtn.dataset.image || '';

    const sizeEl  = document.getElementById('optSize');
    const colorEl = document.getElementById('optColor');
    const qtyEl   = document.getElementById('qtyInput');

    const size  = sizeEl ? String(sizeEl.value || '') : '';
    const color = colorEl ? String(colorEl.value || '') : '';
    const qty   = Math.max(1, Number(qtyEl?.value || 1));

    if (!id) return;

    const cart = loadCartV2();

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

    const old = addBtn.textContent;
    addBtn.textContent = 'Added!';
    setTimeout(() => (addBtn.textContent = old), 800);
  });

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

  function setSelect(sel, val) {
    const el = $(sel);
    if (!el) return;
    el.innerHTML = '';
    el.add(new Option('Choose option', ''));
    el.add(new Option(val || '—', val || ''));
    el.value = val || '';
  }

  function renderRelated(list, excludeId) {
    const grid = document.getElementById('relatedGrid');
    if (!grid) return;

    const pool = list.filter(p => String(p.id) !== String(excludeId));
    if (!pool.length) {
      grid.innerHTML = '';
      return;
    }

    const picks = sample(pool, 4);
    grid.innerHTML = picks.map(cardHtml).join('');
  }

  function sample(arr, k) {
    const a = arr.slice();
    for (let i = 0; i < Math.min(k, a.length); i++) {
      const j = i + Math.floor(Math.random() * (a.length - i));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.min(k, a.length));
  }

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

  function escapeHtml(s='') {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }
})();
