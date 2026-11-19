/* ==========================================================================
   Nicole Freeman Coaching — motion layer (GSAP + ScrollTrigger)
   Page-scoped: NFMotion.init(root, mode) builds a page's animations and
   NFMotion.destroy() tears them down, so pages can be swapped in place.
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Word splitting (keeps <em>, <br>, <b>) ---------- */
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = "1";
    var out = document.createDocumentFragment();
    function wrapWord(text, tag, cls) {
      var mask = document.createElement("span");
      mask.className = "split-line";
      mask.style.display = "inline-block";
      mask.style.verticalAlign = "top";
      var inner = document.createElement("span");
      if (tag) {
        var w = document.createElement(tag);
        if (cls) w.className = cls;
        w.textContent = text;
        inner.appendChild(w);
      } else inner.textContent = text;
      mask.appendChild(inner);
      return mask;
    }
    function walk(node, target, tag, cls) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) target.appendChild(document.createTextNode(" "));
            else target.appendChild(wrapWord(p, tag, cls));
          });
        } else if (child.nodeType === 1) {
          if (child.tagName === "BR") { target.appendChild(child.cloneNode()); return; }
          walk(child, target, child.tagName.toLowerCase(), child.className);
        }
      });
    }
    walk(el, out, null, null);
    el.innerHTML = "";
    el.appendChild(out);
  }
  function splitStatement(el) {
    if (el.dataset.wordsDone) return;
    el.dataset.wordsDone = "1";
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
            else { var s = document.createElement("span"); s.className = "w"; s.textContent = p; frag.appendChild(s); }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") walk(child);
      });
    })(el);
  }

  /* ---------- Static fallback (no GSAP / reduced motion) ---------- */
  function staticInit(root) {
    root = root || document;
    $$("[data-reveal]", root).forEach(function (el) { el.classList.add("is-in"); });
    $$(".cert, .want__card--no", root).forEach(function (el) { el.classList.add("is-in"); });
    $$(".statement__text .w", root).forEach(function (w) { w.style.opacity = 1; });
    $$("[data-count]", root).forEach(function (el) { el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || ""); });
  }
  if (!window.gsap || !window.ScrollTrigger || reduced) {
    window.NFMotion = { init: staticInit, destroy: function () {} };
    staticInit(document.querySelector("main"));
    return;
  }

  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });
  if (window.lenis) {
    window.lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { window.lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  var ctx = null, mm = null, marqueeTweens = [];

  function init(root, mode) {
    root = root || document.querySelector("main") || document;
    destroy();
    mm = gsap.matchMedia();
    var html = document.documentElement;
    var waitForLoader = mode !== "enter" && html.classList.contains("is-preloading");
    var entryDelay = mode === "enter" ? 0.35 : html.classList.contains("pt-enter") ? 0.45 : 0.15;

    ctx = gsap.context(function () {
      function animateSplit(el, delay) {
        splitWords(el);
        return gsap.from($$(".split-line > span", el), { yPercent: 115, rotate: 3, duration: 1.15, ease: "expo.out", stagger: 0.045, delay: delay || 0 });
      }

      /* ---------- Home hero intro ---------- */
      var hero = $(".hero", root);
      if (hero) {
        var lines = $$(".hero__title--back .ln, .hero__title--ghost .ln", hero);
        gsap.set(lines, { yPercent: 105, opacity: 0 });
        gsap.set($(".hero__portrait", hero), { yPercent: 14, opacity: 0 });
        gsap.set($$(".hero__eyebrow, .hero__bottom > *, .hero__card", hero), { y: 26, opacity: 0 });
        gsap.set($$(".sticker", hero), { scale: 0.4, opacity: 0 });
        gsap.set($(".hero__dial", hero), { scale: 0.86, opacity: 0 });
        var playHero = function () {
          var tl = gsap.timeline({ delay: entryDelay });
          tl.to($(".hero__dial", hero), { scale: 1, opacity: 0.9, duration: 1.6, ease: "expo.out" }, 0)
            .to($(".hero__portrait", hero), { yPercent: 0, opacity: 1, duration: 1.3, ease: "expo.out" }, 0.05)
            .to(lines, { yPercent: 0, opacity: 1, duration: 1.2, ease: "expo.out", stagger: { each: 0.09, grid: "auto" } }, 0.1)
            .to($(".hero__eyebrow", hero), { y: 0, opacity: 1, duration: 0.9, ease: "expo.out" }, 0.2)
            .to($$(".hero__bottom > *", hero), { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.08 }, 0.45)
            .to($(".hero__card", hero), { y: 0, opacity: 1, duration: 1, ease: "expo.out" }, 0.6)
            .to($$(".sticker", hero), { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(2)", stagger: 0.12 }, 0.8);
        };
        if (waitForLoader) document.addEventListener("site:loaded", playHero, { once: true });
        else playHero();

        mm.add("(min-width: 761px)", function () {
          gsap.to($(".hero__portrait", hero), { yPercent: 8, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
          gsap.to($$(".hero__title", hero), { yPercent: -18, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
          gsap.to($(".hero__dial svg", hero), { rotate: 50, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
          $$(".sticker", hero).forEach(function (s, i) {
            gsap.to(s, { y: i % 2 ? -10 : 10, duration: 2.6 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.6 });
          });
        });
      }

      /* ---------- Inner page hero intro ---------- */
      var ph = $(".page-hero", root);
      if (ph) {
        var title = $(".page-hero__title", ph);
        var bits = $$(".page-hero__crumbs, .page-hero__lead, .page-hero__actions, .page-hero__bottom", ph);
        var media = $$(".page-hero__media > *", ph);
        if (title) splitWords(title);
        var words = title ? $$(".split-line > span", title) : [];
        if (words.length) gsap.set(words, { yPercent: 115, rotate: 3 });
        if (bits.length) gsap.set(bits, { y: 24, opacity: 0 });
        if (media.length) gsap.set(media, { y: 40, opacity: 0, rotate: function (i) { return i % 2 ? 4 : -3; } });
        var playPH = function () {
          var tl = gsap.timeline({ delay: entryDelay });
          if (words.length) tl.to(words, { yPercent: 0, rotate: 0, duration: 1.2, ease: "expo.out", stagger: 0.05 }, 0);
          if (bits.length) tl.to(bits, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.08 }, 0.25);
          if (media.length) tl.to(media, { y: 0, opacity: 1, rotate: function (i, el) { return Number(el.getAttribute("data-rot") || 0); }, duration: 1.2, ease: "expo.out", stagger: 0.12 }, 0.2);
        };
        if (waitForLoader) document.addEventListener("site:loaded", playPH, { once: true });
        else playPH();
        var phMedia = $$(".page-hero__media", ph);
        if (phMedia.length) mm.add("(min-width: 901px)", function () {
          gsap.to(phMedia, { yPercent: -10, ease: "none", scrollTrigger: { trigger: ph, start: "top top", end: "bottom top", scrub: true } });
        });
      }

      /* ---------- Split headings on scroll ---------- */
      $$("[data-split]", root).forEach(function (el) {
        if (el.closest(".hero, .page-hero")) return;
        splitWords(el);
        gsap.from($$(".split-line > span", el), {
          yPercent: 115, rotate: 3, duration: 1.15, ease: "expo.out", stagger: 0.04,
          scrollTrigger: { trigger: el, start: "top 86%", once: true }
        });
      });

      /* ---------- Generic reveals ---------- */
      ST.batch($$("[data-reveal]", root), {
        start: "top 90%", once: true,
        onEnter: function (els) { els.forEach(function (el, i) { setTimeout(function () { el.classList.add("is-in"); }, i * 90); }); }
      });
      $$("[data-stagger]", root).forEach(function (wrap) {
        gsap.from(wrap.children, {
          y: 40, opacity: 0, duration: 1.05, ease: "expo.out", stagger: 0.08,
          scrollTrigger: { trigger: wrap, start: "top 86%", once: true }
        });
      });
      $$("[data-clip]", root).forEach(function (el) {
        gsap.fromTo(el, { clipPath: "inset(14% 10% 14% 10% round 28px)" }, {
          clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1.5, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        });
        var img = $("img", el);
        if (img) gsap.fromTo(img, { scale: 1.22 }, { scale: 1, duration: 1.8, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      });
      mm.add("(min-width: 761px)", function () {
        $$("[data-speed]", root).forEach(function (el) {
          var s = Number(el.getAttribute("data-speed")) || 0.1;
          gsap.fromTo(el, { yPercent: s * 50 }, { yPercent: -s * 50, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
        });
      });

      /* ---------- Count up ---------- */
      $$("[data-count]", root).forEach(function (el) {
        var end = Number(el.getAttribute("data-count")), suf = el.getAttribute("data-suffix") || "";
        var o = { v: 0 };
        el.textContent = "0" + suf;
        gsap.to(o, { v: end, duration: 2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString("en-GB") + suf; } });
      });

      /* ---------- Scrubbed statement ---------- */
      $$(".statement__text", root).forEach(function (el) {
        splitStatement(el);
        gsap.to($$(".w", el), { opacity: 1, stagger: 0.05, ease: "none",
          scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.6 } });
      });

      /* ---------- That voice: lines get struck out as you read ---------- */
      $$(".voice__list li", root).forEach(function (li) {
        var p = $("s", li) || $("p", li);
        gsap.to(p, { "--x": 1, ease: "none", scrollTrigger: { trigger: li, start: "top 72%", end: "top 48%", scrub: 0.4,
          onUpdate: function (self) { li.classList.toggle("is-x", self.progress > 0.95); } } });
      });

      /* ---------- Class toggles for CSS-driven reveals ---------- */
      $$(".cert, .want__card--no", root).forEach(function (el) {
        ST.create({ trigger: el, start: "top 78%", once: true, onEnter: function () { el.classList.add("is-in"); } });
      });

      /* ---------- Marquee (speeds up with scroll velocity) ---------- */
      $$("[data-marquee]", root).forEach(function (mq) {
        $$(".marquee__row", mq).forEach(function (row, i) {
          var track = $(".marquee__track", row);
          if (!track) return;
          if (!row.dataset.cloned) { row.appendChild(track.cloneNode(true)); row.dataset.cloned = "1"; }
          var dir = i % 2 ? 1 : -1;
          var tw = gsap.fromTo(row, { xPercent: dir === -1 ? 0 : -50 }, { xPercent: dir === -1 ? -50 : 0, duration: 38 + i * 6, ease: "none", repeat: -1 });
          marqueeTweens.push(tw);
          ST.create({ trigger: mq, start: "top bottom", end: "bottom top",
            onUpdate: function (self) {
              var v = Math.min(4, 1 + Math.abs(self.getVelocity()) / 600);
              gsap.to(tw, { timeScale: v, duration: 0.2, overwrite: true });
              gsap.to(tw, { timeScale: 1, duration: 1.2, delay: 0.2, overwrite: false });
            },
            onToggle: function (self) { self.isActive ? tw.play() : tw.pause(); } });
        });
      });

      /* ---------- Iceberg: dive below the waterline ---------- */
      var berg = $(".berg", root);
      if (berg) {
        var stage = $(".berg__stage", berg);
        var deep = $$(".berg__lbl--deep", berg), tops = $$(".berg__lbl--top", berg);
        gsap.set(deep, { opacity: 0, y: 14 });
        gsap.set(tops, { opacity: 0, y: -10 });
        var tl = gsap.timeline({ scrollTrigger: { trigger: stage, start: "top 75%", end: "bottom 40%", scrub: 0.8 } });
        tl.to(tops, { opacity: 1, y: 0, stagger: 0.1, duration: 0.4 }, 0)
          .to($(".berg__ice", berg), { yPercent: -6, duration: 1 }, 0.2)
          .to(deep, { opacity: 1, y: 0, stagger: 0.12, duration: 0.4 }, 0.45);
        $$(".berg__step", berg).forEach(function (s) {
          gsap.from(s, { opacity: 0, x: 30, duration: 1, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 85%", once: true } });
        });
      }

      /* ---------- Footer & CTA ---------- */
      var cta = $(".cta-final__panel", root);
      if (cta) {
        mm.add("(min-width: 761px)", function () {
          gsap.from(cta, { scale: 0.94, borderRadius: 80, ease: "none", scrollTrigger: { trigger: cta, start: "top bottom", end: "top 40%", scrub: true } });
        });
      }

      /* ---------- Tiles: slight 3D tilt on pointer ---------- */
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        $$("[data-tilt]", root).forEach(function (el) {
          var qx = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });
          var qy = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" });
          gsap.set(el, { transformPerspective: 900 });
          el.addEventListener("mousemove", function (e) {
            var r = el.getBoundingClientRect();
            qx(((e.clientX - r.left) / r.width - 0.5) * 6);
            qy(-((e.clientY - r.top) / r.height - 0.5) * 6);
          });
          el.addEventListener("mouseleave", function () { qx(0); qy(0); });
        });
      }
    }, root);

    /* Fonts can shift layout: refresh once they're in */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
    setTimeout(function () { ST.refresh(); }, 600);
  }

  function destroy() {
    marqueeTweens.forEach(function (t) { t.kill(); });
    marqueeTweens = [];
    if (mm) { mm.revert(); mm = null; }
    if (ctx) { ctx.revert(); ctx = null; }
  }

  /* Global, once: footer wordmark */
  (function footer() {
    var word = document.querySelector(".footer__word");
    if (!word) return;
    splitWords(word);
    gsap.from($$(".split-line > span", word), { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.08,
      scrollTrigger: { trigger: word, start: "top 98%", once: true } });
  })();

  window.NFMotion = { init: init, destroy: destroy };
  init(document.querySelector("main"));
})();
