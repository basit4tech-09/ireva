/* IREVA shared script: content loading, cart, size picker, product grids, checkout, menu, small page helpers.
   Loaded on every page. js/home.js adds the hero and reviews carousel on the home page. */
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const CATEGORY_ICON = { "Hoodies": "hoodie", "T-shirts": "tee", "Joggers": "joggers", "Beanies": "beanie", "Gym wear": "gym", "Tanks": "tank" };
  const content = { settings: {}, products: [], reviews: [] };

  /* Build elements with textContent only, so CMS content can never inject markup. */
  const h = (tag, props = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (value === true) node.setAttribute(key, "");
      else if (value !== false && value != null) node.setAttribute(key, value);
    }
    kids.flat().forEach((kid) => kid && node.append(kid));
    return node;
  };
  const icon = (name, cls = "icon") => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    const use = document.createElementNS(ns, "use");
    svg.setAttribute("class", cls);
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", `#i-${name}`);
    svg.append(use);
    return svg;
  };

  /* Content comes from /content/*.json (edited in /admin). */
  async function loadContent() {
    try {
      const [settings, products, reviews] = await Promise.all(["settings", "products", "reviews"].map((name) =>
        fetch(`content/${name}.json`).then((res) => { if (!res.ok) throw new Error(name); return res.json(); })));
      content.settings = settings;
      content.products = products.products || [];
      content.reviews = reviews.reviews || [];
    } catch {
      const note = h("p", { class: "load-error", role: "alert", text: "Products could not load. Open the site through Netlify or a local server such as VS Code Live Server, not by double-clicking the file." });
      $("main").prepend(note);
    }
    applySettings();
  }

  function applySettings() {
    const s = content.settings;
    const wa = `https://wa.me/${s.whatsapp || ""}?text=${encodeURIComponent("Hello IREVA, I have a question.")}`;
    const links = { whatsapp: wa, email: `mailto:${s.email || ""}`, instagram: s.instagram, tiktok: s.tiktok };
    $$("[data-link]").forEach((el) => { const url = links[el.dataset.link]; if (url) el.href = url; });
    $$("[data-text]").forEach((el) => { if (s[el.dataset.text]) el.textContent = s[el.dataset.text]; });
  }

  /* Cart: stored in localStorage so it survives page changes. */
  const CART_KEY = "ireva-cart";
  let items = (() => { try { const saved = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(saved) ? saved : []; } catch { return []; } })();
  const cart = {
    count: () => items.reduce((sum, i) => sum + i.qty, 0),
    total: () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    save() { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* private mode */ } renderCart(); },
    add(product, size) {
      const key = `${product.id}|${size}`;
      const found = items.find((i) => i.key === key);
      if (found) found.qty += 1;
      else items.push({ key, title: product.title, price: product.price, image: product.image || "", category: product.category, size, qty: 1 });
      this.save();
    },
    change(key, delta) {
      const item = items.find((i) => i.key === key);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) items = items.filter((i) => i.key !== key);
      this.save();
    },
    remove(key) { items = items.filter((i) => i.key !== key); this.save(); },
  };

  const drawer = $("[data-drawer]");
  const scrim = $("[data-scrim]");
  const background = $$(".announce, .site-header, main, .footer, .fab");
  let lastFocus = null;

  function renderCart() {
    const list = $("[data-cart-list]");
    list.replaceChildren(...items.map((item) => {
      const thumb = item.image ? h("img", { class: "cart-thumb", src: item.image, alt: "", width: "64", height: "72" })
        : h("div", { class: "cart-thumb card-ph" }, icon(CATEGORY_ICON[item.category] || "tee"));
      const step = (label, delta, name) => {
        const b = h("button", { class: "qty-btn", type: "button", "aria-label": `${label} ${item.title}` }, icon(name));
        b.addEventListener("click", () => cart.change(item.key, delta));
        return b;
      };
      const remove = h("button", { class: "remove-btn", type: "button", text: "Remove", "aria-label": `Remove ${item.title} from cart` });
      remove.addEventListener("click", () => cart.remove(item.key));
      return h("li", { class: "cart-item" }, thumb, h("div", {},
        h("div", { class: "cart-item-top" }, h("div", {}, h("p", { text: item.title }), h("p", { class: "muted", text: `Size: ${item.size}` })), h("p", { text: naira(item.price * item.qty) })),
        h("div", { class: "cart-item-controls" }, step("Decrease quantity of", -1, "minus"), h("span", { text: String(item.qty), "aria-label": `Quantity ${item.qty}` }), step("Increase quantity of", 1, "plus"), remove)));
    }));
    const any = items.length > 0;
    $("[data-cart-empty]").hidden = any;
    $("[data-cart-foot]").hidden = !any;
    $("[data-cart-total]").textContent = naira(cart.total());
    $$("[data-cart-count]").forEach((el) => { el.textContent = cart.count(); el.hidden = !any; });
  }

  function openCart() {
    lastFocus = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    scrim.hidden = false;
    document.body.classList.add("drawer-open");
    background.forEach((el) => { el.inert = true; });
    drawer.focus();
  }
  function closeCart() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    scrim.hidden = true;
    document.body.classList.remove("drawer-open");
    background.forEach((el) => { el.inert = false; });
    if (lastFocus) lastFocus.focus();
  }
  $$("[data-open-cart]").forEach((b) => b.addEventListener("click", openCart));
  $("[data-close-cart]").addEventListener("click", closeCart);
  scrim.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("is-open")) closeCart(); });

  /* Size picker: sold-out sizes are struck through and disabled. */
  const modal = $("[data-size-modal]");
  let picking = null;
  function openSizes(product) {
    picking = product;
    const thumb = product.image ? h("img", { src: product.image, alt: "", width: "64", height: "72" })
      : h("div", { class: "cart-thumb card-ph" }, icon(CATEGORY_ICON[product.category] || "tee"));
    $("[data-size-product]").replaceChildren(thumb, h("div", {}, h("h2", { id: "size-title", text: product.title }), h("p", { class: "muted", text: naira(product.price) })));
    const sold = product.sold_out_sizes || [];
    const only = product.sizes.length === 1 && !sold.includes(product.sizes[0]);
    $("[data-sizes]").replaceChildren(...product.sizes.map((size) =>
      h("label", { class: "size" }, h("input", { type: "radio", name: "size", value: size, checked: only, disabled: sold.includes(size) }), h("span", { text: size }))));
    $("[data-size-error]").hidden = true;
    modal.showModal();
  }
  $("[data-size-confirm]").addEventListener("click", () => {
    const chosen = $('input[name="size"]:checked', modal);
    if (!chosen) { $("[data-size-error]").hidden = false; return; }
    cart.add(picking, chosen.value);
    modal.close();
    openCart();
  });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

  /* Product cards. The same card is used on the home page and the shop. */
  function card(p) {
    const sold = p.in_stock === false;
    const media = h("div", { class: "card-media" });
    if (p.image) {
      media.append(h("img", { class: "card-img", src: p.image, alt: p.title, loading: "lazy", width: "700", height: "780" }));
      if (p.hover_image) media.append(h("img", { class: "card-alt", src: p.hover_image, alt: "", loading: "lazy", width: "700", height: "780" }));
    } else {
      media.append(h("div", { class: "card-ph" }, icon(CATEGORY_ICON[p.category] || "tee", "icon icon--xl")));
    }
    const tag = sold ? "Sold out" : p.badge;
    if (tag) media.prepend(h("span", { class: "card-badge", text: tag }));
    const add = h("button", { class: "btn btn--line card-btn", type: "button", disabled: sold, "aria-label": `Add ${p.title} to cart` }, icon("bag"), sold ? "Sold out" : "Add to cart");
    add.addEventListener("click", () => openSizes(p));
    return h("li", {}, h("article", { class: "card" }, media, h("div", {}, h("h3", { class: "card-title", text: p.title }), h("p", { class: "card-price", text: naira(p.price) })), add));
  }

  function initProducts() {
    const featured = $("[data-featured]");
    if (featured) {
      const picks = content.products.filter((p) => p.featured).slice(0, 4);
      featured.replaceChildren(...(picks.length ? picks : content.products.slice(0, 4)).map(card));
    }
    const grid = $("[data-grid]");
    if (!grid) return;
    const bar = $("[data-filters]"), sortEl = $("[data-sort]"), count = $("[data-count]"), empty = $("[data-empty]");
    const fromUrl = new URLSearchParams(location.search).get("category");
    let active = Object.keys(CATEGORY_ICON).includes(fromUrl) ? fromUrl : "All";
    let sort = "featured";
    const render = () => {
      const list = active === "All" ? [...content.products] : content.products.filter((p) => p.category === active);
      if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
      if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
      grid.replaceChildren(...list.map(card));
      empty.hidden = list.length > 0;
      count.textContent = `(${list.length})`;
      $$(".filter", bar).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === active)));
    };
    ["All", ...Object.keys(CATEGORY_ICON)].forEach((name) => {
      const b = h("button", { class: "filter", type: "button", text: name, "data-value": name, "aria-pressed": "false" });
      b.addEventListener("click", () => { active = name; history.replaceState(null, "", name === "All" ? location.pathname : `?category=${encodeURIComponent(name)}`); render(); });
      bar.append(b);
    });
    sortEl.addEventListener("change", () => { sort = sortEl.value; render(); });
    render();
  }

  /* Checkout: one order message, opened in WhatsApp or Gmail. */
   async function checkout(channel) {
    const err = $("[data-checkout-error]");
    const customer = { name: $("#c-name").value.trim(), phone: $("#c-phone").value.trim(), address: $("#c-addr").value.trim() };
    const show = (text, ok) => { err.textContent = text; err.style.color = ok ? "inherit" : ""; err.hidden = false; };
    if (!customer.name || !customer.phone || !customer.address) { show("Enter your name, phone and address first."); return; }
    const s = content.settings;
    const unset = channel === "whatsapp" ? !s.whatsapp || /0{6,}/.test(s.whatsapp) : !s.email || s.email.includes("example.com");
    if (unset) { show("Ordering is not switched on yet. Please check back soon."); return; }
    err.hidden = true;
    const lines = items.map((i, n) => `${n + 1}. ${i.title} (${i.size}) x${i.qty} - ${naira(i.price * i.qty)}`);
    const message = ["Hello IREVA, I would like to place an order:", "", ...lines, "", `Total: ${naira(cart.total())}`, "", `Name: ${customer.name}`, `Phone: ${customer.phone}`, `Delivery address: ${customer.address}`].join("\n");

    if (channel === "whatsapp") {
      window.open(`https://wa.me/${s.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
      return;
    }

    /* Gmail: send the order straight to the store inbox via FormSubmit. */
    const btn = document.querySelector('[data-checkout="gmail"]');
    const label = btn.innerHTML;
    btn.disabled = true; btn.textContent = "Sending...";
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(s.email)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "New IREVA order from " + customer.name,
          _template: "table",
          _captcha: "false",
          Name: customer.name,
          Phone: customer.phone,
          Address: customer.address,
          Order: lines.join("\n"),
          Total: naira(cart.total())
        })
      });
      const data = await res.json();
      if (!res.ok || String(data.success) !== "true") throw new Error("send failed");
      show("Order sent. We will contact you shortly to confirm.", true);
    } catch (e) {
      /* Fallback: open Gmail compose so the order is never lost. */
      show("Could not send automatically. Opening Gmail instead.");
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(s.email)}&su=${encodeURIComponent("New IREVA order from " + customer.name)}&body=${encodeURIComponent(message)}`, "_blank", "noopener");
    } finally {
      btn.disabled = false; btn.innerHTML = label;
    }
  }
  $$("[data-checkout]").forEach((b) => b.addEventListener("click", () => checkout(b.dataset.checkout)));

  /* Header: transparent over the hero, solid after scrolling. Mobile menu. */
  const header = $("[data-header]");
  if (header && header.hasAttribute("data-overlay")) {
    const sync = () => header.classList.toggle("is-solid", scrollY > 24);
    addEventListener("scroll", sync, { passive: true });
    sync();
  }
  const toggle = $("[data-menu-toggle]"), nav = $("#site-nav");
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector("use").setAttribute("href", open ? "#i-close" : "#i-menu");
    if (open && header.hasAttribute("data-overlay")) header.classList.add("is-solid");
  };
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("click", (e) => { if (!nav.contains(e.target) && !toggle.contains(e.target)) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); } });

  /* Small page helpers: size guide units, contact form notice, year. */
  $$("[data-unit]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-unit]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    const inches = b.dataset.unit === "in";
    $$("[data-cm]").forEach((cell) => { const cm = Number(cell.dataset.cm); cell.textContent = inches ? (Math.round(cm / 2.54 * 10) / 10).toString() : cm; });
    $$("[data-unit-label]").forEach((el) => { el.textContent = inches ? "in" : "cm"; });
  }));
   const contactForm = $("[data-contact-form]");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ok = $("[data-sent]"), bad = $("[data-contact-error]"), btn = contactForm.querySelector('button[type="submit"]');
      ok.hidden = true; bad.hidden = true;
      if (!contactForm.reportValidity()) return;
      const data = new FormData(contactForm);
      if (data.get("_honey")) return;
      const to = content.settings && content.settings.email;
      if (!to || to.includes("example.com")) { bad.textContent = "Messages are not switched on yet. Please use WhatsApp for now."; bad.hidden = false; return; }
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = "Sending...";
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: "IREVA website message from " + data.get("name"),
            _template: "table",
            _captcha: "false",
            _replyto: data.get("email"),
            Name: data.get("name"),
            Email: data.get("email"),
            Message: data.get("query")
          })
        });
        const out = await res.json();
        if (!res.ok || String(out.success) !== "true") throw new Error("send failed");
        contactForm.reset();
        ok.hidden = false;
      } catch (err) {
        bad.textContent = "Could not send your message. Please try again or use WhatsApp.";
        bad.hidden = false;
      } finally {
        btn.disabled = false; btn.textContent = label;
      }
    });
  }
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  window.IREVA = { $, $$, h, icon, naira, reduce, content, ready: null };
  renderCart();
  window.IREVA.ready = loadContent().then(initProducts);
})();
// --- Page Loader ---
const pageLoader = document.getElementById('pageLoader');

if (pageLoader) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      pageLoader.classList.add('hidden');
    }, 1000);
  });
}