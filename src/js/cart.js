(function () {
  // Cart page wiring.
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

  let productsIndex = new Map();
  let cart = loadCart();

  init();

  async function init() {
    await loadProducts();
    syncPricesFromJson();
    render();
    bindEvents();
  }

  async function loadProducts() {
    try {
      const res = await fetch('../assets/data.json');
      const json = await res.json();
      const arr = Array.isArray(json) ? json : (json.data || []);
      productsIndex = new Map(arr.map(p => [String(p.id), p]));
    } catch (e) {
      console.warn('Failed to load data.json, will use stored prices only.', e);
    }
  }

  function syncPricesFromJson() {
    cart.items.forEach(it => {
      const p = productsIndex.get(String(it.id));
      if (p && typeof p.price === 'number') it.price = p.price;
      if (p?.name) it.name = p.name;
      if (p?.imageUrl) it.image = p.imageUrl;
    });
    saveCart(cart);
  }

  function render() {
    if (!cart.items.length) {
      els.body.innerHTML = '';
      els.empty.hidden = false;
      updateTotals(0, 0, 0, 0);
      updateHeaderCounter(0);
      return;
    }
    els.empty.hidden = true;

    els.body.innerHTML = cart.items.map((it, idx) => rowHtml(it, idx)).join('');
    const { subtotal, discount, shipping, grand } = computeTotals(cart.items);
    updateTotals(subtotal, discount, shipping, grand);

    const totalQty = cart.items.reduce((s, x) => s + Number(x.qty || 0), 0);
    updateHeaderCounter(totalQty);
  }

  function rowHtml(it, idx) {
  const unitPrice = Number(it.price || 0);
  const qty = Math.max(1, Number(it.qty || 1));
  const total = unitPrice * qty;

  return `
    <div class="cart__row" data-index="${idx}">
      <div class="td td--image">
        <img class="cart__img" src="${escapeAttr(it.image || '')}" alt="${escapeAttr(it.name || '')}">
      </div>
      <div class="td td--name">
        ${escapeHtml(it.name || 'Product')}
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

  function computeTotals(items) {
    const subtotal = items.reduce((s, it) => s + Number(it.price || 0) * Math.max(1, Number(it.qty || 1)), 0);
    const discount = subtotal > 3000 ? subtotal * 0.10 : 0;
    const shipping = 0;
    const grand = Math.max(0, subtotal - discount + shipping);
    return { subtotal, discount, shipping, grand };
  }

  function updateTotals(subtotal, discount, shipping, grand) {
    els.subTotal.textContent = `$${subtotal.toFixed(2)}`;
    els.shipping.textContent = `$${shipping.toFixed(2)}`;
    els.grandTotal.textContent = `$${grand.toFixed(2)}`;

    let discRow = document.getElementById('summaryDiscountRow');
    if (discount > 0) {
      if (!discRow) {
        discRow = document.createElement('div');
        discRow.id = 'summaryDiscountRow';
        discRow.className = 'summary__row';
        discRow.innerHTML = '<span>Discount (10%)</span><strong id="discountVal"></strong>';
        els.summaryCard.insertBefore(discRow, els.summaryCard.querySelector('.summary__row--total'));
      }
      const val = discRow.querySelector('#discountVal');
      if (val) val.textContent = `−$${discount.toFixed(2)}`;
    } else if (discRow) {
      discRow.remove();
    }
  }

  function updateHeaderCounter(totalQty) {
    if (!els.cartCounter) return;
    els.cartCounter.textContent = String(totalQty || 0);
    els.cartCounter.style.display = totalQty > 0 ? '' : 'none';
  }

  function bindEvents() {
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
      render();
    });

    els.clearBtn?.addEventListener('click', () => {
      cart = { items: [], updatedAt: Date.now() };
      saveCart(cart);
      render();
    });

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

  function loadCart() {
    try {
      const c = JSON.parse(localStorage.getItem('cart'));
      if (c && Array.isArray(c.items)) return c;
    } catch {}
    return { items: [] };
  }
  function saveCart(c) {
    localStorage.setItem('cart', JSON.stringify(c));
  }

  function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }
  function escapeAttr(s = '') {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }
})();
