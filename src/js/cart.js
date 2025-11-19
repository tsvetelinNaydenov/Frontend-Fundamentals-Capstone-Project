(function () {
  // ---------- DOM ----------
  // All cart-related DOM elements needed
  const els = {
    body: document.getElementById('cartBody'),
    empty: document.getElementById('cartEmpty'),
    subTotal: document.getElementById('subTotal'),
    shipping: document.getElementById('shipping'),
    grandTotal: document.getElementById('grandTotal'),
    clearBtn: document.getElementById('clearCartBtn'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    checkoutMsg: document.getElementById('checkoutMsg'),
    cartCounter: document.querySelector('.cart-count'),
    summaryCard: document.querySelector('.summary__card'),
  };

  // ---------- DATA ----------
  // Map of products from data.json (id -> product)
  let productsIndex = new Map(); // id -> product (from JSON)
  // Cart state stored in localStorage
  let cart = loadCart();         // { items:[{id,name,image,size,color,price,qty}], updatedAt }

  // Initialize cart page
  init();

  async function init() {
    await loadProducts();
    // Ensure each cart line has latest price / name / image from JSON
    syncPricesFromJson();
    render();
    bindEvents();
  }

  // Load product data so we can sync prices / info
  async function loadProducts() {
    try {
      // cart.html is in src/html → data.json is ../assets/data.json
      const res = await fetch('../assets/data.json');
      const json = await res.json();
      const arr = Array.isArray(json) ? json : (json.data || []);
      productsIndex = new Map(arr.map(p => [String(p.id), p]));
    } catch (e) {
      console.warn('Failed to load data.json, will use stored prices only.', e);
    }
  }

  // Update cart item info from the JSON (price, name, image)
  function syncPricesFromJson() {
    cart.items.forEach(it => {
      const p = productsIndex.get(String(it.id));
      if (p && typeof p.price === 'number') it.price = p.price;
      // optionally sync name/image too if you want:
      if (p?.name) it.name = p.name;
      if (p?.imageUrl) it.image = p.imageUrl;
    });
    saveCart(cart);
  }

  // ---------- RENDER ----------
  function render() {
    // If cart is empty, show empty state and zero totals
    if (!cart.items.length) {
      els.body.innerHTML = '';
      els.empty.hidden = false;
      updateTotals(0, 0, 0, 0);
      updateHeaderCounter(0);
      return;
    }
    els.empty.hidden = true;

    // Build all cart rows
    els.body.innerHTML = cart.items.map((it, idx) => rowHtml(it, idx)).join('');

    // Compute totals for summary
    const { subtotal, discount, shipping, grand } = computeTotals(cart.items);
    updateTotals(subtotal, discount, shipping, grand);

    // Update cart icon counter in header
    const totalQty = cart.items.reduce((s, x) => s + Number(x.qty || 0), 0);
    updateHeaderCounter(totalQty);
  }

  // Return HTML for a single row in the cart
  function rowHtml(it, idx) {
    const unitPrice = Number(it.price || 0);
    const qty = Math.max(1, Number(it.qty || 1));
    const total = unitPrice * qty;

    const size = it.size ? ` • Size: ${escapeHtml(it.size)}` : '';
    const color = it.color ? ` • Color: ${escapeHtml(it.color)}` : '';

    return `
      <div class="cart__row" data-index="${idx}">
        <div class="td td--image">
          <img class="cart__img" src="${escapeAttr(it.image || '')}" alt="${escapeAttr(it.name || '')}">
        </div>
        <div class="td td--name">
          ${escapeHtml(it.name || 'Product')}
          <div class="td__meta" style="color:#777; font-size:12px; margin-top:4px;">
            ID: ${escapeHtml(it.id)}${size}${color}
          </div>
        </div>
        <div class="td td--price">$${unitPrice.toFixed(2)}</div>
        <div class="td td--qty">
          <div class="qty">
            <button class="qty-minus" type="button" aria-label="Decrease">−</button>
            <input class="qty-input" type="number" min="1" value="${qty}" inputmode="numeric">
            <button class="qty-plus" type="button" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="td td--total">$${total.toFixed(2)}</div>
        <div class="td td--delete">
          <button class="cart__del" type="button" aria-label="Remove item">✕</button>
        </div>
      </div>
    `;
  }

  // Calculate subtotal, any discount, shipping, and grand total
  function computeTotals(items) {
    const subtotal = items.reduce((s, it) => s + Number(it.price || 0) * Math.max(1, Number(it.qty || 1)), 0);
    const discount = subtotal > 3000 ? subtotal * 0.10 : 0; // 10% over $3,000
    const shipping = 0; // adjust if you add rules
    const grand = Math.max(0, subtotal - discount + shipping);
    return { subtotal, discount, shipping, grand };
  }

  // Update summary values and optional discount row
  function updateTotals(subtotal, discount, shipping, grand) {
    els.subTotal.textContent = `$${subtotal.toFixed(2)}`;
    els.shipping.textContent = `$${shipping.toFixed(2)}`;
    els.grandTotal.textContent = `$${grand.toFixed(2)}`;

    // show/hide a discount line dynamically under the summary
    let discRow = document.getElementById('summaryDiscountRow');
    if (discount > 0) {
      if (!discRow) {
        discRow = document.createElement('div');
        discRow.id = 'summaryDiscountRow';
        discRow.className = 'summary__row';
        discRow.innerHTML = `<span>Discount (10%)</span><strong id="discountVal"></strong>`;
        els.summaryCard.insertBefore(discRow, els.summaryCard.querySelector('.summary__row--total'));
      }
      const val = discRow.querySelector('#discountVal');
      if (val) val.textContent = `−$${discount.toFixed(2)}`;
    } else if (discRow) {
      discRow.remove();
    }
  }

  // Update little cart count bubble in header
  function updateHeaderCounter(totalQty) {
    if (!els.cartCounter) return;
    els.cartCounter.textContent = String(totalQty || 0);
    // hide counter when empty (as per requirements)
    els.cartCounter.style.display = totalQty > 0 ? '' : 'none';
  }

  // ---------- EVENTS ----------
  function bindEvents() {
    // Handle minus/plus/delete clicks (event delegation on cart body)
    els.body.addEventListener('click', (e) => {
      const row = e.target.closest('.cart__row');
      if (!row) return;
      const index = Number(row.dataset.index);
      const item = cart.items[index];
      if (!item) return;

      if (e.target.classList.contains('qty-minus')) {
        item.qty = Math.max(1, Number(item.qty || 1) - 1);
        saveCart(cart); render();
      }
      if (e.target.classList.contains('qty-plus')) {
        item.qty = Math.max(1, Number(item.qty || 1) + 1);
        saveCart(cart); render();
      }
      if (e.target.classList.contains('cart__del')) {
        cart.items.splice(index, 1);
        saveCart(cart); render();
      }
    });

    // Handle quantity typing directly into the input
    els.body.addEventListener('input', (e) => {
      if (!e.target.classList.contains('qty-input')) return;
      const row = e.target.closest('.cart__row');
      if (!row) return;
      const index = Number(row.dataset.index);
      const item = cart.items[index];
      if (!item) return;

      const val = Math.max(1, Number(e.target.value || 1));
      item.qty = val;
      saveCart(cart);
      // Re-render to refresh row totals and summary
      render();
    });

    // Clear entire cart
    els.clearBtn?.addEventListener('click', () => {
      cart = { items: [], updatedAt: Date.now() };
      saveCart(cart);
      render();
    });

    // Simple checkout: clear cart + show thank-you
    els.checkoutBtn?.addEventListener('click', () => {
      if (!cart.items.length) return;
      cart = { items: [], updatedAt: Date.now() };
      saveCart(cart);
      render();
      if (els.checkoutMsg) {
        els.checkoutMsg.textContent = 'Thank you for your purchase.';
      }
    });
  }

  // ---------- STORAGE ----------
  // Read cart from localStorage
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

  // ---------- utils ----------
  // Escape HTML text inside content
  function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  // Escape HTML text used inside attributes
  function escapeAttr(s = '') {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }
})();
