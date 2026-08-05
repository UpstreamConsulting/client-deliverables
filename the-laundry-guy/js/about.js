/* =====================================================================
   The Laundry Guy — ABOUT page
   Vanilla JS, no dependencies, no build step. Mirrors js/results.js.

   Responsibilities:
   1. Load content-about.json and inject copy/numbers over the static
      fallback baked into about.html. If the fetch fails (e.g. file://),
      the baked-in fallback stands and the page still reads correctly.
   2. Count-up on the stat-band numbers on scroll-into-view: 600ms
      ease-out, runs ONCE per element (the existing locked pattern).
   Motion budget (locked): the two stat count-ups, nothing else.
   prefers-reduced-motion skips them (baked-in final values stand).
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

  function setText(sel, text) {
    var el = $(sel);
    if (el && text != null) el.textContent = text;
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
      setText("#ab-eyebrow", h.eyebrow);
      setText("#ab-h1-prefix", h.h1_prefix);
      setText("#ab-h1-mark", h.h1_mark);
      setText("#ab-h1-suffix", h.h1_suffix);
      setText("#ab-support", h.support);
    }

    // Founder thesis
    if (content.thesis) {
      var t = content.thesis;
      setText("#th-eyebrow", t.eyebrow);
      setText("#th-prefix", t.line_prefix);
      setText("#th-mark", t.line_mark);
      setText("#th-suffix", t.line_suffix);
      setText("#th-support", t.support);
    }

    // Stat band ("Since 2004" is static text — no count data to overwrite)
    if (content.aggregate) {
      var stats = $all(".agg .stat");
      (content.aggregate.stats || []).forEach(function (s, i) {
        if (!stats[i]) return;
        var num = $(".stat-num", stats[i]);
        if (s.static) { num.textContent = s.display; }
        else { setNum(num, s); }
        num.classList.toggle("stat-num--orange", !!s.accent);
        $(".stat-label", stats[i]).textContent = s.label;
        $(".stat-note", stats[i]).textContent = s.note;
      });
      if ($("#agg-footnote") && content.aggregate.footnote) {
        $("#agg-footnote").textContent = content.aggregate.footnote;
      }
    }

    // Company story
    if (content.story) {
      setText("#st-eyebrow", content.story.eyebrow);
      setText("#st-h2-prefix", content.story.h2_prefix);
      setText("#st-h2-mark", content.story.h2_mark);
      var body = $("#story-body");
      if (body && content.story.paragraphs) {
        body.innerHTML = "";
        content.story.paragraphs.forEach(function (text) {
          var p = document.createElement("p");
          p.textContent = text;
          body.appendChild(p);
        });
      }
    }

    // Team
    if (content.team) {
      setText("#tm-eyebrow", content.team.eyebrow);
      setText("#tm-h2", content.team.h2);
      var cards = $all("#team-grid .team-card");
      (content.team.members || []).forEach(function (m, i) {
        if (!cards[i]) return;
        var img = $(".team-photo img", cards[i]);
        if (img && m.photo) img.setAttribute("src", m.photo);
        $(".team-name", cards[i]).textContent = m.name;
        $(".team-role", cards[i]).textContent = m.role;
        $(".team-bio", cards[i]).textContent = m.bio;
      });
      if (content.team.wide_photo) {
        var wide = $(".team-wide img");
        if (wide && content.team.wide_photo.src) wide.setAttribute("src", content.team.wide_photo.src);
        setText("#tm-caption", content.team.wide_photo.caption);
      }
    }

    // Close band
    if (content.close) {
      setText("#close-h2", content.close.headline);
      setText("#close-support", content.close.support);
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
    fetch("content-about.json")
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
