// ============================================================
//  GRAN ESTACIÓN — app.js
//  Toda la funcionalidad original + nuevo sistema de animaciones
// ============================================================

// ── Config ──────────────────────────────────────────────────
const CONFIG = {
    restaurantName: "Sir.Burger",
    whatsappNumber: "573215552545",
    currency: "$",
    branches: [
        { id: 1, name: "Sede Laureles",    desc: "Conjunto al Oxxo",                    icon: "🏪" },
        { id: 2, name: "Sede Estadio San José", desc: "Frente a las canchas sintéticas", icon: "⚽" }
    ],
    deliveryZones: [
        { id: 1, name: "Zona Oro Negro",  cost: 6000 },
        { id: 2, name: "Zona Laureles",   cost: 5000 },
        { id: 3, name: "Zona Profesionales",     cost: 5000 },
        { id: 4, name: "Zona Sena Agro",     cost: 6000 },
        { id: 5, name: "Zona Centro",     cost: 5000 },
        { id: 6, name: "Zona Plaza Bolivar",     cost: 6000 },
        { id: 7, name: "Zona La Virginia",     cost: 7000 },
        { id: 8, name: "Zona San jose",     cost: 5000 },
        { id: 9, name: "Zona La Fachada",     cost: 7000 }
    ]
};

const DESC_LIMIT = 80;

// ── View Mode (QR mesas) ─────────────────────────────────────
const urlParams  = new URLSearchParams(window.location.search);
const VIEW_MODE  = urlParams.has('mesa') || urlParams.get('modo') === 'vista';
const MESA_NUM   = urlParams.get('mesa') || null;

// ── State ────────────────────────────────────────────────────
let cart = [];
let menu = [];

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initCursor();
    initScrollWatcher();
    applyViewMode();
    loadMenu();
    if (!VIEW_MODE) {
        loadCartFromStorage();
        initCartEvents();
        updateCartUI();
    }
    initScrollAnimations();
});

// ============================================================
//  LOADER
// ============================================================
function initLoader() {
    const progress  = document.getElementById('loaderProgress');
    const loader    = document.getElementById('loader');
    let width = 0;
    const iv = setInterval(() => {
        width += Math.random() * 18 + 4;
        if (width >= 100) { width = 100; clearInterval(iv); }
        progress.style.width = width + '%';
    }, 120);

    function hideLoader() {
        width = 100;
        clearInterval(iv);
        progress.style.width = '100%';
        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 1000);
        }, 200);
    }

    // Cierra cuando la página cargó, con un mínimo de 600ms para la animación
    const minDelay = 600;
    const startTime = Date.now();

    if (document.readyState === 'complete') {
        const elapsed = Date.now() - startTime;
        setTimeout(hideLoader, Math.max(0, minDelay - elapsed));
    } else {
        window.addEventListener('load', () => {
            const elapsed = Date.now() - startTime;
            setTimeout(hideLoader, Math.max(0, minDelay - elapsed));
        }, { once: true });
        // Fallback: nunca esperar más de 2.5s
        setTimeout(hideLoader, 2500);
    }
}

// ============================================================
//  CUSTOM CURSOR
// ============================================================
function initCursor() {
    const cursor   = document.getElementById('cursor');
    const follower = document.getElementById('cursorFollower');
    if (!cursor || follower === null) return;

    // Detectar dispositivos táctiles: no inicializar cursor custom
    if (window.matchMedia('(hover: none)').matches) {
        cursor.style.display = 'none';
        follower.style.display = 'none';
        document.body.style.cursor = 'auto';
        document.querySelectorAll('button, .cat-card, .radio-card, .desc-toggle-btn').forEach(el => {
            el.style.cursor = 'auto';
        });
        return;
    }

    let mouseX = 0, mouseY = 0;
    let followerX = 0, followerY = 0;
    let rafId = null;

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.left = mouseX + 'px';
        cursor.style.top  = mouseY + 'px';

        if (!rafId) {
            rafId = requestAnimationFrame(animateFollower);
        }
    });

    function animateFollower() {
        followerX += (mouseX - followerX) * 0.18;
        followerY += (mouseY - followerY) * 0.18;
        follower.style.left = followerX + 'px';
        follower.style.top  = followerY + 'px';
        const dist = Math.abs(mouseX - followerX) + Math.abs(mouseY - followerY);
        rafId = dist > 0.5 ? requestAnimationFrame(animateFollower) : null;
    }

    document.addEventListener('mousedown', () => {
        cursor.classList.add('active');
        follower.classList.add('active');
    });
    document.addEventListener('mouseup', () => {
        cursor.classList.remove('active');
        follower.classList.remove('active');
    });
}

