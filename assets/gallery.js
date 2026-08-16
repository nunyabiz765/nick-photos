// The Light Lair — manifest-driven gallery. Zero dependencies.
// Renders from assets/gallery.json (fetched); falls back to the
// window.NS_MANIFEST twin so file:// preview works too.
// Phase 2 swaps MANIFEST_URL for the R2/Worker endpoint — nothing else changes.
(function () {
  const MANIFEST_URL = 'assets/gallery.json';
  const grid = document.getElementById('grid');

  function loadManifest() {
    return fetch(MANIFEST_URL)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(() => {
        if (window.NS_MANIFEST) return window.NS_MANIFEST;
        throw new Error('No gallery manifest available');
      });
  }

  function render(manifest) {
    const frag = document.createDocumentFragment();
    manifest.photos.forEach(p => {
      const fig = document.createElement('figure');
      fig.className = 'item';
      fig.dataset.cat = p.category;
      const img = document.createElement('img');
      img.width = p.w; img.height = p.h;
      img.loading = 'lazy';
      img.src = p.thumb;
      img.dataset.full = p.full;
      img.alt = p.alt || '';
      fig.appendChild(img);
      if (p.caption) {
        const cap = document.createElement('figcaption');
        cap.className = 'cap';
        cap.textContent = p.caption;
        fig.appendChild(cap);
      }
      frag.appendChild(fig);
    });
    grid.appendChild(frag);
    init();
  }

  function init() {
    const items = Array.from(grid.querySelectorAll('.item'));
    const filters = document.querySelectorAll('.filters button');

    // ---- masonry: derive each tile's grid row-span from its rendered height ----
    const GRID_ROW = 8, GRID_GAP = 14;
    function sizeItem(it) {
      if (it.classList.contains('hide')) { it.style.gridRowEnd = ''; return; }
      const img = it.querySelector('img');
      let h = img.getBoundingClientRect().height;
      if (!h && img.getAttribute('width')) h = it.clientWidth * (+img.getAttribute('height')) / (+img.getAttribute('width'));
      if (!h) return;
      it.style.gridRowEnd = 'span ' + Math.max(1, Math.round((h + GRID_GAP) / (GRID_ROW + GRID_GAP)));
    }
    function layoutMasonry() { items.forEach(sizeItem); }
    let rAF = null;
    window.addEventListener('resize', function () {
      if (rAF) cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(layoutMasonry);
    });
    items.forEach(it => {
      const img = it.querySelector('img');
      if (!img.complete) img.addEventListener('load', () => sizeItem(it));
    });

    // ---- loose-tag filter (default: everything) ----
    const activeBtn = document.querySelector('.filters button.active') || filters[0];
    let current = activeBtn ? activeBtn.dataset.filter : 'all';
    function applyFilter(cat) {
      items.forEach(it => it.classList.toggle('hide', !(cat === 'all' || it.dataset.cat === cat)));
    }
    applyFilter(current);
    layoutMasonry();
    filters.forEach(btn => btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      current = btn.dataset.filter;
      grid.classList.add('switching');
      setTimeout(function () {
        applyFilter(current);
        layoutMasonry();
        requestAnimationFrame(function () { grid.classList.remove('switching'); });
      }, 190);
    }));

    const visible = () => items.filter(it => !it.classList.contains('hide'));

    // ---- lightbox ----
    const lb = document.getElementById('lightbox');
    const lbImg = lb.querySelector('img');
    const lbCap = lb.querySelector('.lb-cap');
    const lbCount = lb.querySelector('.lb-count');
    let idx = 0, list = [];

    function open(startItem) {
      list = visible();
      idx = list.indexOf(startItem);
      show();
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function show() {
      const it = list[idx];
      if (!it) return;
      const img = it.querySelector('img');
      lbImg.src = img.dataset.full;
      lbImg.alt = img.alt;
      const cap = it.querySelector('.cap');
      lbCap.textContent = cap ? cap.textContent : '';
      lbCount.textContent = (idx + 1) + ' / ' + list.length;
    }
    function step(d) { idx = (idx + d + list.length) % list.length; show(); }
    function close() { lb.classList.remove('open'); document.body.style.overflow = ''; }

    items.forEach(it => it.addEventListener('click', () => open(it)));
    lb.querySelector('.lb-next').addEventListener('click', e => { e.stopPropagation(); step(1); });
    lb.querySelector('.lb-prev').addEventListener('click', e => { e.stopPropagation(); step(-1); });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    });
  }

  loadManifest().then(render).catch(err => {
    grid.innerHTML = '<p class="nojs">Could not load the gallery manifest (' + err.message + ').</p>';
  });
})();
