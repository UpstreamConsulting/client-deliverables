/* =====================================================================
   The Laundry Guy — RESULTS page
   Vanilla JS, no dependencies, no build step. Mirrors js/main.js patterns.

   Responsibilities:
   1. Load content-results.json and inject copy/numbers over the static
      fallback baked into results.html. If the fetch fails (e.g. file://),
      the baked-in fallback stands and the page still reads correctly.
   2. Count-up on the 4 case-card numbers + the aggregate stat band,
      on scroll-into-view: 600ms ease-out, runs ONCE per element.
   Motion budget (locked): count-ups + the CSS marquee, nothing else.
   prefers-reduced-motion kills both (marquee is killed in results.css).
   NOTE: the before/after invoice zone is rendered statically in
   results.html — content-results.json documents it (invoice_example),
   injection is intentionally not wired for that zone.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE_OUT = function (t) { return 1 - Math.pow(1 - t, 3); };
  var COUNT_MS = 600;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function fmt(prefix, n, suffix) {
    return prefix + Math.round(n).toLocaleString("en-US") + suffix;
  }

  /* ---------- 1. content injection ---------- */

  function setNum(el, num) {
    // num = { display, prefix, target, suffix }
    el.dataset.prefix = num.prefix;
    el.dataset.target = String(num.target);
    el.dataset.suffix = num.suffix;
    el.textContent = num.display;
  }

  function inject(content) {
    // Header band
    if (content.header) {
      var h = content.header;
      if ($("#res-eyebrow")) $("#res-eyebrow").textContent = h.eyebrow;
      if ($("#res-h1-prefix")) $("#res-h1-prefix").textContent = h.headline_prefix;
      if ($("#res-h1-mark")) $("#res-h1-mark").textContent = h.headline_mark;
      if ($("#res-support")) $("#res-support").textContent = h.support;
    }

    // Aggregate stat band
    if (content.aggregate) {
      var stats = $all(".agg .stat");
      (content.aggregate.stats || []).forEach(function (s, i) {
        if (!stats[i]) return;
        var num = $(".stat-num", stats[i]);
        setNum(num, s);
        num.classList.toggle("stat-num--orange", !!s.accent);
        $(".stat-label", stats[i]).textContent = s.label;
        $(".stat-note", stats[i]).textContent = s.note;
      });
      if ($("#agg-footnote") && content.aggregate.footnote) {
        $("#agg-footnote").textContent = content.aggregate.footnote;
      }
    }

    // Case cards
    var cards = $all(".case-card");
    (content.cases || []).forEach(function (c, i) {
      if (!cards[i]) return;
      $(".case-eyebrow", cards[i]).textContent = c.eyebrow;
      $(".case-hook", cards[i]).textContent = c.hook;
      setNum($(".case-num", cards[i]), c.number);
      $(".case-sub", cards[i]).textContent = c.sublabel;
      $(".case-how", cards[i]).textContent = c.how;
    });

    // Testimonials
    var quoteCards = $all(".quote-card");
    (content.testimonials || []).forEach(function (q, i) {
      if (!quoteCards[i]) return;
      $(".quote-text", quoteCards[i]).textContent = "“" + q.quote + "”";
      $(".quote-company", quoteCards[i]).textContent = q.company;
      $(".quote-title", quoteCards[i]).textContent = q.title;
    });

    // Logo carousel — slots rebuilt from JSON so new approvals land by data edit only.
    if (content.carousel) {
      if ($("#logos-eyebrow") && content.carousel.eyebrow) {
        $("#logos-eyebrow").textContent = content.carousel.eyebrow;
      }
      var slots = content.carousel.slots || [];
      if (slots.length) {
        ["#marquee-group-a", "#marquee-group-b"].forEach(function (sel) {
          var group = $(sel);
          if (!group) return;
          group.innerHTML = "";
          slots.forEach(function (slot) {
            var el;
            if (slot.approved && slot.name) {
              el = document.createElement("span");
              el.className = "logo-word";
              el.textContent = slot.name;
            } else {
              el = document.createElement("span");
              el.className = "logo-slot--empty";
              el.setAttribute("aria-hidden", "true");
            }
            group.appendChild(el);
          });
        });
      }
    }

    // Close band
    if (content.close) {
      if ($("#close-h2")) $("#close-h2").textContent = content.close.headline;
      if ($("#close-support")) $("#close-support").textContent = content.close.support;
      var cta = $("#close-cta");
      if (cta && content.close.cta) {
        $(".btn-label", cta).textContent = content.close.cta.label;
        cta.setAttribute("href", content.close.cta.href);
      }
    }
  }

  /* ---------- 2. count-up on scroll-into-view (600ms, once) ---------- */

  function runCount(el) {
    var target = parseFloat(el.dataset.target);
    var prefix = el.dataset.prefix || "";
    var suffix = el.dataset.suffix || "";
    if (isNaN(target)) return;
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / COUNT_MS, 1);
      el.textContent = fmt(prefix, target * EASE_OUT(t), suffix);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCountups() {
    var els = $all(".count");
    if (!els.length) return;

    // Reduced motion or no IntersectionObserver: baked-in final values stand.
    if (REDUCED || !("IntersectionObserver" in window)) return;

    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        seen.add(entry.target);
        runCount(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- boot ---------- */

  function boot() {
    fetch("content-results.json")
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; /* file:// or offline — baked-in fallback stands */ })
      .then(function (content) {
        if (content) inject(content);
        initCountups();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