// ============================================================
//  NAVBAR SCROLL
// ============================================================
function initScrollWatcher() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    }, { passive: true });
}

// ============================================================
//  SCROLL ANIMATIONS (IntersectionObserver)
// ============================================================
// ── Observed set to avoid duplicate registrations ────────
const _observedEls = new WeakSet();
let _scrollObserver = null;

function initScrollAnimations() {
    if (!_scrollObserver) {
        _scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    _scrollObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
    }

    document.querySelectorAll('[data-aos]').forEach(el => {
        if (!_observedEls.has(el)) {
            _observedEls.add(el);
            _scrollObserver.observe(el);
        }
    });
}

// ============================================================
//  VIEW MODE (QR mesas)
// ============================================================
function applyViewMode() {
    if (!VIEW_MODE) return;

    const floatingCart = document.getElementById('floatingCart');
    const navCartBtn   = document.getElementById('navCartBtn');
    const cartPanel    = document.getElementById('cartPanel');
    const checkoutModal= document.getElementById('checkoutModal');

    if (floatingCart)  floatingCart.style.display = 'none';
    if (navCartBtn)    navCartBtn.style.display    = 'none';
    if (cartPanel)     cartPanel.style.display     = 'none';
    if (checkoutModal) checkoutModal.style.display = 'none';

    if (MESA_NUM) {
        const badge = document.createElement('div');
        badge.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(14,14,14,0.92); color: #C8922A; padding: 10px 28px;
            border-radius: 40px; font-family: 'DM Sans', sans-serif; font-weight: 600;
            font-size: 13px; letter-spacing: 2px; z-index: 999;
            border: 1px solid rgba(200,146,42,0.3); backdrop-filter: blur(10px);
            box-shadow: 0 4px 24px rgba(0,0,0,0.4); pointer-events: none;`;
        badge.textContent = `📍 Mesa ${MESA_NUM}`;
        document.body.appendChild(badge);
    }
}

// ============================================================
//  LOAD MENU
// ============================================================
async function loadMenu() {
    try {
        const res = await fetch('menu.json');
        menu = await res.json();
        renderAll();
    } catch (e) {
        console.error('Error cargando menú:', e);
    }
}

function renderAll() {
    renderNavCategories();
    renderCategoryCards();
    renderFooterCategories();
    renderProductTabs();
    renderProducts(menu[0].id);
}

// ── Nav pills ────────────────────────────────────────────────
function renderNavCategories() {
    const container = document.getElementById('navCategories');
    if (!container) return;
    menu.forEach((cat, i) => {
        const pill = document.createElement('button');
        pill.className = 'nav-cat-pill' + (i === 0 ? ' active' : '');
        pill.textContent = cat.name;
        pill.onclick = () => {
            switchCategory(cat.id);
            document.querySelectorAll('.nav-cat-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        container.appendChild(pill);
    });
}

// ── Category cards grid ──────────────────────────────────────
function renderCategoryCards() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    menu.forEach((cat, i) => {
        const card = document.createElement('div');
        card.className = 'cat-card';
        card.setAttribute('data-aos', '');
        card.style.transitionDelay = `${i * 0.06}s`;

        card.innerHTML = `
            <div class="cat-card-bg">${cat.icon || '🍽️'}</div>
            <div class="cat-card-overlay"></div>
            <div class="cat-card-content">
                <div class="cat-card-name">${cat.name}</div>
                <div class="cat-card-count">${cat.products.length} producto${cat.products.length !== 1 ? 's' : ''}</div>
            </div>
            <div class="cat-card-arrow">→</div>
        `;
        card.onclick = () => {
            switchCategory(cat.id);
            document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        grid.appendChild(card);
    });

    // re-observe for animations
    setTimeout(initScrollAnimations, 50);
}

// ── Footer categories ────────────────────────────────────────
function renderFooterCategories() {
    const el = document.getElementById('footerCats');
    if (!el) return;
    menu.forEach(cat => {
        const link = document.createElement('div');
        link.className = 'footer-col-link';
        link.textContent = cat.name;
        el.appendChild(link);
    });
}

// ── Product tabs ─────────────────────────────────────────────
function renderProductTabs() {
    const tabs = document.getElementById('productsTabs');
    if (!tabs) return;
    menu.forEach((cat, i) => {
        const tab = document.createElement('button');
        tab.className = 'prod-tab' + (i === 0 ? ' active' : '');
        tab.textContent = cat.name;
        tab.dataset.catId = cat.id;
        tab.onclick = () => switchCategory(cat.id);
        tabs.appendChild(tab);
    });
}

// ── Switch category ──────────────────────────────────────────
function switchCategory(catId) {
    document.querySelectorAll('.prod-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.catId == catId)
    );
    document.querySelectorAll('.nav-cat-pill').forEach((p, i) =>
        p.classList.toggle('active', menu[i]?.id == catId)
    );
    renderProducts(catId);
}

// ── Render products ──────────────────────────────────────────
function renderProducts(catId) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const cat = menu.find(c => c.id == catId);
    if (!cat) return;

    grid.innerHTML = '';

    cat.products.forEach((product, idx) => {
        const isAgotado = product.agotado === true;
        const item = document.createElement('div');
        item.className = 'prod-item' + (isAgotado ? ' agotado' : '');
        item.style.animationDelay = `${idx * 0.05}s`;

        const desc = renderDescription(product.description, product.id);
        const iconHTML = product.image
            ? `<img src="${product.image}" alt="${product.name}">`
            : product.icon || '🍽️';

        let addBtnHTML = '';
        if (!VIEW_MODE) {
            if (isAgotado) {
                addBtnHTML = `
                    <div class="prod-item-right">
                        <div class="prod-item-price">${CONFIG.currency}${formatPrice(product.price)}</div>
                        <span class="agotado-badge">Agotado</span>
                        <button class="add-btn" disabled>✕</button>
                    </div>`;
            } else {
                addBtnHTML = `
                    <div class="prod-item-right">
                        <div class="prod-item-price">${CONFIG.currency}${formatPrice(product.price)}</div>
                        <button class="add-btn" onclick="quickAddToCart('${product.id}')">+</button>
                    </div>`;
            }
        } else {
            addBtnHTML = `
                <div class="prod-item-right">
                    <div class="prod-item-price">${CONFIG.currency}${formatPrice(product.price)}</div>
                    ${isAgotado ? '<span class="agotado-badge">Agotado</span>' : ''}
                </div>`;
        }

        item.innerHTML = `
            <div class="prod-item-icon">${product.image ? `<img src="${product.image}" alt="${product.name}">` : (product.icon || '🍽️')}</div>
            <div class="prod-item-info">
                <div class="prod-item-name">${product.name}</div>
                <div class="prod-item-desc">${desc}</div>
            </div>
            ${addBtnHTML}
        `;

        grid.appendChild(item);
    });
}

// ── Description expandable ───────────────────────────────────
function renderDescription(text, id) {
    if (!text || text.length <= DESC_LIMIT) return text || '';
    const short = text.slice(0, DESC_LIMIT).trimEnd();
    return `<span id="desc-short-${id}" class="desc-short">${short}… <button class="desc-toggle-btn" onclick="toggleDesc('${id}')">Ver más</button></span><span id="desc-full-${id}" class="desc-full" style="display:none">${text} <button class="desc-toggle-btn" onclick="toggleDesc('${id}')">Ver menos</button></span>`;
}

function toggleDesc(id) {
    const shortEl = document.getElementById('desc-short-' + id);
    const fullEl  = document.getElementById('desc-full-'  + id);
    if (!shortEl || !fullEl) return;
    const collapsed = fullEl.style.display === 'none';
    shortEl.style.display = collapsed ? 'none'   : 'inline';
    fullEl.style.display  = collapsed ? 'inline' : 'none';
}

// ============================================================
//  CART
// ============================================================
function quickAddToCart(productId) {
    const product = findProductById(productId);
    if (!product) return;
    if (product.agotado === true) {
        showToast('Este producto está agotado', 'warning');
        return;
    }
    const existing = cart.find(i => i.id === productId);
    if (existing) existing.quantity += 1;
    else cart.push({ id: product.id, name: product.name, price: product.price, icon: product.icon || '🍽️', image: product.image || null, quantity: 1 });

    saveCartToStorage();
    updateCartUI();
    showToast(`${product.name} agregado`, 'success');
    bumpBadge();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCartToStorage();
    updateCartUI();
    showToast('Producto eliminado', 'error');
}

function updateQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) { removeFromCart(productId); return; }
    saveCartToStorage();
    updateCartUI();
}

function updateCartUI() {
    const total      = cart.reduce((s, i) => s + i.quantity, 0);
    const subtotal   = calculateSubtotal();

    // badges
    ['cartBadge', 'navCartBadge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = total;
    });
    const countEl = document.getElementById('cartCount');
    if (countEl) countEl.textContent = `${total} producto${total !== 1 ? 's' : ''}`;

    // body
    const body      = document.getElementById('cartBody');
    const footer    = document.getElementById('cartFooter');
    const totalEl   = document.getElementById('cartTotal');
    const emptyEl   = document.getElementById('cartEmpty');

    if (!body) return;

    if (cart.length === 0) {
        body.innerHTML = '';
        if (emptyEl) { emptyEl.style.display = 'block'; body.appendChild(emptyEl); }
        if (footer) footer.style.display = 'none';
    } else {
        body.innerHTML = '';
        cart.forEach(item => {
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div class="cart-item-icon">${item.image ? `<img src="${item.image}" alt="${item.name}" class="cart-item-img">` : item.icon}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-unit">${CONFIG.currency}${formatPrice(item.price)} c/u</div>
                </div>
                <div class="cart-item-right">
                    <div class="cart-item-price">${CONFIG.currency}${formatPrice(item.price * item.quantity)}</div>
                    <div class="cart-qty">
                        <button class="qty-btn" onclick="updateQty('${item.id}', -1)">−</button>
                        <span class="qty-num">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
                    </div>
                </div>`;
            body.appendChild(el);
        });
        if (footer) footer.style.display = 'block';
        if (totalEl) totalEl.textContent = `${CONFIG.currency}${formatPrice(subtotal)}`;
    }
}

