function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c])
  );
}

function escapeAttr(s = '') {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

// ==============================
// "Top Best Sets" sidebar
// ==============================
(function () {
  const DATA_URL = '../assets/data.json';
  const mount = document.getElementById('bestSetsList');
  if (!mount) return;

  // Remove any hard-coded .bestset items from the aside
  const aside = mount.closest('aside');
  if (aside) {
    aside.querySelectorAll('.bestset').forEach((n) => n.remove());
  }

  init();

  async function init() {
    try {
      const res = await fetch(DATA_URL);
      const json = await res.json();
      const all = Array.isArray(json) ? json : json.data || [];

      // Take only "luggage sets", shuffle, pick 4
      const setsPool = all.filter(
        (p) => String(p.category).toLowerCase() === 'luggage sets'
      );
      const picks = shuffle(setsPool).slice(0, 4);

      // Replace content inside #bestSetsList
      mount.replaceChildren(...picks.map((p) => toNode(bestSetItem(p))));

      console.log('BestSets rendered:', mount.children.length);
    } catch (e) {
      console.error('Failed to load best sets:', e);
    }
  }

  function bestSetItem(p) {
    const name = escapeHtml(p.name || 'Set');
    const img = escapeAttr(p.imageUrl || '');
    const price =
      p.price != null ? `$${Number(p.price).toFixed(0)}` : '—';
    const stars = starsFromRating(p.rating || 0);

    return `
      <a class="bestset" href="product.html?id=${encodeURIComponent(
        p.id
      )}" aria-label="${name}">
        <div class="bestset__thumb">
          <img src="${img}" alt="${name}">
        </div>
        <div class="bestset__meta">
          <div class="bestset__title">${name}</div>
          <div class="bestset__rating">
            ${stars}
            <span class="sr-only">Rating ${p.rating || 0} out of 5</span>
          </div>
          <div class="bestset__price">${price}</div>
        </div>
      </a>
    `;
  }

  // ----- helpers -----
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function starsFromRating(r) {
    const n = Math.max(0, Math.min(5, Math.round(r)));
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  }
  function toNode(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
})();

// ==============================
// Catalog grid: JSON + filters + search + sort + pagination
// ==============================
(function () {
  console.log('[catalog] script initialized');

  const DATA_URL = '../assets/data.json';
  const GRID_SEL = '.catalog__grid';
  const PAGE_SIZE = 12;

  // Filter + UI state
  const filters = { category: '', color: '', size: '', salesStatus: '' };
  let all = []; // all products from JSON
  let searchQuery = '';
  let sortMode = 'default';
  let page = 1;
  let currentList = []; // filtered + searched + sorted

  // DOM refs
  const grid = document.querySelector(GRID_SEL);
  const filterBar = document.querySelector('.catalog__filters');
  const resetBtn = document.querySelector('.filter__reset');
  const searchEl = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const resultsTxt = document.getElementById('resultsText');
  const pagNav = document.querySelector('.catalog__pagination');
  const nextBtn = document.getElementById('nextBtn');

  if (!grid || !filterBar) {
    console.warn('catalog.js: grid or filterBar missing, aborting.');
    return;
  }

  init();

  async function init() {
    try {
      const res = await fetch(DATA_URL);
      const json = await res.json();
      all = Array.isArray(json) ? json : json.data || [];

      // First render
      recomputeAndRender();

      wireFilters();
      wireSearchAndSort();
      wirePagination();
    } catch (e) {
      console.error('Failed to load products:', e);
      grid.innerHTML = '<p>Could not load products.</p>';
    }
  }

  // -----------------------------
  // Wiring
  // -----------------------------
  function wireFilters() {
    // Clicking filter options
    filterBar.addEventListener('click', (e) => {
      const opt = e.target.closest('.filter__option');
      if (!opt) return;

      const menu = opt.closest('.filter__menu');
      const block = opt.closest('.filter');
      const key = block?.dataset.key;
      const value = opt.dataset.value ?? '';
      if (!key) return;

      // Update filter state
      filters[key] = value;

      // Menu visual state
      menu
        .querySelectorAll('.filter__option.is-selected')
        .forEach((n) => n.classList.remove('is-selected'));
      opt.classList.add('is-selected');

      // Button label + active state
      const btnVal = block.querySelector('.filter__value');
      btnVal.textContent = value || btnVal.dataset.placeholder || 'All';
      block.classList.toggle('is-active', !!value);

      page = 1;
      recomputeAndRender();
    });

    // Reset all filters
    resetBtn?.addEventListener('click', () => {
      Object.keys(filters).forEach((k) => (filters[k] = ''));
      resetAllFilterBlocks();
      page = 1;
      recomputeAndRender();
    });

    // On load: mark the first option as selected
    filterBar.querySelectorAll('.filter').forEach((block) => {
      const first = block.querySelector('.filter__menu .filter__option');
      first && first.classList.add('is-selected');
    });
  }

  // small helper functions for wireFilters

  function resetAllFilterBlocks() {
    filterBar
      .querySelectorAll('.filter')
      .forEach((block) => resetFilterBlock(block));
  }

  function resetFilterBlock(block) {
    block.classList.remove('is-active');

    const menu = block.querySelector('.filter__menu');
    resetMenuSelection(menu);

    const val = block.querySelector('.filter__value');
    if (val) {
      val.textContent = val.dataset.placeholder || 'All';
    }
  }

  function resetMenuSelection(menu) {
    if (!menu) return;

    menu
      .querySelectorAll('.filter__option.is-selected')
      .forEach((n) => n.classList.remove('is-selected'));

    const first = menu.querySelector('.filter__option');
    if (first) first.classList.add('is-selected');
  }


  function wireSearchAndSort() {
    // Search by product name
    if (searchEl) {
      searchEl.addEventListener('input', () => {
        searchQuery = searchEl.value.trim().toLowerCase();
        page = 1;
        recomputeAndRender();
      });
    }

    // Sort select
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        sortMode = sortSelect.value || 'default';
        page = 1;
        recomputeAndRender();
      });
    }
  }

  function wirePagination() {
    // Next button
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.max(
          1,
          Math.ceil(currentList.length / PAGE_SIZE)
        );
        if (page < totalPages) {
          page++;
          renderPage();
          buildPagination();
        }
      });
    }
  }

  // -----------------------------
  // Filter + search + sort logic
  // -----------------------------
  function applyFilters(list) {
    return list.filter((p) => {
      if (
        filters.category &&
        String(p.category).toLowerCase() !== filters.category
      )
        return false;
      if (filters.color && String(p.color).toLowerCase() !== filters.color)
        return false;
      if (filters.size && String(p.size) !== filters.size) return false;
      if (filters.salesStatus !== '') {
        const want = filters.salesStatus === 'true';
        if (Boolean(p.salesStatus) !== want) return false;
      }
      return true;
    });
  }

  function applySearch(list) {
    if (!searchQuery) return list;
    return list.filter((p) =>
      String(p.name || '').toLowerCase().includes(searchQuery)
    );
  }

  function applySort(list) {
    const out = list.slice();

    switch (sortMode) {
      case 'price-asc':
        out.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price-desc':
        out.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'name-asc':
        out.sort((a, b) =>
          String(a.name).localeCompare(String(b.name))
        );
        break;
      case 'name-desc':
        out.sort((a, b) =>
          String(b.name).localeCompare(String(a.name))
        );
        break;
      case 'default':
      default:
        // keep original order (as in JSON)
        break;
    }

    return out;
  }

  function recomputeAndRender() {
    const afterFilters = applyFilters(all);
    const afterSearch = applySearch(afterFilters);
    currentList = applySort(afterSearch);

    page = Math.max(
      1,
      Math.min(page, Math.max(1, Math.ceil(currentList.length / PAGE_SIZE)))
    );

    renderPage();
    buildPagination();
  }

  // -----------------------------
  // Rendering
  // -----------------------------
  function renderPage() {
    if (!grid) return;

    if (!currentList.length) {
      grid.innerHTML = '<p>No products match your criteria.</p>';
      if (resultsTxt) resultsTxt.textContent = 'Showing 0–0 Of 0 Results';
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const total = currentList.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, total);
    const slice = currentList.slice(start, end);

    // Replace grid contents with cards from JSON
    grid.innerHTML = slice.map(cardHtml).join('');

    if (resultsTxt) {
      const from = total ? start + 1 : 0;
      resultsTxt.textContent = `Showing ${from}–${end} Of ${total} Results`;
    }

    if (nextBtn) nextBtn.disabled = page >= totalPages;
  }

  function buildPagination() {
    if (!pagNav) return;

    // Remove old page links
    pagNav.querySelectorAll('.page-link').forEach((n) => n.remove());

    const total = currentList.length;
    if (!total) {
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const beforeNext = nextBtn;
    const frag = document.createDocumentFragment();

    for (let i = 1; i <= totalPages; i++) {
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'page-link' + (i === page ? ' is-current' : '');
      if (i === page) a.setAttribute('aria-current', 'page');
      a.dataset.page = String(i);
      a.textContent = String(i);
      a.addEventListener('click', (e) => {
        e.preventDefault();
        page = i;
        renderPage();
        buildPagination();
      });
      frag.appendChild(a);
    }

    if (beforeNext) pagNav.insertBefore(frag, beforeNext);
    else pagNav.appendChild(frag);

    if (nextBtn) nextBtn.disabled = page >= totalPages;
  }

  function cardHtml(p) {
    const id = escapeHtml(p.id || '');
    const name = escapeHtml(p.name || 'Product');
    const img = escapeAttr(p.imageUrl || '');
    const rawPrice = p.price != null ? Number(p.price) : null;
    const priceText =
      rawPrice != null ? `$${rawPrice.toFixed(0)}` : '—';
    const sale = p.salesStatus
      ? '<span class="product-card__badge">SALE</span>'
      : '';

    return `
      <article class="product-card" data-id="${id}" data-name="${name}"
        data-price="${escapeAttr(p.price)}" data-image="${img}">
        <a class="product-card__media"
           href="product.html?id=${encodeURIComponent(p.id)}"
           aria-label="${name}">
          <img src="${img}" alt="${name}">
          ${sale}
        </a>
        <h3 class="product-card__title">${name}</h3>
        <div class="product-card__price">${priceText}</div>
        <button type="button"
                class="btn btn-primary product-card__cta js-add-to-cart">
          Add To Cart
        </button>
      </article>
    `;
  }
})();
