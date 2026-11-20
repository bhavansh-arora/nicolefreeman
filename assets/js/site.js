/* ==========================================================================
   Nicole Freeman Coaching — interface behaviour
   Deliberately simple: native scrolling, normal page loads, and small
   reveal effects that only ever start from content that is already there.
   Nothing on the page is hidden unless this script is running and has
   already decided when to show it.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var doc = document.documentElement;
  var body = document.body;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
    del: function (k) { try { window.sessionStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
  };

  /* Small helpers (kept for the widgets below) */
  function onCleanup() { /* single-page lifetime: nothing to tear down */ }
  function every(fn, ms) { return setInterval(fn, ms); }
  function later(fn, ms) { return setTimeout(fn, ms); }
  function inView(el, cb, opts) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    var io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { cb(e.isIntersecting, e); }); }, opts || { threshold: 0.2 });
    io.observe(el);
  }
  function scrollToEl(target, offset) {
    var top = target.getBoundingClientRect().top + window.scrollY + (offset == null ? -100 : offset);
    window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
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

  /* ---------- Header: a soft shadow once the page has scrolled ---------- */
  var header = $(".site-header");
  var scrolled = null;
  function onScroll() {
    var s = window.scrollY > 24;
    if (s !== scrolled && header) { scrolled = s; header.classList.toggle("is-scrolled", s); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Menu (phones and tablets) ---------- */
  var toggle = $(".menu-toggle");
  var toggleText = $(".menu-toggle__text");
  var menu = $(".menu");
  function openMenu() {
    body.classList.add("menu-open");
    doc.classList.add("no-scroll");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    if (toggleText) toggleText.textContent = "Close";
    if (menu) menu.removeAttribute("inert");
  }
  function closeMenu() {
    if (!body.classList.contains("menu-open")) return;
    body.classList.remove("menu-open");
    doc.classList.remove("no-scroll");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (toggleText) toggleText.textContent = "Menu";
    if (menu) menu.setAttribute("inert", "");
  }
  if (toggle) toggle.addEventListener("click", function () { body.classList.contains("menu-open") ? closeMenu() : openMenu(); });
  var backdrop = $(".menu-backdrop");
  if (backdrop) backdrop.addEventListener("click", closeMenu);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  window.addEventListener("resize", function () { if (window.innerWidth > 1100) closeMenu(); });
  /* In-page links inside the menu: close it first */
  if (menu) menu.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
  /* Coming back with the back button (page restored from cache): reset UI */
  window.addEventListener("pageshow", function (e) { if (e.persisted) closeMenu(); });

  /* ==========================================================================
     INTRO + PAGE TRANSITIONS
     Pages still load normally. On an internal link click the cover sweeps
     up (CSS), then the browser loads the next page, which starts covered
     and lifts away (CSS). Every step has a timer fallback, and the cover
     never blocks clicks, so nothing can hang.
     ========================================================================== */
  var enterDelay = doc.classList.contains("nf-intro") ? 1700 : doc.classList.contains("nf-in") ? 550 : 0;
  /* Tidy up the classes once the CSS animations are done (purely cosmetic) */
  setTimeout(function () { doc.classList.remove("nf-intro", "nf-in"); }, enterDelay ? enterDelay + 1100 : 0);

  var leaving = false;
  function pageKey(path) { return (path.split("/").pop() || "index").replace(".html", "") || "index"; }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname)) return;
    if (url.pathname === location.pathname) return;          /* same page: native anchor scroll */
    if (reduced) return;
    e.preventDefault();
    if (leaving) return;
    leaving = true;
    closeMenu();
    var title = $(".pt__title"), map = window.NF_PT || {};
    if (title && map[pageKey(url.pathname)]) title.innerHTML = map[pageKey(url.pathname)];
    doc.classList.remove("nf-intro", "nf-in");
    doc.classList.add("nf-out");
    store.set("nf_nav", "1");
    setTimeout(function () { location.href = url.href; }, 620);
    /* Safety: if the browser never left (cancelled, offline), uncover */
    setTimeout(function () { doc.classList.remove("nf-out"); store.del("nf_nav"); leaving = false; }, 5000);
  });
  /* Back/forward restores a page from memory: make sure it isn't covered */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { doc.classList.remove("nf-out", "nf-in", "nf-intro"); leaving = false; store.del("nf_nav"); }
  });

  /* ==========================================================================
     REVEALS
     One IntersectionObserver adds .is-in as things come into view. Anything
     already on screen when the page loads is marked .is-in straight away,
     so it is never hidden. Without this script, nothing is hidden at all.
     ========================================================================== */
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = "1";
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "w";
            var inner = document.createElement("span"); inner.textContent = part;
            inner.style.setProperty("--i", i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") walk(child);
      });
    })(el);
  }
  function reveals() {
    /* Footer wordmark: one span per letter, numbered for the stagger */
    $$(".footer__word").forEach(function (word) {
      if (word.dataset.lettersDone) return;
      word.dataset.lettersDone = "1";
      var i = 0;
      $$(".footer__w1, .footer__w2", word).forEach(function (part) {
        var text = part.textContent;
        part.textContent = "";
        text.split("").forEach(function (c) {
          var s = document.createElement("span");
          s.className = "ch"; s.textContent = c; s.setAttribute("aria-hidden", "true");
          s.style.setProperty("--i", i++);
          part.appendChild(s);
        });
      });
    });
    var targets = $$("[data-split], [data-reveal], [data-stagger], [data-clip], .statement__text, .cert, .want__card--no, .berg__stage, .footer__word");
    /* "That voice" lines: each is crossed out as it reaches the upper half of
       the screen, so it can be read first. */
    var lines = $$(".voice__list li");
    if (reduced || !("IntersectionObserver" in window)) lines.forEach(function (el) { el.classList.add("is-in"); });
    else {
      var lio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add("is-in"); lio.unobserve(e.target); }
        });
      }, { rootMargin: "0px 0px -48% 0px", threshold: 0 });
      lines.forEach(function (el) { lio.observe(el); });
    }
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    $$("[data-split], .statement__text").forEach(splitWords);
    $$("[data-stagger]").forEach(function (wrap) {
      Array.prototype.slice.call(wrap.children).forEach(function (c, k) { c.style.setProperty("--d", (k * 70) + "ms"); });
    });
    var vh = window.innerHeight;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.94) el.classList.add("is-in");   /* already on screen (or above): show now */
      else io.observe(el);
    });
    doc.classList.add("reveal-on");
    /* Safety net: if anything is still waiting when the page is printed or
       the tab is restored, show it. */
    window.addEventListener("beforeprint", function () { targets.forEach(function (el) { el.classList.add("is-in"); }); });
  }
  reveals();

  /* ---------- Hero: "Ditch the [doubt.]" — the word is struck out, then replaced ---------- */
  function heroRotator() {
    var rot = $("[data-rotator]");
    if (!rot || reduced) return;
    var words = $$(".rot__word", rot);
    var countEl = $("[data-rot-count]"), barEl = $("[data-rot-bar]");
    var idx = 0, timer = null, visible = true;
    function setCount() {
      if (countEl) countEl.textContent = String(idx + 1).padStart(2, "0");
      if (barEl) barEl.style.setProperty("--p", (idx + 1) / words.length);
    }
    function step() {
      if (!visible || document.hidden) return;
      var cur = words[idx], next = words[(idx + 1) % words.length];
      cur.classList.add("is-x");                                   /* strike it out */
      setTimeout(function () {
        cur.classList.remove("is-on"); cur.classList.add("is-out");
        next.classList.remove("is-out", "is-x"); next.classList.add("is-on");
        idx = (idx + 1) % words.length; setCount();
        setTimeout(function () { cur.classList.remove("is-out", "is-x"); }, 800);
      }, 650);
    }
    setCount();
    setTimeout(function () { timer = setInterval(step, 3400); }, 2400 + enterDelay);
    inView(rot, function (v) { visible = v; }, { threshold: 0 });
  }
  heroRotator();

  /* Hero floating card: gauge sweeps up shortly after load */
  var heroCard = $(".hero__card");
  if (heroCard) setTimeout(function () { heroCard.classList.add("is-live"); }, 900 + enterDelay);

  /* ---------- "Turn down the critic" fader (moves only when the visitor moves it) ---------- */
  function fader() {
    var f = $("[data-fader]");
    if (!f) return;
    var range = $(".range", f), critic = $(".fader__critic", f), cheer = $(".fader__cheer", f);
    var cText = $("p", critic), hText = $("p", cheer), vol = $("[data-vol]", f), hint = $(".fader__hint", f);
    var pairs = $$(".fader__pairs li", f).map(function (li) { return [li.getAttribute("data-critic"), li.getAttribute("data-cheer")]; });
    var pi = 0;
    function apply() {
      var v = Number(range.value) / 100, c = 1 - v;
      f.style.setProperty("--critic", c.toFixed(3));
      f.classList.toggle("is-calm", c <= 0.5);
      critic.style.opacity = Math.max(0, 1 - v * 1.4).toFixed(3);
      critic.style.transform = "translateY(" + (-v * 14).toFixed(1) + "px)";
      cheer.style.opacity = Math.max(0, (v - 0.35) / 0.65).toFixed(3);
      cheer.style.transform = "translateY(" + ((1 - v) * 14).toFixed(1) + "px)";
      if (vol) vol.textContent = Math.round(c * 100) + "%";
      if (hint) hint.textContent = v > 0.85 ? "Much better. Hear that?" : v > 0.35 ? "Keep going…" : "Drag to turn the critic down";
    }
    function setPair(i) {
      pi = (i + pairs.length) % pairs.length;
      cText.textContent = "“" + pairs[pi][0] + "”";
      hText.textContent = "“" + pairs[pi][1] + "”";
    }
    range.addEventListener("input", apply);
    $(".fader__next", f).addEventListener("click", function () { setPair(pi + 1); range.value = 0; apply(); });
    if (pairs.length) setPair(0);
    apply();
  }
  fader();

  /* ---------- Testimonials: visitor picks who to read ---------- */
  function stage() {
    var s = $("[data-stage]");
    if (!s) return;
    var qs = $$(".tstage__q", s), btns = $$(".tstage__btn", s);
    function show(n) {
      qs.forEach(function (q, k) { q.classList.toggle("is-on", k === n); q.setAttribute("aria-hidden", k === n ? "false" : "true"); });
      btns.forEach(function (b, k) { b.classList.toggle("is-on", k === n); b.setAttribute("aria-pressed", k === n ? "true" : "false"); });
    }
    btns.forEach(function (b, k) { b.addEventListener("click", function () { show(k); }); });
    show(0);
  }
  stage();

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
  /* The calendar is a heavy third-party app, so it loads only when someone
     shows they want to book: the "Show available times" button, any link
     to #book, or arriving on the page at #book. Scrolling past never loads it. */
  function booking(root) {
    var slot = $("[data-tidycal]", root);
    if (!slot || !CFG.bookingPath) return;
    var loaded = false;
    function load() {
      if (loaded) return;
      loaded = true;
      slot.classList.add("is-loading");
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
        if ($("iframe", slot)) { slot.classList.add("is-ready"); clearInterval(check);  }
      }, 500);
      later(function () { clearInterval(check); if (!$("iframe", slot)) slot.classList.add("is-fallback"); }, 9000);
    }
    var btn = $("[data-load-calendar]", slot);
    if (btn) btn.addEventListener("click", load);
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href$="#book"]');
      if (a && new URL(a.href, location.href).pathname === location.pathname) load();
    });
    if (location.hash === "#book") load();
  }

  motCheck(document);
  wizard(document);
  deck(document);
  dial(document);
  booking(document);

  /* Warm up the next page as soon as a finger or cursor reaches a link */
  var warmed = {};
  function warm(e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|https?:)/i.test(href)) return;
    var path = href.split("#")[0].split("?")[0];
    if (!path || warmed[path] || !/\.html$/.test(path)) return;
    warmed[path] = true;
    var l = document.createElement("link"); l.rel = "prefetch"; l.href = path; document.head.appendChild(l);
  }
  document.addEventListener("pointerover", warm, { passive: true });
  document.addEventListener("touchstart", warm, { passive: true });
})();
