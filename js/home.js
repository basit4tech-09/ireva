/* Home page only: the 3D hero slideshow and the reviews carousel. */
(() => {
  const { $, $$, h, icon, reduce } = IREVA;

  /* Hero: autoplay with a pause button, numbers, swipe, arrow keys and pointer depth. */
  const hero = $("[data-hero]");
  if (hero) {
    const track = $("[data-hero-slides]", hero);
    const slides = $$(".hero-slide", hero);
    const nums = $("[data-hero-nums]", hero);
    const toggle = $("[data-hero-toggle]", hero);
    const DELAY = 3500;
    let index = 0, timer = null, wantsPlay = !reduce.matches, hovering = false, startX = null;

    const buttons = slides.map((_, i) => {
      const b = h("button", { class: "hero-num", type: "button", text: String(i + 1).padStart(2, "0"), "aria-label": `Show slide ${i + 1} of ${slides.length}` });
      b.addEventListener("click", () => { go(i); start(); });
      nums.append(b);
      return b;
    });
    function go(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach((s, i) => { s.classList.toggle("is-active", i === index); s.classList.toggle("is-prev", i < index); s.inert = i !== index; });
      buttons.forEach((b, i) => i === index ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"));
    }
    const stop = () => { clearInterval(timer); timer = null; };
    function start() { stop(); if (wantsPlay && !hovering) timer = setInterval(() => go(index + 1), DELAY); }
    function setPlaying(on) {
      wantsPlay = on;
      toggle.setAttribute("aria-label", on ? "Pause slideshow" : "Play slideshow");
      track.setAttribute("aria-live", on ? "off" : "polite");
      start();
    }
    $("[data-hero-prev]", hero).addEventListener("click", () => { go(index - 1); start(); });
    $("[data-hero-next]", hero).addEventListener("click", () => { go(index + 1); start(); });
    
    hero.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hovering = true; stop(); } });
    hero.addEventListener("pointerleave", () => { hovering = false; start(); hero.style.setProperty("--px", 0); hero.style.setProperty("--py", 0); });
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", start);
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || reduce.matches) return;
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      hero.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    hero.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") startX = e.clientX; });
    hero.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX; startX = null;
      if (Math.abs(dx) > 50) { go(index + (dx < 0 ? 1 : -1)); start(); }
    });
    hero.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { go(index - 1); start(); }
      if (e.key === "ArrowRight") { go(index + 1); start(); }
    });
    reduce.addEventListener("change", (e) => setPlaying(!e.matches));
    go(0);
  }

  /* Reviews: a native scroll-snap carousel that loops. Three copies sit in the track and the scroll
     position jumps back to the middle copy once it settles, so there is always a card on each side.
     Cards tilt in 3D by their distance from the centre. */
  const root = $("[data-reviews]");
  if (!root) return;
  IREVA.ready.then(() => {
    const reviews = IREVA.content.reviews;
    if (!reviews.length) { root.hidden = true; return; }
    const n = reviews.length;
    const loop = n >= 3;
    const base = loop ? n : 0;
    const track = $("[data-rv-track]", root), dots = $("[data-rv-dots]", root), toggle = $("[data-rv-toggle]", root);
    const stars = (count) => h("div", { class: "rv-stars", role: "img", "aria-label": `${count} out of 5 stars` }, Array.from({ length: count }, () => icon("star", "icon icon--fill")));
    const make = (r, clone) => h("li", { class: "rv-card", "aria-hidden": clone ? "true" : false },
      stars(Math.min(5, Math.max(1, r.rating || 5))),
      h("p", { class: "rv-text", text: r.text }),
      h("p", { class: "rv-meta" }, h("span", { text: `${r.name}, ${r.city}` }),
        h("span", { class: "rv-verified" }, icon("check"), "Verified buyer"),
        r.sample ? h("span", { class: "rv-sample", text: "Sample review" }) : null));
    const cards = (loop ? [0, 1, 2] : [0]).flatMap((copy) => reviews.map((r) => make(r, loop && copy !== 1)));
    track.replaceChildren(...cards);

    const dotBtns = reviews.map((_, i) => {
      const b = h("button", { class: "rv-dot", type: "button", "aria-label": `Show review ${i + 1} of ${n}` });
      b.addEventListener("click", () => { goTo(nearest(i)); startAuto(); });
      dots.append(b);
      return b;
    });

    const step = () => cards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 24);
    let current = base, timer = null, settle = null, raf = 0, wantsPlay = !reduce.matches, hovering = false;
    const jump = (i) => track.scrollTo({ left: i * step(), behavior: "instant" });
    const goTo = (i) => track.scrollTo({ left: i * step(), behavior: reduce.matches ? "instant" : "smooth" });
    function nearest(i) {
      if (!loop) return i;
      let target = Math.floor(current / n) * n + i;
      if (target - current > n / 2) target -= n;
      if (current - target > n / 2) target += n;
      return target;
    }
    function recenter() {
      if (!loop) return;
      if (current < n) jump(current + n);
      else if (current >= 2 * n) jump(current - n);
    }
    function paint() {
      raf = 0;
      const w = step();
      current = Math.min(cards.length - 1, Math.max(0, Math.round(track.scrollLeft / w)));
      cards.forEach((card, i) => {
        const d = Math.max(-2, Math.min(2, i - track.scrollLeft / w));
        card.style.setProperty("--rot", reduce.matches ? "0deg" : `${(d * -16).toFixed(1)}deg`);
        card.style.setProperty("--sc", (1 - Math.min(Math.abs(d), 1) * 0.08).toFixed(3));
        card.style.setProperty("--op", (1 - Math.min(Math.abs(d), 1.6) * 0.12).toFixed(2));
        card.classList.toggle("is-active", i === current);
      });
      const shown = ((current % n) + n) % n;
      dotBtns.forEach((b, i) => i === shown ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"));
    }
    track.addEventListener("scroll", () => {
      if (!raf) raf = requestAnimationFrame(paint);
      clearTimeout(settle);
      settle = setTimeout(recenter, 140);
    }, { passive: true });
    addEventListener("resize", () => { jump(current); paint(); });

    const move = (delta) => { const t = current + delta; goTo(loop ? t : Math.min(cards.length - 1, Math.max(0, t))); };
    $("[data-rv-prev]", root).addEventListener("click", () => { move(-1); startAuto(); });
    $("[data-rv-next]", root).addEventListener("click", () => { move(1); startAuto(); });

    const stopAuto = () => { clearInterval(timer); timer = null; };
    function startAuto() {
      stopAuto();
      if (wantsPlay && !hovering) timer = setInterval(() => goTo(loop || current + 1 < cards.length ? current + 1 : 0), 4500);
    }
    function setPlaying(on) {
      wantsPlay = on;
      toggle.querySelector("use").setAttribute("href", on ? "#i-pause" : "#i-play");
      toggle.setAttribute("aria-label", on ? "Pause reviews" : "Play reviews");
      startAuto();
    }
    toggle.addEventListener("click", () => setPlaying(!wantsPlay));
    root.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hovering = true; stopAuto(); } });
    root.addEventListener("pointerleave", () => { hovering = false; startAuto(); });
    root.addEventListener("focusin", stopAuto);
    root.addEventListener("focusout", startAuto);
    reduce.addEventListener("change", (e) => setPlaying(!e.matches));
    jump(base);
    paint();
    setPlaying(wantsPlay);
  });
})();
