/* =====================================================================
   The Laundry Guy — WHAT WE DO (services) page
   Vanilla JS, no dependencies, no build step. Mirrors js/results.js.

   Responsibilities:
   1. Load content-services.json and inject copy over the static fallback
      baked into services.html. If the fetch fails (e.g. file://), the
      baked-in fallback stands and the page still reads correctly.
   Motion budget (locked): NONE — this page has no stat numbers, so no
   count-ups and no other animation. Nothing to guard for reduced motion.
   ===================================================================== */

(function () {
  "use strict";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function setText(sel, text) {
    var el = $(sel);
    if (el && text != null) el.textContent = text;
  }

  /* ---------- content injection ---------- */

  function inject(content) {
    // Header band
    if (content.header) {
      var h = content.header;
      setText("#svc-eyebrow", h.eyebrow);
      setText("#svc-h1-prefix", h.h1_prefix);
      setText("#svc-h1-mark", h.h1_mark);
      setText("#svc-h1-suffix", h.h1_suffix);
      setText("#svc-support", h.support);
    }

    // Four service pillars
    if (content.pillars) {
      setText("#svc-grid-eyebrow", content.pillars.eyebrow);
      setText("#svc-grid-h2", content.pillars.h2);
      var cards = $all("#svc-grid .svc-card");
      (content.pillars.cards || []).forEach(function (card, i) {
        if (!cards[i]) return;
        $(".svc-num", cards[i]).textContent = card.num;
        $(".svc-title", cards[i]).textContent = card.title;
        $(".svc-sub", cards[i]).textContent = card.sub;
        $(".svc-desc", cards[i]).textContent = card.desc;
      });
    }

    // Statement band
    if (content.statement) {
      setText("#stmt-line", content.statement.line);
      setText("#stmt-support", content.statement.support);
    }

    // Pull statements
    var pulls = $all("#pulls-grid .pull");
    (content.pulls || []).forEach(function (p, i) {
      if (!pulls[i]) return;
      $(".pull-line", pulls[i]).textContent = p.line;
      $(".pull-support", pulls[i]).textContent = p.support;
      $(".pull-label", pulls[i]).textContent = p.label;
    });

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

  /* ---------- boot ---------- */

  function boot() {
    fetch("content-services.json")
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; /* file:// or offline — baked-in fallback stands */ })
      .then(function (content) {
        if (content) inject(content);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
