/* ==========================================================================
   Nicole Freeman Coaching — interface behaviour
   Global (once): smooth scroll, header, menu, cursor, preloader and in-place
   page transitions. Per page: initPage(root) wires up everything inside
   <main>; it runs on load and again after every in-place page swap.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var doc = document.documentElement;
  var body = document.body;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (reduced) doc.classList.add("reduced");

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
    del: function (k) { try { window.sessionStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
  };
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  /* Per-page cleanup hooks (timers, observers, rAF loops) */
  var cleanups = [];
  function onCleanup(fn) { cleanups.push(fn); }
  function runCleanups() { cleanups.splice(0).forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } }); }
  function every(fn, ms) { var id = setInterval(fn, ms); onCleanup(function () { clearInterval(id); }); return id; }
  function later(fn, ms) { var id = setTimeout(fn, ms); onCleanup(function () { clearTimeout(id); }); return id; }
  function inView(el, cb, opts) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    var io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { cb(e.isIntersecting, e); }); }, opts || { threshold: 0.2 });
    io.observe(el);
    onCleanup(function () { io.disconnect(); });
  }

  /* ---------- Smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    window.lenis = lenis;
    if (!window.gsap) {
      var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  function scrollToEl(target, offset) {
    var off = offset == null ? -96 : offset;
    if (lenis) lenis.scrollTo(target, { offset: off, duration: 1.4 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + off, behavior: reduced ? "auto" : "smooth" });
  }
  function jumpTop() {
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
  }

  /* ---------- Booking links ---------- */
  function wireBooking(root) {
    if (!CFG.bookingUrl || CFG.embedBooking) return;
    $$("[data-book]", root).forEach(function (el) {
      el.setAttribute("href", CFG.bookingUrl);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    });
  }
  wireBooking(document);
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Header ---------- */
  var header = $(".site-header");
  var lastY = window.scrollY;
  var ticking = false;
  function darkUnderHeader() {
    if (!header) return false;
    var r = header.querySelector(".header-bar").getBoundingClientRect();
    var y = r.top + r.height / 2;
    var els = document.elementsFromPoint ? document.elementsFromPoint(window.innerWidth / 2, y) : [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (header.contains(el) || el.closest(".menu, .cursor, .curtain, .preloader")) continue;
      var sec = el.closest("[data-theme]");
      if (sec) return sec.getAttribute("data-theme") === "dark";
      if (el === body || el === doc) break;
    }
    return false;
  }
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 40);
      var goingDown = y > lastY && y > 420;
      if (!body.classList.contains("menu-open")) header.classList.toggle("is-hidden", goingDown);
      header.classList.toggle("on-dark", darkUnderHeader());
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener("resize", function () { requestAnimationFrame(onScroll); });
  onScroll();

  /* ---------- Menu ---------- */
  var toggle = $(".menu-toggle");
  var toggleText = $(".menu-toggle__text");
  var menu = $(".menu");
  function openMenu() {
    body.classList.add("menu-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    if (toggleText) toggleText.textContent = "Close";
    if (lenis) lenis.stop();
    if (menu) menu.removeAttribute("inert");
    if (header) header.classList.remove("is-hidden");
  }
  function closeMenu(instant) {
    if (!body.classList.contains("menu-open")) return;
    if (instant && menu) menu.classList.add("no-anim");
    body.classList.remove("menu-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (toggleText) toggleText.textContent = "Menu";
    if (lenis) lenis.start();
    if (menu) menu.setAttribute("inert", "");
    if (instant && menu) requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.remove("no-anim"); }); });
  }
  if (toggle) toggle.addEventListener("click", function () { body.classList.contains("menu-open") ? closeMenu() : openMenu(); });
  var backdrop = $(".menu-backdrop");
  if (backdrop) backdrop.addEventListener("click", function () { closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  window.addEventListener("resize", function () { if (window.innerWidth > 1100) closeMenu(true); });

  /* ---------- Browser chrome colour ---------- */
  var themeMeta = $('meta[name="theme-color"]');
  function uiInk() { doc.classList.add("ui-ink"); if (themeMeta) themeMeta.setAttribute("content", "#0a1a1d"); }
  function uiCream() { doc.classList.remove("ui-ink"); if (themeMeta) themeMeta.setAttribute("content", "#f6f1e9"); }

  /* ---------- Preloader (first visit per session) ---------- */
  var pre = $(".preloader");
  if (pre) {
    if (doc.classList.contains("no-preloader") || reduced) {
      if (!doc.classList.contains("pt-enter")) uiCream();
      doc.classList.remove("is-preloading");
      pre.remove();
      body.classList.add("is-loaded");
    } else {
      var count = $(".preloader__count", pre);
      var words = $$(".pw > span", pre);
      var start = performance.now();
      var DURATION = 1700;
      words.forEach(function (w, i) {
        w.style.transition = "transform 1s cubic-bezier(.22,1,.36,1) " + (0.1 * i + 0.1) + "s";
        requestAnimationFrame(function () { requestAnimationFrame(function () { w.style.transform = "translateY(0)"; }); });
      });
      setTimeout(function () { pre.classList.add("is-strike"); }, 950);
      var tick = function (now) {
        var p = Math.min(1, (now - start) / DURATION);
        var eased = 1 - Math.pow(1 - p, 3);
        if (count) count.textContent = String(Math.round(eased * 100)).padStart(2, "0");
        if (p < 1) requestAnimationFrame(tick);
        else finishPreloader();
      };
      requestAnimationFrame(tick);
    }
  } else {
    body.classList.add("is-loaded");
  }
  function finishPreloader() {
    pre.style.transition = "clip-path 1.05s cubic-bezier(.65,0,.35,1)";
    pre.style.clipPath = "inset(0 0 100% 0 round 0 0 40px 40px)";
    doc.classList.remove("is-preloading");
    setTimeout(uiCream, 500);
    body.classList.add("is-loaded");
    document.dispatchEvent(new CustomEvent("site:loaded"));
    setTimeout(function () { pre.remove(); }, 1150);
  }

  /* ---------- Cursor (dot + trailing ring) ---------- */
  if (finePointer && !reduced) {
    doc.classList.add("has-cursor");
    var cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<div class="cursor__dot"></div><div class="cursor__ring"><span></span></div>';
    body.appendChild(cursor);
    var dot = $(".cursor__dot", cursor), ring = $(".cursor__ring", cursor), label = $("span", ring);
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest("[data-cursor], a, button, label, .opt, input[type=range], summary, .fact");
      cursor.classList.remove("is-hover", "is-label");
      var dark = e.target.closest("[data-theme]");
      cursor.classList.toggle("on-dark", (dark && dark.getAttribute("data-theme") === "dark") || body.classList.contains("menu-open"));
      if (!t) return;
      var txt = t.getAttribute("data-cursor");
      if (txt) { label.textContent = txt; cursor.classList.add("is-label"); }
      else cursor.classList.add("is-hover");
    });
    document.addEventListener("mouseleave", function () { cursor.style.opacity = "0"; });
    document.addEventListener("mouseenter", function () { cursor.style.opacity = "1"; });
  }

  /* ==========================================================================
     IN-PLACE PAGE TRANSITIONS
     Two panels cover the screen, the next page's <main> is fetched and
     swapped in behind them, then they lift. The document never reloads,
     so there is no white flash or toolbar jump on iOS.
     ========================================================================== */
  var curtain = $(".curtain");
  var ctTitle = curtain ? $(".curtain__title", curtain) : null;
  var PAGE_TITLES = {
    "index": "Ditch the <em>doubt</em>", "": "Ditch the <em>doubt</em>",
    "about": "Meet <em>Nicole</em>", "coaching": "Coaching <em>&amp; hypnotherapy</em>",
    "mindset-mot": "Your Mindset <em>MOT</em>", "supervision": "Supervision <em>&amp; teams</em>",
    "kind-words": "Kind <em>words</em>", "contact": "Let's <em>chat</em>", "404": "Wrong <em>turn</em>"
  };
  function titleFor(path) {
    var key = (path.split("/").pop() || "").replace(/\.html$/, "");
    return PAGE_TITLES[key] || "Nicole <em>Freeman</em>";
  }
  function resetCurtain() {
    if (!curtain) return;
    curtain.classList.add("no-anim");
    doc.classList.remove("pt-enter", "pt-covered");
    curtain.classList.remove("is-leaving", "is-covering", "is-covered");
    doc.style.backgroundColor = "";
    uiCream();
    void curtain.offsetHeight;
    requestAnimationFrame(function () { requestAnimationFrame(function () { curtain.classList.remove("no-anim"); }); });
  }
  function liftCurtain() {
    if (!curtain) return;
    curtain.classList.add("no-anim");
    doc.classList.add("pt-enter");
    curtain.classList.remove("is-covering", "is-covered");
    void curtain.offsetHeight;
    curtain.classList.remove("no-anim");
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      doc.classList.remove("pt-covered");
      curtain.classList.add("is-leaving");
      setTimeout(resetCurtain, 1300);
    }); });
  }
  if (curtain && doc.classList.contains("pt-enter")) {
    if (ctTitle) ctTitle.innerHTML = titleFor(location.pathname);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      curtain.classList.add("is-leaving");
      setTimeout(resetCurtain, 1300);
    }); });
  }

  var pageCache = {};
  function fetchPage(path) {
    if (!pageCache[path]) {
      pageCache[path] = fetch(path, { credentials: "same-origin" }).then(function (r) {
        if (!r.ok && r.status !== 404) throw new Error("HTTP " + r.status);
        return r.text();
      }).catch(function (err) { delete pageCache[path]; throw err; });
    }
    return pageCache[path];
  }
  function isPageLink(url) {
    return url.origin === location.origin && (/\.html$/.test(url.pathname) || /\/$/.test(url.pathname));
  }
  function cover(path) {
    return new Promise(function (resolve) {
      if (ctTitle) ctTitle.innerHTML = titleFor(path);
      curtain.classList.add("is-covering");
      setTimeout(uiInk, 300);
      var done = false;
      var fin = function () {
        if (done) return; done = true;
        curtain.classList.add("is-covered"); doc.classList.add("pt-covered");
        setTimeout(resolve, 420);
      };
      var ink = $(".curtain__layer--ink", curtain);
      if (ink) ink.addEventListener("transitionend", function (ev) { if (ev.propertyName === "transform") setTimeout(fin, 40); }, { once: true });
      setTimeout(fin, 1300);
    });
  }
  var navigating = false;
  function navigate(url, push) {
    if (navigating) return;
    navigating = true;
    Promise.all([fetchPage(url.pathname), cover(url.pathname)]).then(function (res) {
      swapPage(res[0], url, push);
      navigating = false;
    }).catch(function () {
      try { sessionStorage.setItem("nf_pt", "1"); } catch (e) { /* ignore */ }
      location.href = url.href;
    });
  }
  function swapPage(html, url, push) {
    var next = new DOMParser().parseFromString(html, "text/html");
    var newMain = next.querySelector("main");
    if (!newMain) { location.href = url.href; return; }
    if (window.NFMotion) window.NFMotion.destroy();
    runCleanups();
    closeMenu(true);
    var oldMain = $("main");
    oldMain.replaceWith(document.importNode(newMain, true));
    document.title = next.title;
    ["description"].forEach(function (n) {
      var a = $('meta[name="' + n + '"]'), b = next.querySelector('meta[name="' + n + '"]');
      if (a && b) a.setAttribute("content", b.getAttribute("content"));
    });
    var canon = $('link[rel="canonical"]'), nCanon = next.querySelector('link[rel="canonical"]');
    if (canon && nCanon) canon.setAttribute("href", nCanon.getAttribute("href"));
    body.setAttribute("data-page", next.body.getAttribute("data-page") || "");
    [".site-header .nav", ".menu__list"].forEach(function (sel) {
      var a = $(sel), b = next.querySelector(sel);
      if (a && b) a.innerHTML = b.innerHTML;
    });
    if (push) history.pushState({ nf: 1 }, "", url.href);
    jumpTop();
    if (header) header.classList.remove("is-hidden");
    var main = $("main");
    wireBooking(main);
    initPage(main);
    if (window.NFMotion) window.NFMotion.init(main, "enter");
    lastY = 0; onScroll();
    if (url.hash) {
      var t = document.getElementById(url.hash.slice(1));
      if (t) setTimeout(function () { scrollToEl(t); }, 850);
    }
    liftCurtain();
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target && a.target !== "_self") return;
    var href = a.getAttribute("href");
    if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    if (href.charAt(0) === "#") {
      if (href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToEl(target, href === "#main" ? 0 : undefined);
      return;
    }
    var url = new URL(a.href, location.href);
    if (!isPageLink(url)) return;
    if (url.pathname === location.pathname && url.search === location.search) {
      e.preventDefault();
      closeMenu();
      if (url.hash) {
        var t = document.getElementById(url.hash.slice(1));
        if (t) scrollToEl(t);
      } else scrollToEl(document.body, 0);
      return;
    }
    if (!curtain || reduced) return;
    e.preventDefault();
    navigate(url, true);
  });
  if (curtain && !reduced) {
    history.replaceState({ nf: 1 }, "", location.href);
    window.addEventListener("popstate", function () {
      var url = new URL(location.href);
      if (!isPageLink(url)) return;
      navigate(url, false);
    });
  }
  window.addEventListener("pageshow", function (e) { if (e.persisted) { closeMenu(true); resetCurtain(); } });
  function warmPath(path) { if (path !== location.pathname) fetchPage(path).catch(function () {}); }
  var warm = function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto:|tel:)/i.test(href)) return;
    var u = new URL(a.href, location.href);
    if (isPageLink(u)) warmPath(u.pathname);
  };
  document.addEventListener("touchstart", warm, { passive: true });
  document.addEventListener("mouseover", warm, { passive: true });
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1500); };
  idle(function () {
    $$(".site-header .nav a, .menu__list a").forEach(function (a) {
      var u = new URL(a.href, location.href);
      if (isPageLink(u)) warmPath(u.pathname);
    });
  });

  /* ==========================================================================
     PER-PAGE INITIALISATION
     ========================================================================== */
  function initPage(root) {
    magnetic(root);
    heroRotator(root);
    heroCard(root);
    fader(root);
    stage(root);
    motCheck(root);
    wizard(root);
    deck(root);
    dial(root);
    booking(root);
    faqAnimate(root);
  }

  /* Magnetic buttons (desktop pointer) */
  function magnetic(root) {
    if (!finePointer || reduced) return;
    $$("[data-magnetic]", root).forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.2 + "px," + (e.clientY - r.top - r.height / 2) * 0.28 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* Hero: "Ditch the [doubt.]" — the word is struck out, then replaced */
  function heroRotator(root) {
    var rots = $$("[data-rotator]", root);
    if (!rots.length) return;
    var n = $$(".rot__word", rots[0]).length;
    var idx = 0, playing = true, visible = true, busy = false;
    var countEl = $("[data-rot-count]", root), barEl = $("[data-rot-bar]", root);
    function setCount() {
      if (countEl) countEl.textContent = String(idx + 1).padStart(2, "0");
      if (barEl) barEl.style.setProperty("--p", (idx + 1) / n);
    }
    rots.forEach(function (r) { var w = $$(".rot__word", r); w.forEach(function (x, i) { x.classList.toggle("is-on", i === 0); }); });
    setCount();
    function step() {
      if (!playing || !visible || busy || document.hidden) return;
      busy = true;
      var nextIdx = (idx + 1) % n;
      rots.forEach(function (r) {
        var words = $$(".rot__word", r);
        var cur = words[idx], nxt = words[nextIdx];
        var strike = $(".rot__strike", cur);
        if (reduced || !cur.animate) {
          cur.classList.remove("is-on"); nxt.classList.add("is-on"); return;
        }
        strike.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 520, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" });
        setTimeout(function () {
          cur.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-38%)", opacity: 0 }], { duration: 420, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }).onfinish = function () {
            cur.classList.remove("is-on");
            cur.getAnimations().forEach(function (a) { a.cancel(); });
            strike.getAnimations().forEach(function (a) { a.cancel(); });
          };
          nxt.classList.add("is-on");
          nxt.animate([{ transform: "translateY(42%)", opacity: 0, filter: "blur(6px)" }, { transform: "none", opacity: 1, filter: "blur(0)" }], { duration: 720, delay: 160, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
        }, 760);
      });
      setTimeout(function () { idx = nextIdx; setCount(); busy = false; }, 1700);
    }
    var first = later(function () { every(step, 3200); }, doc.classList.contains("is-preloading") ? 2600 : 1600);
    inView(rots[0], function (v) { visible = v; }, { threshold: 0 });
  }

  /* Hero floating card: gauge sweeps up once visible */
  function heroCard(root) {
    var card = $(".hero__card", root);
    if (!card) return;
    later(function () { card.classList.add("is-live"); }, doc.classList.contains("is-preloading") ? 2600 : 1200);
  }

  /* "Turn down the critic" fader */
  function fader(root) {
    var f = $("[data-fader]", root);
    if (!f) return;
    var range = $(".range", f), critic = $(".fader__critic", f), cheer = $(".fader__cheer", f);
    var cText = $("p", critic), hText = $("p", cheer), vol = $("[data-vol]", f), hint = $(".fader__hint", f);
    var pairs = $$(".fader__pairs li", f).map(function (li) { return [li.getAttribute("data-critic"), li.getAttribute("data-cheer")]; });
    var bars = $$(".fader__meter i", f);
    var pi = 0, touched = false, alive = true;
    function apply() {
      var v = Number(range.value) / 100;
      var c = 1 - v;
      f.style.setProperty("--critic", c.toFixed(3));
      critic.style.opacity = Math.max(0, 1 - v * 1.35).toFixed(3);
      critic.style.filter = "blur(" + (v * 10).toFixed(1) + "px)";
      critic.style.transform = "scale(" + (1 - v * 0.12).toFixed(3) + ")";
      cheer.style.opacity = Math.max(0, (v - 0.35) / 0.65).toFixed(3);
      cheer.style.filter = "blur(" + (Math.max(0, 1 - v) * 8).toFixed(1) + "px)";
      cheer.style.transform = "translateY(" + ((1 - v) * 16).toFixed(1) + "px)";
      if (vol) vol.textContent = Math.round(c * 100) + "%";
      if (hint) hint.textContent = v > 0.85 ? "Much better. Hear that?" : v > 0.35 ? "Keep going…" : "Drag to turn the critic down";
    }
    function setPair(i) {
      pi = (i + pairs.length) % pairs.length;
      cText.textContent = "“" + pairs[pi][0] + "”";
      hText.textContent = "“" + pairs[pi][1] + "”";
    }
    range.addEventListener("input", function () { touched = true; apply(); });
    $(".fader__next", f).addEventListener("click", function () {
      touched = true;
      var from = Number(range.value);
      setPair(pi + 1);
      if (reduced) { range.value = 0; apply(); return; }
      var t0 = performance.now();
      (function back(now) {
        var p = Math.min(1, (now - t0) / 500);
        range.value = from * (1 - p); apply();
        if (p < 1) requestAnimationFrame(back);
      })(t0);
    });
    if (pairs.length) setPair(0);
    apply();
    /* VU meter */
    if (!reduced) {
      (function meter() {
        if (!alive) return;
        var c = 1 - Number(range.value) / 100;
        bars.forEach(function (b, i) {
          var h = (0.15 + Math.random() * 0.85) * c * (0.55 + 0.45 * Math.sin(Date.now() / 260 + i));
          b.style.height = Math.max(6, Math.abs(h) * 100) + "%";
          b.style.background = c > 0.5 ? "var(--fizz)" : "var(--aqua)";
        });
        setTimeout(function () { requestAnimationFrame(meter); }, 90);
      })();
      onCleanup(function () { alive = false; });
    }
    /* A gentle nudge the first time it scrolls into view */
    var nudged = false;
    inView(f, function (v) {
      if (!v || nudged || touched || reduced) return;
      nudged = true;
      var t0 = performance.now();
      (function go(now) {
        if (touched) return;
        var p = Math.min(1, (now - t0) / 1800);
        range.value = Math.sin(p * Math.PI) * 42; apply();
        if (p < 1) requestAnimationFrame(go);
      })(t0);
    }, { threshold: 0.6 });
  }

  /* Testimonial stage */
  function stage(root) {
    var s = $("[data-stage]", root);
    if (!s) return;
    var qs = $$(".tstage__q", s), btns = $$(".tstage__btn", s);
    var i = 0, hover = false, visible = false, timer = null;
    function show(n) {
      i = (n + qs.length) % qs.length;
      qs.forEach(function (q, k) { q.classList.toggle("is-on", k === i); q.setAttribute("aria-hidden", k === i ? "false" : "true"); });
      btns.forEach(function (b, k) {
        b.classList.toggle("is-on", k === i); b.setAttribute("aria-pressed", k === i ? "true" : "false");
        var bar = $(".tstage__bar i", b); if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
      });
      restart();
    }
    function restart() {
      clearTimeout(timer);
      if (!hover && visible && !reduced) timer = setTimeout(function () { show(i + 1); }, 9000);
    }
    onCleanup(function () { clearTimeout(timer); });
    btns.forEach(function (b, k) { b.addEventListener("click", function () { show(k); }); });
    s.addEventListener("mouseenter", function () { hover = true; clearTimeout(timer); s.classList.add("is-paused"); });
    s.addEventListener("mouseleave", function () { hover = false; s.classList.remove("is-paused"); restart(); });
    inView(s, function (v) { visible = v; if (v) restart(); else clearTimeout(timer); }, { threshold: 0.3 });
    show(0);
  }

  /* ---------- Mindset MOT self-check ---------- */
  var AREAS = {
    perfection: { name: "Perfectionism", head: "Perfectionism is <em>running the show.</em>", note: "Holding yourself to impossible standards is exhausting, and it quietly blocks the next move. In your Mindset MOT we'll look at where ‘never good enough’ comes from and find one way to loosen its grip." },
    pleasing: { name: "People pleasing", head: "Everyone else <em>comes first.</em>", note: "You're brilliant at looking after everyone else. In your MOT we'll look at what saying yes is costing you, and one small way to put your own needs back on the list." },
    procrast: { name: "Procrastination", head: "The big stuff <em>keeps waiting.</em>", note: "Putting things off usually isn't laziness. It's fear wearing a disguise. In your MOT we'll find what's really in the way and one first step you can actually take." },
    overthink: { name: "Overthinking", head: "Your mind <em>won't switch off.</em>", note: "Replaying, second-guessing, what-iffing. In your MOT we'll look at how your mind works so you can see the loop, and leave with a tool to step out of it." },
    critic: { name: "Inner critic", head: "That voice is <em>far too loud.</em>", note: "The critic in your head has had the floor for too long. In your MOT we'll start rewriting the story it keeps telling you, because stories can be rewritten." },
    overwhelm: { name: "Overwhelm", head: "You're running <em>on empty.</em>", note: "When you can never switch off, everything feels urgent. In your MOT we'll find where the pressure is coming from and one way to give yourself some breathing space." }
  };
  function motCheck(root) {
    var box = $("[data-check]", root);
    if (!box) return;
    var panes = $$(".check__pane", box), steps = $$(".check__steps li", box);
    var bar = $(".check__progress i", box), back = $(".check__back", box), nextBtn = $("[data-check-next]", box);
    var report = $("[data-report]", box);
    var answers = {}, cur = 0, qCount = panes.length - 1; /* last pane = report */
    function go(n) {
      cur = Math.max(0, Math.min(panes.length - 1, n));
      panes.forEach(function (p, i) { p.classList.toggle("is-on", i === cur); });
      steps.forEach(function (s, i) { s.classList.toggle("is-on", i === cur); s.classList.toggle("is-done", i < cur); });
      if (bar) bar.style.width = Math.round(cur / qCount * 100) + "%";
      if (back) back.hidden = cur === 0 || cur === panes.length - 1;
      if (nextBtn) nextBtn.hidden = !panes[cur].hasAttribute("data-free");
      var nav = $(".check__nav", box); if (nav) nav.style.display = cur === panes.length - 1 ? "none" : "";
    }
    $$(".opt", box).forEach(function (opt) {
      opt.addEventListener("click", function () {
        var pane = opt.closest(".check__pane");
        $$(".opt", pane).forEach(function (o) { o.classList.remove("is-picked"); o.setAttribute("aria-pressed", "false"); });
        opt.classList.add("is-picked"); opt.setAttribute("aria-pressed", "true");
        answers[pane.getAttribute("data-area")] = Number(opt.getAttribute("data-v"));
        setTimeout(function () { go(cur + 1); }, reduced ? 0 : 320);
      });
    });
    if (back) back.addEventListener("click", function () { go(cur - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { build(); go(cur + 1); });
    function status(v) { return v >= 3 ? ["fix", "Needs attention"] : v === 2 ? ["adv", "Advisory"] : ["pass", "Running fine"]; }
    function build() {
      var keys = Object.keys(AREAS);
      var total = 0, max = 0, top = null;
      keys.forEach(function (k) { var v = answers[k] || 0; total += v; if (top === null || v > (answers[top] || 0)) top = k; });
      var pct = Math.round(total / (keys.length * 3) * 100);
      var allLow = (answers[top] || 0) <= 1;
      var head = allLow ? "Mostly running <em>smoothly.</em>" : AREAS[top].head;
      var note = allLow ? "Lovely. Your mind is in good shape. A Mindset MOT is still a great way to fine-tune: we'll look at what you want next and what might get in the way." : AREAS[top].note;
      var goal = ($("textarea", box) || {}).value || "";
      var rows = keys.map(function (k) {
        var v = answers[k] || 0, st = status(v);
        return '<div class="report__row"><span>' + AREAS[k].name + '</span><span class="cert__bar"><i style="--w:' + Math.max(8, v / 3 * 100) + '%;--c:' + (st[0] === "fix" ? "var(--fizz)" : st[0] === "adv" ? "var(--sun)" : "var(--aqua)") + '"></i></span><span class="status status--' + st[0] + '">' + st[1] + '</span></div>';
      }).join("");
      report.innerHTML =
        '<div class="report__head"><div><small>Your inspection report</small><h3>' + head + '</h3></div>' +
        '<div class="report__score"><b>' + pct + '%</b><small>mental load</small></div></div>' +
        '<div class="report__rows">' + rows + '</div>' +
        '<div class="report__note"><b>Nicole’s note</b><p>' + note + '</p></div>' +
        '<div class="report__actions">' +
        '<a class="btn btn--fizz" href="#book" data-book><span class="btn__label">Book my free MOT</span><span class="btn__icon"><svg class="i-ur" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></span></a>' +
        '<a class="btn btn--ghost" href="contact.html?from=mot" data-send-report><span class="btn__label">Send this to Nicole</span><span class="btn__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a>' +
        '<button class="check__back" type="button" data-restart><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg> Start again</button></div>';
      var summary = keys.map(function (k) { return AREAS[k].name + ": " + status(answers[k] || 0)[1]; }).join("; ");
      store.set("nf_mot", JSON.stringify({ summary: summary, top: allLow ? "" : AREAS[top].name, load: pct, goal: goal.trim() }));
      wireBooking(report);
      $("[data-restart]", report).addEventListener("click", function () {
        answers = {}; $$(".opt", box).forEach(function (o) { o.classList.remove("is-picked"); });
        var ta = $("textarea", box); if (ta) ta.value = "";
        go(0);
      });
    }
    /* Build the report as soon as the last question is answered */
    var lastQ = panes[panes.length - 2];
    if (lastQ && !lastQ.hasAttribute("data-free")) {
      $$(".opt", lastQ).forEach(function (o) { o.addEventListener("click", build); });
    }
    go(0);
  }

  /* ---------- Enquiry wizard (contact) ---------- */
  function wizard(root) {
    var form = $("[data-wizard]", root);
    if (!form) return;
    var steps = $$(".wstep", form), dots = $$(".wizard__dots i", form);
    var back = $(".wizard__back", form), next = $("[data-next]", form), nextLabel = next ? $(".btn__label", next) : null;
    var err = $(".wizard__err", form), counter = $("[data-step-count]", form);
    var done = $(".wdone", form.parentNode), nav = $(".wizard__nav", form);
    var cur = 0;
    var params = new URLSearchParams(location.search);
    var topic = params.get("topic");
    if (topic) $$('input[name="topic"]', form).forEach(function (i) { if (i.value === topic) i.checked = true; });
    var mot = null;
    try { mot = JSON.parse(store.get("nf_mot") || "null"); } catch (e) { mot = null; }
    var motNote = $(".wizard__mot", form);
    if (mot && motNote) {
      motNote.classList.add("is-on");
      $("span", motNote).textContent = "Your Mindset MOT self-check results will be included" + (mot.top ? " (top area: " + mot.top + ")" : "") + ", so Nicole can prepare.";
      var mt = $('input[name="topic"][value="mot"]', form); if (mt && !topic) mt.checked = true;
    }
    function show(n) {
      cur = n;
      steps.forEach(function (s, i) { s.classList.toggle("is-on", i === cur); });
      dots.forEach(function (d, i) { d.classList.toggle("is-on", i === cur); d.classList.toggle("is-done", i < cur); });
      if (back) back.hidden = cur === 0;
      if (nextLabel) nextLabel.textContent = cur === steps.length - 1 ? "Send to Nicole" : "Continue";
      if (counter) counter.textContent = "Step " + (cur + 1) + " of " + steps.length;
      if (err) err.classList.remove("is-on");
    }
    function valid(step) {
      var ok = true;
      var groups = {};
      $$("input[required][type=radio], input[data-group-required]", step).forEach(function (i) { groups[i.name] = true; });
      Object.keys(groups).forEach(function (g) { if (!$('input[name="' + g + '"]:checked', step)) ok = false; });
      $$(".field", step).forEach(function (f) {
        var input = $("input, textarea", f);
        if (!input || !input.required) return;
        var bad = !input.value.trim() || (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()));
        f.classList.toggle("is-bad", bad);
        if (bad) ok = false;
      });
      if (err) err.classList.toggle("is-on", !ok);
      return ok;
    }
    function data() {
      var fd = new FormData(form);
      var out = {};
      fd.forEach(function (v, k) { out[k] = out[k] ? out[k] + ", " + v : v; });
      return out;
    }
    function labelFor(name, value) {
      var i = $('input[name="' + name + '"][value="' + value + '"]', form);
      var l = i && i.closest("label");
      return l ? l.textContent.trim() : value;
    }
    function submit() {
      var d = data();
      var readiness = d.timing === "now" ? "Ready now" : d.timing === "soon" ? "Next month or two" : "Exploring";
      var payload = {
        name: (d.first || "") + " " + (d.last || ""), email: d.email || "", phone: d.phone || "",
        topic: (d.topic || "").split(", ").map(function (v) { return labelFor("topic", v); }).join(", "),
        format: labelFor("format", d.format || ""), timing: readiness, message: d.message || "",
        mot_selfcheck: mot ? mot.summary + (mot.goal ? " | Wants: " + mot.goal : "") : "",
        source: "nicolefreeman.co.uk enquiry", submitted: new Date().toISOString()
      };
      var finish = function () {
        form.style.display = "none";
        if (done) {
          done.classList.add("is-on");
          var first = $("[data-first]", done); if (first) first.textContent = (d.first || "").trim() || "friend";
          var rp = $("[data-reply]", done); if (rp) rp.textContent = CFG.replyPromise || "soon";
        }
        store.del("nf_mot");
        if (window.lenis) window.lenis.resize();
      };
      if (CFG.formEndpoint) {
        next.disabled = true;
        fetch(CFG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); finish(); })
          .catch(function () { mailFallback(payload); finish(); });
      } else { mailFallback(payload); finish(); }
    }
    function mailFallback(p) {
      var lines = ["Hi Nicole,", "", p.message || "I'd like to talk about working together.", "",
        "What's on my mind: " + p.topic, "Preferred format: " + p.format, "Timing: " + p.timing];
      if (p.mot_selfcheck) lines.push("", "My Mindset MOT self-check: " + p.mot_selfcheck);
      lines.push("", p.name.trim(), p.email, p.phone);
      var subject = "Enquiry from " + p.name.trim() + " (" + p.timing + ")";
      location.href = "mailto:" + (CFG.email || "nicole@nicolefreeman.co.uk") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
    }
    if (next) next.addEventListener("click", function () {
      if (!valid(steps[cur])) return;
      if (cur < steps.length - 1) { show(cur + 1); scrollToEl(form, -120); }
      else submit();
    });
    if (back) back.addEventListener("click", function () { if (cur > 0) show(cur - 1); });
    $$("input", form).forEach(function (i) { i.addEventListener("input", function () { var f = i.closest(".field"); if (f) f.classList.remove("is-bad"); }); });
    form.addEventListener("submit", function (e) { e.preventDefault(); if (next) next.click(); });
    show(0);
  }

  /* ---------- Fun facts deck ---------- */
  function deck(root) {
    var d = $("[data-deck]", root);
    if (!d) return;
    var cards = $$(".fact", d), counter = $("[data-deck-count]", root);
    var order = cards.map(function (_, i) { return i; });
    var busy = false;
    function layout() {
      order.forEach(function (ci, pos) {
        var c = cards[ci];
        c.style.zIndex = String(cards.length - pos);
        var rot = pos === 0 ? 0 : (pos % 2 ? -4 : 4) * Math.min(pos, 2) / 1.4;
        c.style.transform = pos > 2 ? "translateY(40px) scale(.84)" : "translateY(" + pos * 16 + "px) scale(" + (1 - pos * 0.05) + ") rotate(" + rot + "deg)";
        c.style.opacity = pos > 2 ? "0" : "1";
        c.setAttribute("aria-hidden", pos === 0 ? "false" : "true");
        c.tabIndex = pos === 0 ? 0 : -1;
      });
      if (counter) counter.textContent = String(order[0] + 1).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0");
    }
    function next(dir) {
      if (busy) return; busy = true;
      var top = cards[order[0]];
      top.style.transform = "translateX(" + (dir || 1) * 115 + "%) rotate(" + (dir || 1) * 14 + "deg)";
      top.style.opacity = "0";
      setTimeout(function () { order.push(order.shift()); layout(); busy = false; }, reduced ? 0 : 380);
    }
    function shuffle() {
      for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
      cards.forEach(function (c) { c.style.transform = "translateY(0) rotate(" + (Math.random() * 16 - 8) + "deg)"; });
      setTimeout(layout, reduced ? 0 : 260);
    }
    cards.forEach(function (c) {
      c.addEventListener("click", function () { if (!moved) next(1); });
      c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(1); } });
    });
    /* Swipe */
    var sx = 0, dx = 0, dragging = false, moved = false;
    d.addEventListener("pointerdown", function (e) { sx = e.clientX; dx = 0; dragging = true; moved = false; });
    d.addEventListener("pointermove", function (e) {
      if (!dragging) return; dx = e.clientX - sx;
      if (Math.abs(dx) > 6) moved = true;
      if (moved) cards[order[0]].style.transform = "translateX(" + dx + "px) rotate(" + dx / 20 + "deg)";
    });
    var end = function () {
      if (!dragging) return; dragging = false;
      if (Math.abs(dx) > 70) next(dx > 0 ? 1 : -1); else if (moved) layout();
      setTimeout(function () { moved = false; }, 30);
    };
    d.addEventListener("pointerup", end); d.addEventListener("pointercancel", end); d.addEventListener("pointerleave", end);
    var nb = $("[data-deck-next]", root), sb = $("[data-deck-shuffle]", root);
    if (nb) nb.addEventListener("click", function () { next(1); });
    if (sb) sb.addEventListener("click", shuffle);
    layout();
  }

  /* ---------- 60-minute dial (Mindset MOT) ---------- */
  function dial(root) {
    var d = $("[data-dial]", root);
    if (!d) return;
    var segs = $$(".dial__seg", d), items = $$(".dial__item", root);
    var cb = $(".dial__center b", d), cs = $(".dial__center small", d);
    var defB = cb.textContent, defS = cs.textContent;
    function on(i) {
      segs.forEach(function (s, k) { s.classList.toggle("is-on", k === i); s.classList.toggle("is-dim", i > -1 && k !== i); });
      items.forEach(function (it, k) { it.classList.toggle("is-dim", i > -1 && k !== i); });
      if (i > -1) { cb.textContent = items[i].getAttribute("data-mins"); cs.textContent = items[i].getAttribute("data-label"); }
      else { cb.textContent = defB; cs.textContent = defS; }
    }
    segs.forEach(function (s, i) {
      s.addEventListener("mouseenter", function () { on(i); });
      s.addEventListener("mouseleave", function () { on(-1); });
      s.addEventListener("click", function () { on(i); });
    });
    items.forEach(function (it, i) {
      it.addEventListener("mouseenter", function () { on(i); });
      it.addEventListener("mouseleave", function () { on(-1); });
      it.addEventListener("focus", function () { on(i); });
      it.addEventListener("blur", function () { on(-1); });
    });
  }

  /* ---------- Embedded TidyCal calendar ---------- */
  function booking(root) {
    var slot = $("[data-tidycal]", root);
    if (!slot || !CFG.bookingPath) return;
    var loaded = false;
    inView(slot, function (v) {
      if (!v || loaded) return;
      loaded = true;
      var holder = document.createElement("div");
      holder.className = "tidycal-embed";
      holder.setAttribute("data-path", CFG.bookingPath);
      $(".booking__embed", slot).appendChild(holder);
      var old = document.getElementById("tidycal-js"); if (old) old.remove();
      var s = document.createElement("script");
      s.id = "tidycal-js"; s.async = true;
      s.src = "https://asset-tidycal.b-cdn.net/js/embed.js" + (window.__nfTidy ? "?r=" + Date.now() : "");
      window.__nfTidy = true;
      document.body.appendChild(s);
      var check = every(function () {
        if ($("iframe", slot)) { slot.classList.add("is-ready"); clearInterval(check); if (window.lenis) window.lenis.resize(); }
      }, 500);
      later(function () { clearInterval(check); if (!$("iframe", slot)) slot.classList.add("is-fallback"); }, 9000);
    }, { rootMargin: "400px 0px" });
  }

  /* Smoothly animate <details> FAQ open/close */
  function faqAnimate(root) {
    $$(".faq details", root).forEach(function (det) {
      var sum = $("summary", det), ans = $(".faq__a", det);
      if (!sum || !ans || reduced || !ans.animate) return;
      sum.addEventListener("click", function (e) {
        e.preventDefault();
        if (det.open) {
          var h = ans.offsetHeight;
          det.classList.add("is-closing");
          ans.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 380, easing: "cubic-bezier(.65,0,.35,1)" }).onfinish = function () { det.open = false; det.classList.remove("is-closing"); if (window.lenis) window.lenis.resize(); };
        } else {
          det.open = true;
          var h2 = ans.offsetHeight;
          ans.animate([{ height: "0px", opacity: 0 }, { height: h2 + "px", opacity: 1 }], { duration: 480, easing: "cubic-bezier(.22,1,.36,1)" }).onfinish = function () { if (window.lenis) window.lenis.resize(); };
        }
      });
    });
  }

  /* Boot */
  initPage($("main"));
  window.NFSite = { scrollToEl: scrollToEl };
})();