// ── Cart panel open/close ────────────────────────────────────
function initCartEvents() {
    const openCart  = () => { document.getElementById('cartPanel').classList.add('active'); document.body.style.overflow = 'hidden'; };
    const closeCart = () => { document.getElementById('cartPanel').classList.remove('active'); document.body.style.overflow = ''; };

    document.getElementById('floatingCart')?.addEventListener('click', openCart);
    document.getElementById('navCartBtn')?.addEventListener('click', openCart);
    document.getElementById('closeCart')?.addEventListener('click', closeCart);
    document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

    document.getElementById('checkoutBtn')?.addEventListener('click', () => {
        closeCart();
        openCheckoutModal();
    });
    document.getElementById('closeModal')?.addEventListener('click', closeCheckoutModal);
    document.getElementById('modalOverlay')?.addEventListener('click', closeCheckoutModal);
    document.getElementById('checkoutForm')?.addEventListener('submit', handleCheckoutSubmit);
}

// ============================================================
//  CHECKOUT MODAL
// ============================================================
function openCheckoutModal() {
    if (cart.length === 0) { showToast('Tu carrito está vacío', 'warning'); return; }
    document.getElementById('checkoutModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderBranches();
    renderDeliveryZones();
    updateOrderSummary();
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('active');
    document.body.style.overflow = '';
}

function renderBranches() {
    const container = document.getElementById('branchSelector');
    if (!container) return;
    container.innerHTML = CONFIG.branches.map((branch, i) => `
        <label class="radio-card">
            <input type="radio" name="branch" value="${branch.id}" ${i === 0 ? 'required' : ''}>
            <div class="radio-inner">
                <span>${branch.icon}</span>
                <span>
                    <strong style="display:block;font-size:13px;color:var(--white)">${branch.name}</strong>
                    <small style="font-size:11px;color:var(--mist)">${branch.desc}</small>
                </span>
            </div>
        </label>`).join('');
}

function renderDeliveryZones() {
    const container = document.getElementById('deliveryZones');
    if (!container) return;
    container.innerHTML = CONFIG.deliveryZones.map((zone, i) => `
        <label class="radio-card">
            <input type="radio" name="deliveryZone" value="${zone.id}" ${i === 0 ? 'required' : ''} onchange="updateOrderSummary()">
            <div class="radio-inner">
                <span>📍</span>
                <span>${zone.name}</span>
            </div>
        </label>`).join('');
}

function updateOrderSummary() {
    const el         = document.getElementById('orderSummary');
    const zone       = getSelectedZone();
    const subtotal   = calculateSubtotal();
    const delivery   = zone ? zone.cost : 0;
    const total      = subtotal + delivery;

    el.innerHTML = [
        ...cart.map(item => `
            <div class="summary-line">
                <span>${item.name} × ${item.quantity}</span>
                <span>${CONFIG.currency}${formatPrice(item.price * item.quantity)}</span>
            </div>`),
        `<div class="summary-line"><span>Subtotal</span><span>${CONFIG.currency}${formatPrice(subtotal)}</span></div>`,
        `<div class="summary-line"><span>Domicilio</span><span>${CONFIG.currency}${formatPrice(delivery)}</span></div>`,
        `<div class="summary-line total"><span>Total</span><span>${CONFIG.currency}${formatPrice(total)}</span></div>`,
    ].join('');
}

function getSelectedZone() {
    const input = document.querySelector('input[name="deliveryZone"]:checked');
    if (!input) return null;
    return CONFIG.deliveryZones.find(z => z.id === parseInt(input.value));
}

function getSelectedBranch() {
    const input = document.querySelector('input[name="branch"]:checked');
    if (!input) return null;
    return CONFIG.branches.find(b => b.id === parseInt(input.value));
}

function getSelectedPayment() {
    const input = document.querySelector('input[name="paymentMethod"]:checked');
    return input ? input.value : null;
}

function handleCheckoutSubmit(e) {
    e.preventDefault();
    const name    = document.getElementById('customerName').value.trim();
    const phone   = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const notes   = document.getElementById('orderNotes').value.trim();
    const zone    = getSelectedZone();
    const payment = getSelectedPayment();
    const branch  = getSelectedBranch();

    if (!branch)  { showToast('Selecciona una sede', 'warning'); return; }
    if (!zone || !payment) { showToast('Completa todos los campos', 'warning'); return; }

    const msg = buildMessage({ name, phone, address, notes, zone, payment, branch });
    window.open(`https://wa.me/${CONFIG.whatsappNumber.trim()}?text=${encodeURIComponent(msg)}`, '_blank');

    setTimeout(() => {
        cart = [];
        saveCartToStorage();
        updateCartUI();
        closeCheckoutModal();
        document.getElementById('checkoutForm').reset();
        showToast('¡Pedido enviado! 🎉', 'success');
    }, 800);
}

function buildMessage({ name, phone, address, notes, zone, payment, branch }) {
    const subtotal = calculateSubtotal();
    const total    = subtotal + zone.cost;
    let msg  = `🔥 *NUEVO PEDIDO — ${CONFIG.restaurantName}*\n\n`;
    msg += `🏪 *Sede:* ${branch.name} (${branch.desc})\n`;
    msg += `👤 *Cliente:* ${name}\n`;
    msg += `📱 *Teléfono:* ${phone}\n`;
    msg += `📍 *Dirección:* ${address}\n`;
    msg += `🚚 *Zona:* ${zone.name} (+${CONFIG.currency}${formatPrice(zone.cost)})\n`;
    msg += `💳 *Pago:* ${payment}\n\n`;
    msg += `📋 *PEDIDO:*\n`;
    cart.forEach(i => msg += `• ${i.name} × ${i.quantity} — ${CONFIG.currency}${formatPrice(i.price * i.quantity)}\n`);
    msg += `\n💰 *Subtotal:* ${CONFIG.currency}${formatPrice(subtotal)}\n`;
    msg += `🛵 *Domicilio:* ${CONFIG.currency}${formatPrice(zone.cost)}\n`;
    msg += `✅ *TOTAL:* ${CONFIG.currency}${formatPrice(total)}\n`;
    if (notes) msg += `\n📝 *Nota:* ${notes}\n`;
    msg += `\n¡Gracias por tu pedido! 🙌`;
    return msg;
}

// ============================================================
//  SCROLL
// ============================================================
function scrollToCategories() {
    document.getElementById('categoriesSection')?.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
//  UTILS
// ============================================================
function formatPrice(n) { return n.toLocaleString('es-CO'); }
function calculateSubtotal() { return cart.reduce((s, i) => s + i.price * i.quantity, 0); }
function findProductById(id) {
    for (const cat of menu) {
        const p = cat.products.find(p => p.id === id);
        if (p) return p;
    }
    return null;
}
function saveCartToStorage()  { localStorage.setItem('cart', JSON.stringify(cart)); }
function loadCartFromStorage() {
    const saved = localStorage.getItem('cart');
    if (saved) cart = JSON.parse(saved);
}

// ── Badge bump animation ─────────────────────────────────────
function bumpBadge() {
    const badge = document.getElementById('navCartBadge');
    if (!badge) return;
    badge.classList.remove('bump');
    void badge.offsetWidth;
    badge.classList.add('bump');
}

// ── Toast ────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const wrap   = document.getElementById('toastWrap');
    if (!wrap) return;
    const toast  = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    wrap.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}
